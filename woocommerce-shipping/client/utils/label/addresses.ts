import { mapValues } from 'lodash';
import { getConfig, removeShipmentFromKeys } from 'utils';
import { Destination, LocationResponse, OriginAddress } from 'types';
import { camelCaseKeys } from '../common';

export const getLabelOrigins = (): Record< string, OriginAddress > | null => {
	const origins = getConfig().shippingLabelData.storedData.selected_origin;
	return origins
		? removeShipmentFromKeys(
				mapValues( origins, ( o ) => camelCaseKeys( o ) )
		  )
		: null;
};

export const getLabelDestinations = (): Record<
	string,
	Destination
> | null => {
	const destinations =
		getConfig().shippingLabelData.storedData.selected_destination;

	return destinations
		? removeShipmentFromKeys(
				mapValues( destinations, ( d ) =>
					camelCaseKeys< LocationResponse, Destination >( d )
				)
		  )
		: null;
};
