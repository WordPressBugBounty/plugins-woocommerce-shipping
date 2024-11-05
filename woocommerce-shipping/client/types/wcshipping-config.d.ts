import { CustomPackageResponse, LocationResponse, ResponseLabel } from './connect-server';
import { StoreOptions } from './store-options';
import { Order } from './order';
import { HazmatState } from './hazmat-state';
import { Continent } from './continent';
import { SelectedRates } from './selected-rates';
import { SelectedOrigin } from './selected-origin';
import { SelectedDestination } from './selected-destination';
import { CustomsState } from './customs-state';
import { Constants } from './constants';
import { ShipmentRecord } from './helpers';
import { UserMeta } from './user-meta';
import { PurchaseSettings } from './purchase-settings';
import { PurchaseMeta } from './purchase-meta';

// Todo: Gradually improve this type definition.
export interface WCShippingConfig {
	order: Order;
	accountSettings: {
		purchaseSettings: PurchaseSettings;
		purchaseMeta: PurchaseMeta;
		userMeta: UserMeta;
		storeOptions: StoreOptions;
	};
	context: string;
	continents: Continent[];
	is_destination_verified: boolean;
	is_origin_verified: boolean;
	items: number;
	packagesSettings: Record< string, unknown > & {
		packages: {
			custom: CustomPackageResponse[];
			predefined: Record< string, string[] >;
		};
		schema: Record< string, unknown >;
	};
	shipments: Record< string, unknown >[];
	shippingLabelData: Record< string, unknown > & {
		storeOptions: StoreOptions;
		currentOrderLabels: ResponseLabel[];
		storedData: {
			destination: LocationResponse;
			selected_rates: SelectedRates | '';
			selected_hazmat: HazmatState | '';
			selected_origin: SelectedOrigin | '';
			selected_destination: SelectedDestination | '';
			customs_information: ShipmentRecord< CustomsState > | '';
		};
	};
	origin_addresses: LocationResponse[];
	eu_countries: string[];
	constants: Constants;
}
