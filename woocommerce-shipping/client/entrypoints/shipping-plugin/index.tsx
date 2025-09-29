import {
	labelPurchaseStore,
	registerLabelPurchaseStore,
} from '../../data/label-purchase';
import { addressStore, registerAddressStore } from '../../data/address';
import {
	carrierStrategyStore,
	registerCarrierStrategyStore,
} from '../../data/carrier-strategy';
import { getConfig } from './../../utils';
import { memo, useRef } from 'react';
import { LabelPurchaseContextProvider } from '../../context/label-purchase';
import { LabelPurchaseEffects } from '../../effects/label-purchase';
import { LabelPurchaseTabs } from '../../components/label-purchase/label-purchase-tabs';

const PurchaseShippingLabelPluginExport = memo(
	( { orderId }: { orderId: number } ) => {
		const noop = () => getConfig;
		const ref = useRef( null );

		return (
			<LabelPurchaseContextProvider orderId={ orderId } nextDesign>
				<LabelPurchaseEffects />
				<LabelPurchaseTabs ref={ ref } setStartSplitShipment={ noop } />
			</LabelPurchaseContextProvider>
		);
	}
);

const PurchaseShippingLabelPlugin = () => {
	if ( ! addressStore ) {
		registerAddressStore( true );
	}
	if ( ! labelPurchaseStore ) {
		registerLabelPurchaseStore();
	}
	if ( ! carrierStrategyStore ) {
		registerCarrierStrategyStore();
	}

	const orderId = getConfig().order.id;

	return <PurchaseShippingLabelPluginExport orderId={ orderId } />;
};

window.WCShipping_Plugin = PurchaseShippingLabelPlugin;

export default PurchaseShippingLabelPlugin;
