import { mapValues, mapKeys, isObject } from 'lodash';

import { camelCaseKeys } from '../common';
import { getConfig } from '../config';
import { Label } from 'types';
import { getDateTS } from 'utils';

export const getShipmentDates = () => {
	const shipmentDates =
		getConfig().shippingLabelData.storedData.shipment_dates;

	if ( isObject( shipmentDates ) ) {
		return mapKeys( mapValues( shipmentDates, camelCaseKeys ), ( _, key ) =>
			key.replace( 'shipment_', '' )
		);
	}
	return {};
};

export const getShipmentDefaultDates = (
	shipmentId: string,
	activePurchasedLabel?: Label
) => {
	const shipmentDates = getShipmentDates();
	const shippingDate = shipmentDates[ shipmentId ]?.shippingDate;
	const estimatedDeliveryDate =
		shipmentDates[ shipmentId ]?.estimatedDeliveryDate;

	// As we were not persisting the shipping date before, we use the label's created date which is used as label_date by our provider
	const labelCreatedDate = activePurchasedLabel?.createdDate
		? new Date( activePurchasedLabel.createdDate ).toISOString()
		: undefined;

	return {
		// If the value is undefined, shippinDate will be set to today's date
		shippingDate: getDateTS( shippingDate ?? labelCreatedDate ),
		// Not setting estimatedDeliveryDate if it's not defined
		estimatedDeliveryDate: estimatedDeliveryDate
			? getDateTS( estimatedDeliveryDate )
			: undefined,
	};
};
