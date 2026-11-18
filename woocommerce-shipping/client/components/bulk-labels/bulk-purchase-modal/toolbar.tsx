import { __, sprintf } from '@wordpress/i18n';
import { ShippingDate } from 'components/label-purchase/details/shipping-date';
import type { BulkPurchaseOptions } from 'data/bulk-labels';
import { ApplyDropdown } from './apply-dropdown';
import type { ApplyOption } from './apply-dropdown';

export type { ApplyOption } from './apply-dropdown';

export type FilterMode = 'all' | 'ready' | 'needs_fix';

interface ToolbarProps {
	selectedCount: number;
	totalCount: number;
	readyCount: number;
	needsFixCount: number;
	filter: FilterMode;
	onFilterChange: ( mode: FilterMode ) => void;
	packageApplyOptions: ApplyOption[];
	packageApplyValue: string;
	onPackageApply: ( value: string ) => void;
	serviceApplyOptions: ApplyOption[];
	serviceApplyValue: string;
	onServiceApply: ( value: string ) => void;
	shipDate: Date;
	onShipDateChange: ( date: Date ) => void;
	signatureValue: BulkPurchaseOptions[ 'signature' ];
	onSignatureApply: ( value: BulkPurchaseOptions[ 'signature' ] ) => void;
}

export const Toolbar = ( {
	selectedCount,
	totalCount,
	readyCount,
	needsFixCount,
	filter,
	onFilterChange,
	packageApplyOptions,
	packageApplyValue,
	onPackageApply,
	serviceApplyOptions,
	serviceApplyValue,
	onServiceApply,
	shipDate,
	onShipDateChange,
	signatureValue,
	onSignatureApply,
}: ToolbarProps ) => {
	return (
		<div className="bulk-purchase-modal__toolbar">
			<div className="bulk-purchase-modal__toolbar-left">
				<div className="bulk-purchase-modal__toolbar-summary">
					<strong>
						{ sprintf(
							/* translators: 1: number selected, 2: total count */
							__(
								'%1$d of %2$d selected',
								'woocommerce-shipping'
							),
							selectedCount,
							totalCount
						) }
					</strong>
					<span className="bulk-purchase-modal__toolbar-divider">
						·
					</span>
					<span>
						{ __( 'Apply to all:', 'woocommerce-shipping' ) }
					</span>
				</div>
				<div className="bulk-purchase-modal__toolbar-controls">
					<ApplyDropdown
						label={ __( 'Package', 'woocommerce-shipping' ) }
						options={ packageApplyOptions }
						value={ packageApplyValue }
						onSelect={ onPackageApply }
					/>
					<ApplyDropdown
						label={ __( 'Service', 'woocommerce-shipping' ) }
						options={ serviceApplyOptions }
						value={ serviceApplyValue }
						onSelect={ onServiceApply }
					/>
					<ShippingDate
						shippingDate={ shipDate }
						setShippingDate={ onShipDateChange }
					/>
					<ApplyDropdown
						label={ __( 'Signature', 'woocommerce-shipping' ) }
						value={ signatureValue }
						onSelect={ ( value ) => {
							if (
								value === 'no' ||
								value === 'yes' ||
								value === 'adult'
							) {
								onSignatureApply( value );
							}
						} }
						options={ [
							{
								label: __(
									'Not required',
									'woocommerce-shipping'
								),
								value: 'no',
							},
							{
								label: __(
									'Signature required',
									'woocommerce-shipping'
								),
								value: 'yes',
							},
							{
								label: __(
									'Adult signature required',
									'woocommerce-shipping'
								),
								value: 'adult',
							},
						] }
					/>
				</div>
			</div>
			<div
				className="bulk-purchase-modal__toolbar-tabs"
				aria-label={ __( 'Filter orders', 'woocommerce-shipping' ) }
			>
				<button
					type="button"
					aria-pressed={ filter === 'all' }
					className={ `bulk-purchase-modal__tab ${
						filter === 'all'
							? 'bulk-purchase-modal__tab--active'
							: ''
					}` }
					onClick={ () => onFilterChange( 'all' ) }
				>
					{ sprintf(
						/* translators: %d: total order count */
						__( 'All %d', 'woocommerce-shipping' ),
						totalCount
					) }
				</button>
				<button
					type="button"
					aria-pressed={ filter === 'ready' }
					className={ `bulk-purchase-modal__tab ${
						filter === 'ready'
							? 'bulk-purchase-modal__tab--active'
							: ''
					}` }
					onClick={ () => onFilterChange( 'ready' ) }
				>
					{ sprintf(
						/* translators: %d: number of ready orders */
						__( 'Ready %d', 'woocommerce-shipping' ),
						readyCount
					) }
				</button>
				<button
					type="button"
					aria-pressed={ filter === 'needs_fix' }
					className={ `bulk-purchase-modal__tab ${
						filter === 'needs_fix'
							? 'bulk-purchase-modal__tab--active'
							: ''
					}` }
					onClick={ () => onFilterChange( 'needs_fix' ) }
				>
					{ sprintf(
						/* translators: %d: number of orders needing fix */
						__( 'Needs fix %d', 'woocommerce-shipping' ),
						needsFixCount
					) }
				</button>
			</div>
		</div>
	);
};
