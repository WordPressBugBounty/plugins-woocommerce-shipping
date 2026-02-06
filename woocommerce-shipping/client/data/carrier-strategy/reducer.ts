import { mapValues } from 'lodash';
import { camelCaseKeys, createReducer, getCarrierStrategies } from 'utils';
import { CarrierStrategyActions, CarrierStrategyUPSDAPUpdate } from './types.d';

import { CARRIER_STRATEGY_UPSDAP_UPDATE, STATE_RESET } from './action-types';
import { CarrierStrategyState } from '../types';

const getDefaultState = (): CarrierStrategyState => {
	return {
		carrierStrategies: mapValues( getCarrierStrategies(), ( value ) =>
			camelCaseKeys( value )
		),
	} as const;
};

export const carrierStrategyReducer = () =>
	createReducer( getDefaultState() )
		.on(
			CARRIER_STRATEGY_UPSDAP_UPDATE,
			(
				state,
				{
					payload: { addressId, confirmed },
				}: CarrierStrategyUPSDAPUpdate
			) => {
				return {
					...state,
					carrierStrategies: {
						upsdap: {
							...state.carrierStrategies.upsdap,
							originAddress: {
								...state.carrierStrategies.upsdap.originAddress,
								[ addressId ]: {
									...state.carrierStrategies.upsdap[
										addressId
									],
									has_agreed_to_tos: confirmed,
								},
							},
						},
					},
				};
			}
		)
		.on( STATE_RESET, () => ( { ...getDefaultState() } ) )
		.bind< CarrierStrategyActions >();
