import { Destination, OriginAddress } from 'types';
import { ShipmentAddressState } from './shipment-address-state';

export interface AddressState extends object {
	destination?: ShipmentAddressState< Destination >;
	origin: ShipmentAddressState & {
		addresses: OriginAddress[];
	};
	storeOrigin: Pick< OriginAddress, 'country' | 'state' >;
}
