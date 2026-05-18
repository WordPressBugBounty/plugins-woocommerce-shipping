import { Button, Flex, Modal, Notice, Spinner } from '@wordpress/components';
import { __, sprintf, _n } from '@wordpress/i18n';
import { useMemo, useState } from '@wordpress/element';
import { DataViews } from '@wordpress/dataviews/wp';
import type { Field, View } from '@wordpress/dataviews/wp';
import { Icon, caution, closeSmall } from '@wordpress/icons';
import { useBulkPurchaseOrders } from 'data/bulk-labels';
import type {
	BulkPurchaseOrder,
	OrderShippingContextRecord,
} from 'data/bulk-labels';
import { AddressGroupingSuggestion, NeedsFixNotice } from './banners';
import { Toolbar, type FilterMode } from './toolbar';
import { Sidebar } from './sidebar';
import type { BulkPurchaseModalProps } from './types';
import './style.scss';

/**
 * "City, ST Postcode" — the compact line under the recipient name.
 */
const formatLocality = (
	destination: OrderShippingContextRecord[ 'destination' ]
): string => {
	const stateAndZip = [ destination?.state, destination?.postcode ]
		.filter( Boolean )
		.join( ' ' );
	return [ destination?.city, stateAndZip ]
		.filter( ( p ): p is string => Boolean( p?.trim() ) )
		.join( ', ' );
};

export const BulkPurchaseModal = ( {
	orderIds,
	onClose,
}: BulkPurchaseModalProps ) => {
	const [ filter, setFilter ] = useState< FilterMode >( 'all' );

	const { isResolving, error, records, orders, summary, grouping } =
		useBulkPurchaseOrders( orderIds );

	const isLoading = isResolving;
	const hasData = ! isLoading && records.length > 0;
	const erroredRecords = useMemo(
		() => records.filter( ( record ) => record.error ),
		[ records ]
	);
	const erroredRecordsCount = erroredRecords.length;

	const filteredOrders = useMemo( () => {
		if ( filter === 'ready' ) {
			return orders.filter( ( o ) => o.status === 'ready' );
		}
		if ( filter === 'needs_fix' ) {
			return orders.filter( ( o ) => o.status === 'needs_fix' );
		}
		return orders;
	}, [ orders, filter ] );

	const fields = useMemo< Field< BulkPurchaseOrder >[] >(
		() => [
			{
				id: 'order',
				label: __( 'Order', 'woocommerce-shipping' ),
				enableSorting: false,
				enableHiding: false,
				render: ( { item }: { item: BulkPurchaseOrder } ) => (
					<span className="bulk-purchase-modal__order-number">
						{ sprintf(
							/* translators: %s: order number */
							__( '#%s', 'woocommerce-shipping' ),
							item.order_number ?? String( item.order_id )
						) }
					</span>
				),
			},
			{
				id: 'ship_to',
				label: __( 'Ship to', 'woocommerce-shipping' ),
				enableSorting: false,
				enableHiding: false,
				render: ( { item }: { item: BulkPurchaseOrder } ) => {
					const locality = formatLocality( item.destination );
					const country = item.destination?.country;
					const isIntl = country && country !== 'US';
					const itemCount = item.item_count ?? 0;
					return (
						<>
							{ item.customer_name && (
								<div className="bulk-purchase-modal__customer-name">
									{ item.customer_name }
								</div>
							) }
							<div className="bulk-purchase-modal__address-line">
								{ locality && (
									<>
										<span aria-hidden="true">✓ </span>
										{ locality }
									</>
								) }
								{ isIntl && (
									<span className="bulk-purchase-modal__intl-badge">
										{ __( 'Intl', 'woocommerce-shipping' ) }
									</span>
								) }
								{ itemCount > 0 && (
									<>
										{ ' · ' }
										{ sprintf(
											/* translators: %d: number of items in the order */
											_n(
												'%d item',
												'%d items',
												itemCount,
												'woocommerce-shipping'
											),
											itemCount
										) }
									</>
								) }
							</div>
						</>
					);
				},
			},
			{
				id: 'package',
				label: __( 'Package', 'woocommerce-shipping' ),
				enableSorting: false,
				enableHiding: false,
				render: ( { item }: { item: BulkPurchaseOrder } ) => (
					<div className="bulk-purchase-modal__pill">
						<div className="bulk-purchase-modal__pill-title">
							📦 { item.package_display.name }
						</div>
						{ item.package_display.dimensions && (
							<div className="bulk-purchase-modal__pill-meta">
								{ item.package_display.dimensions }
							</div>
						) }
						<div className="bulk-purchase-modal__pill-meta">
							{ sprintf(
								/* translators: 1: weight value, 2: weight unit */
								__( '%1$s %2$s', 'woocommerce-shipping' ),
								String( item.package_display.weight ),
								item.package_display.weight_unit
							) }
						</div>
					</div>
				),
			},
			{
				id: 'service',
				label: __( 'Service', 'woocommerce-shipping' ),
				enableSorting: false,
				enableHiding: false,
				render: ( { item }: { item: BulkPurchaseOrder } ) => (
					<div className="bulk-purchase-modal__pill">
						<div className="bulk-purchase-modal__service-badge">
							{ item.service.carrier }
						</div>
						<div className="bulk-purchase-modal__pill-title">
							{ item.service.carrier } { item.service.name }
						</div>
						<div className="bulk-purchase-modal__pill-meta">
							{ item.service.estimate }
						</div>
					</div>
				),
			},
			{
				id: 'note',
				label: __( 'Notes', 'woocommerce-shipping' ),
				enableSorting: false,
				enableHiding: false,
				render: ( { item }: { item: BulkPurchaseOrder } ) => {
					if ( ! item.note.type ) {
						return (
							<span className="bulk-purchase-modal__note-empty">
								—
							</span>
						);
					}
					return (
						<span
							className={ `bulk-purchase-modal__note bulk-purchase-modal__note--${ item.note.type }` }
						>
							{ item.note.type === 'warning' && (
								<Icon icon={ caution } size={ 16 } />
							) }
							{ item.note.text }
						</span>
					);
				},
			},
			{
				id: 'cost',
				label: __( 'Cost', 'woocommerce-shipping' ),
				enableSorting: false,
				enableHiding: false,
				render: ( { item }: { item: BulkPurchaseOrder } ) => (
					<div className="bulk-purchase-modal__cost">
						<div className="bulk-purchase-modal__cost-amount">
							${ item.cost.toFixed( 2 ) }
						</div>
						{ item.cost_savings > 0 && (
							<div className="bulk-purchase-modal__cost-savings">
								{ sprintf(
									/* translators: %s: dollar savings */
									__(
										'−$%s vs paid',
										'woocommerce-shipping'
									),
									item.cost_savings.toFixed( 2 )
								) }
							</div>
						) }
					</div>
				),
			},
			{
				id: 'status',
				label: __( 'Status', 'woocommerce-shipping' ),
				enableSorting: false,
				enableHiding: false,
				render: ( { item }: { item: BulkPurchaseOrder } ) => (
					<span
						className={ `bulk-purchase-modal__status bulk-purchase-modal__status--${ item.status }` }
					>
						<span className="bulk-purchase-modal__status-dot" />
						{ item.status === 'ready'
							? __( 'Ready', 'woocommerce-shipping' )
							: __( 'Needs fix', 'woocommerce-shipping' ) }
					</span>
				),
			},
		],
		[]
	);

	const view: View = {
		type: 'table',
		fields: [
			'order',
			'ship_to',
			'package',
			'service',
			'note',
			'cost',
			'status',
		],
		layout: {
			enableMoving: false,
		},
	};

	const title = sprintf(
		/* translators: %d: number of shipping labels to create */
		_n(
			'Create %d shipping label',
			'Create %d shipping labels',
			orderIds.length,
			'woocommerce-shipping'
		),
		orderIds.length
	);

	return (
		<Modal
			title={ title }
			onRequestClose={ onClose }
			overlayClassName="bulk-purchase-overlay"
			className="bulk-purchase-modal"
			shouldCloseOnClickOutside={ false }
			__experimentalHideHeader
			isDismissible={ false }
		>
			<Flex
				className="bulk-purchase-modal__header"
				justify="space-between"
				align="flex-start"
			>
				<div className="bulk-purchase-modal__title-block">
					{ /* The orders list page already owns the page-level <h1>; use <h2> here so screen readers don't announce two top-level headings. */ }
					<h2 className="bulk-purchase-modal__title">{ title }</h2>
					<p className="bulk-purchase-modal__intro">
						{ __(
							'We picked the cheapest service and your most-used package for each order. Review, override what you need to, and purchase everything at once.',
							'woocommerce-shipping'
						) }
					</p>
				</div>
				<Button
					icon={ closeSmall }
					onClick={ onClose }
					label={ __( 'Close', 'woocommerce-shipping' ) }
				/>
			</Flex>

			{ isLoading && (
				<div className="bulk-purchase-modal__loading">
					<Spinner />
				</div>
			) }

			{ ! isLoading && Boolean( error ) && (
				<Notice status="error" isDismissible={ false }>
					{ error?.message ??
						__(
							'Could not load order details.',
							'woocommerce-shipping'
						) }
				</Notice>
			) }

			{ ! isLoading && ! error && ! hasData && (
				<Notice status="info" isDismissible={ false }>
					{ __(
						'No orders found for this selection.',
						'woocommerce-shipping'
					) }
				</Notice>
			) }

			{ hasData && (
				<div className="bulk-purchase-modal__layout">
					<div className="bulk-purchase-modal__main">
						{ erroredRecordsCount > 0 && (
							<Notice status="warning" isDismissible={ false }>
								{ sprintf(
									/* translators: 1: number of orders that could not be loaded, 2: comma-separated list of failed order IDs (e.g. #101, #102) */
									_n(
										'%1$d order could not be loaded and will be skipped: %2$s.',
										'%1$d orders could not be loaded and will be skipped: %2$s.',
										erroredRecordsCount,
										'woocommerce-shipping'
									),
									erroredRecordsCount,
									erroredRecords
										.map(
											( record ) =>
												`#${ record.order_id }`
										)
										.join( ', ' )
								) }
							</Notice>
						) }

						{ grouping && (
							<AddressGroupingSuggestion
								customerName={ grouping.customerName }
								cityState={ grouping.cityState }
								orderIds={ grouping.orderIds }
								// Placeholder savings — real grouping discount lands with WOOSHIP-2133.
								savings={ 8.1 }
							/>
						) }

						<NeedsFixNotice
							needsFixCount={ summary.needsFixCount }
							readyCount={ summary.readyCount }
							onShowOnlyIssues={ () => setFilter( 'needs_fix' ) }
						/>

						<Toolbar
							selectedCount={ filteredOrders.length }
							totalCount={ orders.length }
							readyCount={ summary.readyCount }
							needsFixCount={ summary.needsFixCount }
							filter={ filter }
							onFilterChange={ setFilter }
						/>

						<div className="bulk-purchase-modal__orders">
							<DataViews< BulkPurchaseOrder >
								view={ view }
								fields={ fields }
								data={ filteredOrders }
								isLoading={ false }
								onChangeView={ () => {} } // eslint-disable-line @typescript-eslint/no-empty-function
								search={ false }
								defaultLayouts={ {
									table: {
										showMedia: false,
									},
								} }
								paginationInfo={ {
									totalItems: filteredOrders.length,
									totalPages: 1,
								} }
								getItemId={ ( item: BulkPurchaseOrder ) =>
									String( item.order_id )
								}
							>
								<DataViews.Layout />
							</DataViews>
						</div>
					</div>

					<Sidebar
						readyCount={ summary.readyCount }
						needsFixCount={ summary.needsFixCount }
						subtotal={ summary.subtotal }
						discount={ summary.discount }
						total={ summary.total }
						onPurchase={ () => {
							// Placeholder — wired in WOOSHIP-2133.
						} }
					/>
				</div>
			) }
		</Modal>
	);
};
