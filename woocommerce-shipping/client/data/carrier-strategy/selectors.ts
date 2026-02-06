import { camelCaseKeys } from 'utils';
import { CarrierStrategyState } from '../types';

export const getUPSDAPCarrierStrategy = ( state: CarrierStrategyState ) =>
	state.carrierStrategies.upsdap;

export const getUPSDAPCarrierStrategyForAddressId = (
	state: CarrierStrategyState,
	addressId: string
) => {
	const upsdap = getUPSDAPCarrierStrategy( state );
	if ( ! upsdap?.originAddress?.[ addressId ] ) {
		return { hasAgreedToTos: false };
	}
	return camelCaseKeys( upsdap.originAddress[ addressId ] );
};
