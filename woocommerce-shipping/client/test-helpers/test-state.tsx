import { mockUtils } from './test-utils';
// This import should be before all other imports for the mock to work
mockUtils();

import { useState } from '@wordpress/element';
import { merge } from 'lodash';
import {
	useAccountState,
	useCustomsState,
	useRatesState,
	usePackageState,
} from 'components/label-purchase/hooks';
import { TAB_NAMES } from 'components/label-purchase/packages';
import {
	LabelPurchaseContextProvider,
	LabelPurchaseContextType,
} from 'context/label-purchase';

interface ProvideStateProps {
	children: React.JSX.Element | React.JSX.Element[];
	initialValue?: Partial< LabelPurchaseContextType >;
}

let totalWeight = 10;
const getShipmentTotalWeight = jest.fn( () => totalWeight );
const setShipmentTotalWeight = jest.fn( ( total ) => {
	totalWeight = total;
} );
const getPackageForRequest = jest.fn();

export const ProvideTestState = ( {
	children,
	initialValue = {},
}: ProvideStateProps ) => {
	const [ errors, setErrors ] = useState( {} );
	const currentShipmentId = '0';
	const shipments = {
		'0': [],
	};
	const getShipmentOrigin = () => ( {
		id: currentShipmentId,
		company: 'WooCommerce',
		country: 'US',
		state: 'CA',
		firstName: 'Foo',
		lastName: 'Bar',
		address1: '123 Main St',
		address2: '',
		city: 'San Francisco',
		postcode: '94105',
		phone: '1234567890',
		email: 'email@mail.com',
		isVerified: true,
	} );
	const customs = useCustomsState(
		'0',
		shipments,
		{},
		() => [],
		() => [],
		getShipmentOrigin,
		() => getShipmentOrigin()
	);

	const { fetchRates } = useRatesState( {
		currentShipmentId: '0',
		getPackageForRequest,
		applyHazmatToPackage: ( data ) => data,
		totalWeight,
		customs,
		getShipmentOrigin,
		currentPackageTab: TAB_NAMES.CUSTOM_PACKAGE,
	} );

	const account = {
		...useAccountState(),
	};

	const packages = {
		...usePackageState( currentShipmentId, shipments, totalWeight ),
		getPackageForRequest,
		isSelectedASavedPackage: jest.fn( () => true ),
	};

	const _initialValue = merge(
		{
			shipment: {
				currentShipmentId: 0,
				shipments: {
					0: {},
				},
				getShipmentOrigin,
				selections: {
					0: [ { id: 0 } ],
				},
				isExtraLabelPurchaseValid: jest.fn().mockReturnValue( true ),
			},
			rates: {
				errors,
				fetchRates,
				setErrors,
				isFetching: false,
				preselectRateBasedOnLastSelections: jest.fn(),
			},
			weight: {
				getShipmentWeight: () => totalWeight,
				totalWeight,
				getShipmentTotalWeight,
				setShipmentTotalWeight,
			},
			customs: {
				hasErrors: () => false,
				hasCustomsErrors: () => false,
			},
			labels: {
				hasPurchasedLabel: () => false,
				getCurrentShipmentLabel: () => null,
				selectedLabelSize: () => ( {} ),
				paperSizes: [],
				hasMissingPurchase: jest.fn().mockReturnValue( false ),
			},
			packages,
			hazmat: {
				isHazmatSpecified: jest.fn( () => true ),
			},
			essentialDetails: {
				resetFocusArea: jest.fn(),
			},
			account,
		},
		initialValue
	) as LabelPurchaseContextType;
	return (
		<LabelPurchaseContextProvider initialValue={ _initialValue }>
			{ children }
		</LabelPurchaseContextProvider>
	);
};
