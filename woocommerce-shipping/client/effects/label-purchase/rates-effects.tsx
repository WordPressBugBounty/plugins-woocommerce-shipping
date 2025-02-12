import { useThrottledStateChange } from '../utils';
import { LabelPurchaseContextType } from 'context/label-purchase';

export const useRatesEffects = ( {
	rates: { updateRates },
	customs: { isCustomsNeeded },
}: LabelPurchaseContextType ) => {
	// Update rates when isCustomsNeeded changes
	useThrottledStateChange( isCustomsNeeded(), updateRates );
};
