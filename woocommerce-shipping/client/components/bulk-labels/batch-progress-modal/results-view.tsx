import { Button, Notice } from '@wordpress/components';
import { __, sprintf, _n } from '@wordpress/i18n';
import { useCallback, useState } from '@wordpress/element';
import { Icon, check, error as errorIcon, external } from '@wordpress/icons';
import { addQueryArgs } from '@wordpress/url';
import apiFetch from '@wordpress/api-fetch';
import * as Sentry from '@sentry/react';
import { getLabelsPrintPath } from 'data/routes';
import {
	formatCurrency,
	getCurrencyObject,
} from 'components/label-purchase/design-next/utils';
import { getStoreOrigin, printDocument, recordEvent } from 'utils';
import { getConfig } from 'utils/config';
import {
	getPaperSizes,
	getPaperSizeWithKey,
} from 'components/label-purchase/label/utils';
import type { PDFJson } from 'types';
import type { FailedRow, SettledRow, SucceededRow } from './types';
import {
	BATCH_INTERRUPTED_ERROR_CODE,
	BATCH_TRANSPORT_ERROR_CODE,
} from './types';
import {
	failedRows,
	formatFailureMessage,
	getEditOrderUrl,
	orderLabel,
} from './helpers';

/**
 * Batch-level error codes mark per-row failures that were not caused by
 * the order itself (server unreachable, merchant aborted mid-progress).
 * Opening the order edit page for those does not help the merchant fix
 * anything, so the per-row "Fix and retry" affordance is suppressed and
 * a top-level hint is shown instead.
 */
const isBatchLevelFailure = ( row: FailedRow ): boolean =>
	row.error_code === BATCH_TRANSPORT_ERROR_CODE ||
	row.error_code === BATCH_INTERRUPTED_ERROR_CODE;

interface ResultsViewProps {
	rows: SettledRow[];
	onClose: () => void;
}

/**
 * Resolve the paper size key. The bulk-labels banner does NOT enqueue
 * the full WCShipping_Config, so `getPaymentSettings()` cannot be used
 * here without risking a runtime error. Read defensively from the
 * config object and fall back to the first paper size available for
 * the store's origin country. A schema-drift breadcrumb captures the
 * case where `accountSettings` was enqueued but `purchaseSettings`
 * itself is missing. A missing or non-string `paper_size` is treated
 * as "no saved preference" silently because most stores haven't set
 * one yet, so logging that path would just be noise.
 */
const readSavedPaperSize = (): string | undefined => {
	const config = getConfig() as unknown as
		| {
				accountSettings?: unknown;
		  }
		| undefined;
	const accountSettings = ( config?.accountSettings ?? null ) as {
		purchaseSettings?: unknown;
	} | null;
	if ( accountSettings === null ) {
		return undefined;
	}
	const purchaseSettings = ( accountSettings.purchaseSettings ?? null ) as {
		paper_size?: unknown;
	} | null;
	if ( purchaseSettings === null ) {
		// `accountSettings` was enqueued but `purchaseSettings` is
		// missing. Schema drift worth knowing about, but not an error.
		Sentry.addBreadcrumb( {
			category: 'batch-progress-modal',
			level: 'info',
			message:
				'Bulk-labels accountSettings has no purchaseSettings; using default paper size.',
		} );
		return undefined;
	}
	const paperSize = purchaseSettings.paper_size;
	if ( typeof paperSize !== 'string' || paperSize === '' ) {
		return undefined;
	}
	return paperSize;
};

const resolvePaperSizeKey = (): string => {
	const country = getStoreOrigin()?.country ?? 'US';
	const sizes = getPaperSizes( country );
	const saved = readSavedPaperSize();
	const matched = saved ? getPaperSizeWithKey( saved, country ) : undefined;
	return ( matched ?? sizes[ 0 ] ).key;
};

/**
 * Build the combined print request URL. Reuses the existing
 * `/wcshipping/v1/label/print` route (`label_id_csv` parameter) so the
 * merchant gets the same merged-PDF behavior as the single-order flow.
 */
const buildPrintPath = ( labelIds: number[] ): string =>
	addQueryArgs( getLabelsPrintPath(), {
		paper_size: resolvePaperSizeKey(),
		label_id_csv: labelIds.join( ',' ),
		json: true,
	} );

const fetchAndPrintLabels = async (
	labelIds: number[],
	fileName: string
): Promise< void > => {
	const pdfJson = await apiFetch< PDFJson >( {
		path: buildPrintPath( labelIds ),
		method: 'GET',
	} );
	await printDocument( pdfJson, fileName );
};

const getResultsTitle = (
	hasSucceeded: boolean,
	hasFailed: boolean
): string => {
	if ( hasSucceeded && hasFailed ) {
		return __( 'Some labels need attention', 'woocommerce-shipping' );
	}
	if ( hasSucceeded ) {
		return __( 'All labels created', 'woocommerce-shipping' );
	}
	return __( 'No labels were created', 'woocommerce-shipping' );
};

/**
 * Per-order print error state. Keyed by `order_id` so a second print
 * attempt on a different row doesn't stomp the error from the first.
 * The `Print all labels` button uses the synthetic `__all__` key so
 * its error doesn't collide with a single-row retry.
 */
type PrintErrorMap = Record< string, string >;

const PRINT_ALL_KEY = '__all__';

export const ResultsView = ( { rows, onClose }: ResultsViewProps ) => {
	const succeeded = rows.filter(
		( r ): r is SucceededRow => r.status === 'succeeded'
	);
	const failed = failedRows( rows );
	const allLabelIds = succeeded.flatMap( ( r ) => r.label_ids );

	const hasSucceeded = succeeded.length > 0;
	const hasFailed = failed.length > 0;

	const [ printErrors, setPrintErrors ] = useState< PrintErrorMap >( {} );

	const clearPrintError = useCallback( ( key: string ) => {
		setPrintErrors( ( prev ) => {
			if ( ! ( key in prev ) ) {
				return prev;
			}
			const next = { ...prev };
			delete next[ key ];
			return next;
		} );
	}, [] );

	const handlePrint = useCallback(
		async (
			key: string,
			labelIds: number[],
			fileName: string,
			orderId: number | null
		) => {
			if ( labelIds.length === 0 ) {
				return;
			}
			clearPrintError( key );
			try {
				await fetchAndPrintLabels( labelIds, fileName );
			} catch ( err ) {
				const message =
					( err as Error )?.message ??
					__(
						'Unable to open the print dialog. Disable your browser pop-up blocker and try again.',
						'woocommerce-shipping'
					);
				Sentry.captureException( err, {
					tags: { component: 'batch-progress-modal' },
					extra: {
						label_ids_count: labelIds.length,
						file_name: fileName,
						order_id: orderId,
					},
				} );
				recordEvent( 'bulk_label_print_failed', {
					// `order_id` is `null` for the "Print all labels"
					// button so the funnel can tell whole-batch
					// print failures apart from single-order ones.
					order_id: orderId,
					label_count: labelIds.length,
					error_message: message,
				} );
				setPrintErrors( ( prev ) => ( { ...prev, [ key ]: message } ) );
			}
		},
		[ clearPrintError ]
	);

	const currency = getCurrencyObject().code;
	const printAllError = printErrors[ PRINT_ALL_KEY ];

	return (
		<div className="bulk-batch-progress-modal__results">
			<h2
				className="bulk-batch-progress-modal__title"
				id="bulk-batch-progress-modal-title"
			>
				{ getResultsTitle( hasSucceeded, hasFailed ) }
			</h2>

			{ printAllError !== undefined && (
				<Notice
					status="error"
					isDismissible
					onRemove={ () => clearPrintError( PRINT_ALL_KEY ) }
				>
					{ printAllError }
				</Notice>
			) }

			{ hasSucceeded && (
				<section className="bulk-batch-progress-modal__section bulk-batch-progress-modal__section--succeeded">
					<header className="bulk-batch-progress-modal__section-header">
						<h3 className="bulk-batch-progress-modal__section-heading">
							<Icon icon={ check } size={ 18 } />
							{ sprintf(
								/* translators: %d: total number of labels printed across all succeeded orders (an order can produce more than one) */
								_n(
									'%d label created',
									'%d labels created',
									allLabelIds.length,
									'woocommerce-shipping'
								),
								allLabelIds.length
							) }
						</h3>
						<Button
							variant="primary"
							onClick={ () =>
								handlePrint(
									PRINT_ALL_KEY,
									allLabelIds,
									'bulk-labels.pdf',
									null
								)
							}
							className="bulk-batch-progress-modal__print-all"
						>
							{ _n(
								'Print label',
								'Print all labels',
								allLabelIds.length,
								'woocommerce-shipping'
							) }
						</Button>
					</header>
					<ul className="bulk-batch-progress-modal__order-list">
						{ succeeded.map( ( row ) => {
							const rowKey = String( row.order_id );
							const rowError = printErrors[ rowKey ];
							return (
								<li
									key={ row.order_id }
									className="bulk-batch-progress-modal__order-row"
								>
									<div className="bulk-batch-progress-modal__order-meta">
										<span className="bulk-batch-progress-modal__order-number">
											{ orderLabel( row ) }
										</span>
										{ row.customer_name && (
											<span className="bulk-batch-progress-modal__order-customer">
												{ row.customer_name }
											</span>
										) }
										{ rowError !== undefined && (
											<span className="bulk-batch-progress-modal__order-print-error">
												{ rowError }
											</span>
										) }
									</div>
									<div className="bulk-batch-progress-modal__order-cost">
										{ formatCurrency( row.cost, currency ) }
									</div>
									<Button
										variant="link"
										onClick={ () =>
											handlePrint(
												rowKey,
												row.label_ids,
												`label-${ row.order_id }.pdf`,
												row.order_id
											)
										}
									>
										{ __(
											'Print',
											'woocommerce-shipping'
										) }
									</Button>
								</li>
							);
						} ) }
					</ul>
				</section>
			) }

			{ hasFailed && (
				<section className="bulk-batch-progress-modal__section bulk-batch-progress-modal__section--failed">
					<header className="bulk-batch-progress-modal__section-header">
						<h3 className="bulk-batch-progress-modal__section-heading">
							<Icon icon={ errorIcon } size={ 18 } />
							{ sprintf(
								/* translators: %d: number of failed orders */
								_n(
									'%d order needs a fix',
									'%d orders need a fix',
									failed.length,
									'woocommerce-shipping'
								),
								failed.length
							) }
						</h3>
					</header>
					<Notice status="warning" isDismissible={ false }>
						{ failed.every( isBatchLevelFailure )
							? __(
									'The batch did not finish. Close this dialog and start the batch again from the orders list.',
									'woocommerce-shipping'
							  )
							: __(
									'Open each failed order to resolve the issue, then come back here and try the batch again.',
									'woocommerce-shipping'
							  ) }
					</Notice>
					<ul className="bulk-batch-progress-modal__order-list">
						{ failed.map( ( row ) => (
							<li
								key={ row.order_id }
								className="bulk-batch-progress-modal__order-row bulk-batch-progress-modal__order-row--failed"
							>
								<div className="bulk-batch-progress-modal__order-meta">
									<span className="bulk-batch-progress-modal__order-number">
										{ orderLabel( row ) }
									</span>
									{ row.customer_name && (
										<span className="bulk-batch-progress-modal__order-customer">
											{ row.customer_name }
										</span>
									) }
									<span className="bulk-batch-progress-modal__order-error">
										{ formatFailureMessage( row ) }
									</span>
								</div>
								{ /* Suppress "Fix and retry" for batch-level
								   failures (transport / merchant-cancel):
								   nothing on the order edit page can fix a
								   server outage or a closed modal, so the
								   per-row link would be a dead end. The
								   top-level Notice already tells the
								   merchant what to do next in that case. */ }
								{ ! isBatchLevelFailure( row ) && (
									<Button
										variant="secondary"
										href={ getEditOrderUrl( row.order_id ) }
										target="_blank"
										rel="noopener noreferrer"
										icon={ external }
										iconPosition="right"
									>
										{ __(
											'Fix and retry',
											'woocommerce-shipping'
										) }
									</Button>
								) }
							</li>
						) ) }
					</ul>
				</section>
			) }

			<div className="bulk-batch-progress-modal__results-actions">
				<Button variant="primary" onClick={ onClose }>
					{ __( 'Done', 'woocommerce-shipping' ) }
				</Button>
			</div>
		</div>
	);
};
