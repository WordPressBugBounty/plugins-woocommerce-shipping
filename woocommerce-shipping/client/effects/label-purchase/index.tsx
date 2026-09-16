import {
	LabelPurchaseContextType,
	useLabelPurchaseContext,
} from 'context/label-purchase';
import { useRatesEffects } from './rates-effects';

const RatesEffects = ( { context }: { context: LabelPurchaseContextType } ) => {
	useRatesEffects( context );
	return null; // No UI to render.
};

export const LabelPurchaseEffects = () => {
	const context = useLabelPurchaseContext();
	// Remount per shipment: switching shipments swaps the watched package values and must not refetch rates.
	return (
		<RatesEffects
			key={ context.shipment.currentShipmentId }
			context={ context }
		/>
	);
};
