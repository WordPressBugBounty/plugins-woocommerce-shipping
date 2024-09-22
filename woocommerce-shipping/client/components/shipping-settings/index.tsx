import React from 'react';
import { __experimentalSpacer as Spacer, Flex } from '@wordpress/components';
import { OriginAddress } from 'types';
import { select } from '@wordpress/data';
import { LabelsSettingsComponent } from './labels-settings';
import { OriginAddressList } from './origin-address/list';
import { ShippingSettingsContextProvider } from './context';
import { useOriginAddressState } from './hooks';
import { addressStore } from 'data/address';

interface ShippingSettingsProps {
	storeContactInfo: Record< string, string | number >;
	originAddresses: OriginAddress[];
}

const ShippingSettings = ( {}: ShippingSettingsProps ) => {
	const addresses = select( addressStore ).getOriginAddresses();
	return (
		<ShippingSettingsContextProvider
			initialValue={ {
				originAddresses: {
					addresses,
					...useOriginAddressState(),
				},
			} }
		>
			<Flex direction="column" gap="2rem">
				<Spacer marginTop={ 4 } marginBottom={ 0 } />
				<LabelsSettingsComponent />
				<OriginAddressList />
			</Flex>
		</ShippingSettingsContextProvider>
	);
};

export default ShippingSettings;
