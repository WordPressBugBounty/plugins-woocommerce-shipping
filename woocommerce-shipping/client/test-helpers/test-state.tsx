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
} from 'components/label-purchase/context';

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
		() => [],
		getShipmentOrigin,
		() => getShipmentOrigin()
	);

	const { fetchRates, getSelectedRate } = useRatesState( {
		currentShipmentId,
		getPackageForRequest,
		applyHazmatToPackage: ( data ) => data,
		totalWeight,
		customs,
		getShipmentOrigin,
		currentPackageTab: TAB_NAMES.CUSTOM_PACKAGE,
	} );

	const account = {
		...useAccountState( {
			getSelectedRate,
		} ),
	};

	const packages = {
		...usePackageState( currentShipmentId, totalWeight ),
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
			},
			rates: {
				errors,
				fetchRates,
				setErrors,
				isFetching: false,
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
