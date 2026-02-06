import { __experimentalGrid as Grid } from '@wordpress/components';
import { createPortal } from '@wordpress/element';
import { getCurrentOrder } from 'utils';

import { useLabelPurchaseContext } from 'context/label-purchase';
import { PurchaseNotice } from '../label';
import { RefundedNotice } from '../label/refunded-notice';
import { LABEL_PURCHASE_STATUS } from 'data/constants';
import { PurchaseErrorNotice } from '../purchase/purchase-error-notice';
import { Destination, ShipmentItem, ShipmentSubItem } from 'types';
import ItemsCard from './cards/items-card';
import { PackagesCard } from './cards/packages-card';
import { ShippingRatesCard } from './cards/shipping-rates-card';
import { Customs } from '../customs';
import { SummaryCard } from './cards/summary-card';
import { PaymentButtons } from '../purchase';
import { AddressesCard } from './cards/addresses-card';
import { ErrorBoundaryNext } from 'components/HOC/error-boundary/error-boundary-next';
import { withBoundaryNext } from 'components/HOC';
import { PaymentMethodSummary } from './internal/payment-method-summary';

interface ShipmentContentProps {
	items: unknown[];
}

const LabelPurchaseStatusNotices = () => {
	const {
		labels: {
			getCurrentShipmentLabel,
			hasPurchasedLabel,
			showRefundedNotice,
			hasRequestedRefund,
			isAnyRequestInProgress,
		},
	} = useLabelPurchaseContext();

	const currentLabel = getCurrentShipmentLabel();
	const hasNonErrorLabel =
		hasPurchasedLabel( false ) &&
		currentLabel?.status !== LABEL_PURCHASE_STATUS.PURCHASE_ERROR;

	return (
		<ErrorBoundaryNext>
			<div id="label-purchase-status-notices">
				{ /* Render PurchaseNotice when we have a successful label OR when a request is in progress (retry scenario) */ }
				{ ( hasNonErrorLabel || isAnyRequestInProgress ) && (
					<PurchaseNotice />
				) }
				{ /* Only show error notice when not processing a new request */ }
				{ ! isAnyRequestInProgress && (
					<PurchaseErrorNotice label={ currentLabel } />
				) }
				{ hasRequestedRefund() &&
					showRefundedNotice &&
					! hasPurchasedLabel() && <RefundedNotice /> }
			</div>
		</ErrorBoundaryNext>
	);
};

const ShipmentContentV2Component = ( {
	items,
}: ShipmentContentProps ): JSX.Element => {
	const order = getCurrentOrder();

	const {
		customs: { isCustomsNeeded },
		labels: {
			hasPurchasedLabel,

			getCurrentShipmentLabel,
		},
		shipment: { currentShipmentId, getShipmentDestination },
	} = useLabelPurchaseContext();

	const destinationAddress = getShipmentDestination() as Destination;

	const portal =
		document.getElementById(
			'fulfill-page-actions__purchase-label__action-wrapper'
		) ?? undefined;

	return (
		<Grid columns={ 1 } rowGap="24px">
			<LabelPurchaseStatusNotices />
			<AddressesCard
				order={ order }
				destinationAddress={ destinationAddress }
			/>
			<ItemsCard
				order={ order }
				items={ items as ( ShipmentItem | ShipmentSubItem )[] }
			/>
			{ isCustomsNeeded() &&
				Boolean( getCurrentShipmentLabel()?.isLegacy ) === false && (
					<ErrorBoundaryNext>
						<Customs key={ currentShipmentId } />
					</ErrorBoundaryNext>
				) }
			{ ! hasPurchasedLabel( false ) && (
				<>
					<PackagesCard />
					<ShippingRatesCard />
				</>
			) }
			<SummaryCard
				order={ order }
				destinationAddress={ destinationAddress }
			/>
			<PaymentMethodSummary />
			{ portal &&
				createPortal(
					<ErrorBoundaryNext>
						<PaymentButtons order={ order } />
					</ErrorBoundaryNext>,
					portal
				) }
		</Grid>
	);
};

export const ShipmentContentV2 = withBoundaryNext(
	ShipmentContentV2Component
)();
