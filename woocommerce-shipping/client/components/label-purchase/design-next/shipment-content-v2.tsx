import { JSX, useEffect } from 'react';
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
		},
	} = useLabelPurchaseContext();

	return (
		<>
			{ hasPurchasedLabel( false ) &&
				getCurrentShipmentLabel()?.status !==
					LABEL_PURCHASE_STATUS.PURCHASE_ERROR && <PurchaseNotice /> }
			<PurchaseErrorNotice label={ getCurrentShipmentLabel() } />
			{ hasRequestedRefund() &&
				showRefundedNotice &&
				! hasPurchasedLabel() && <RefundedNotice /> }
		</>
	);
};

export const ShipmentContentV2 = ( {
	items,
}: ShipmentContentProps ): JSX.Element => {
	const order = getCurrentOrder();

	const {
		customs: { isCustomsNeeded },
		labels: {
			hasPurchasedLabel,
			isCurrentTabPurchasingExtraLabel,
			getCurrentShipmentLabel,
		},
		shipment: {
			currentShipmentId,
			getSelectionItems,
			getShipmentDestination,
		},
		essentialDetails: { setExtraLabelPurchaseCompleted },
	} = useLabelPurchaseContext();

	const destinationAddress = getShipmentDestination() as Destination;

	const portal =
		document.getElementById(
			'fulfill-page-actions__purchase-label__action-wrapper'
		) ?? undefined;

	useEffect( () => {
		if ( isCurrentTabPurchasingExtraLabel() ) {
			setExtraLabelPurchaseCompleted( getSelectionItems()?.length > 0 );
		}
	}, [
		setExtraLabelPurchaseCompleted,
		isCurrentTabPurchasingExtraLabel,
		getSelectionItems,
	] );

	return (
		<Grid columns={ 1 } rowGap="24px">
			<LabelPurchaseStatusNotices />
			<ItemsCard
				items={ items as ( ShipmentItem | ShipmentSubItem )[] }
			/>
			{ isCustomsNeeded() &&
				Boolean( getCurrentShipmentLabel()?.isLegacy ) === false && (
					<Customs key={ currentShipmentId } />
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
			{ portal &&
				createPortal( <PaymentButtons order={ order } />, portal ) }
		</Grid>
	);
};
