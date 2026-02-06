import { register, select } from '@wordpress/data';
import { CARRIER_STRATEGY_STORE_NAME } from 'data/constants';
import { createStore } from './store';

let carrierStrategyStore: ReturnType< typeof createStore >;
export const registerCarrierStrategyStore = () => {
	carrierStrategyStore = carrierStrategyStore || createStore();
	if ( select( CARRIER_STRATEGY_STORE_NAME ) ) {
		return;
	}
	register( carrierStrategyStore );
};

export { carrierStrategyStore };
