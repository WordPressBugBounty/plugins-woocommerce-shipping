import { LabelPurchaseContext } from './context';
import { getCurrentOrderItems } from 'utils';
import CurrencyFactory from '@woocommerce/currency';
import {
	useEssentialDetails,
	useAccountState,
	useTotalWeight,
	useShipmentState,
	useRatesState,
	usePackageState,
	useHazmatState,
	useCustomsState,
	useLabelsState,
} from 'components/label-purchase/hooks';

interface Props {
	children: React.JSX.Element | React.JSX.Element[];
	orderId: number;
}

export const LabelPurchaseContextProvider = ( {
	children,
}: Props ): React.JSX.Element => {
	const orderItems = getCurrentOrderItems();
	const storeCurrency = CurrencyFactory();

	const {
		shipments,
		setShipments,
		getShipmentWeight,
		resetSelections,
		selections,
		setSelection,
		currentShipmentId,
		setCurrentShipmentId,
		getShipmentItems,
		getSelectionItems,
		setShipmentOrigin,
		getShipmentOrigin,
		getShipmentDestination,
		revertLabelShipmentIdsToUpdate,
		labelShipmentIdsToUpdate,
		getShipmentPurchaseOrigin,
		hasVariations,
		hasMultipleShipments,
		isExtraLabelPurchaseValid,
		resetShipmentAndSelection,
	} = useShipmentState();

	const { getShipmentTotalWeight, setShipmentTotalWeight } = useTotalWeight( {
		shipmentWeight: getShipmentWeight(),
		currentShipmentId,
	} );

	const totalWeight = getShipmentTotalWeight();

	const {
		getShipmentHazmat,
		setShipmentHazmat,
		applyHazmatToPackage,
		isHazmatSpecified,
	} = useHazmatState( currentShipmentId );

	const packages = usePackageState(
		currentShipmentId,
		shipments,
		totalWeight
	);

	const customs = useCustomsState(
		currentShipmentId,
		shipments,
		selections,
		getShipmentItems,
		getSelectionItems,
		getShipmentOrigin,
		getShipmentDestination
	);

	const {
		selectedRates,
		selectRates,
		selectRate,
		getSelectedRate,
		removeSelectedRate,
		isFetching,
		updateRates,
		fetchRates,
		sortRates,
		errors,
		setErrors,
		matchAndSelectRate,
		availableRates,
		preselectRateBasedOnLastSelections,
		getSelectedRateOptions,
		selectedRateOptions,
		selectRateOption,
	} = useRatesState( {
		currentShipmentId,
		currentPackageTab: packages.currentPackageTab,
		applyHazmatToPackage,
		getPackageForRequest: packages.getPackageForRequest,
		totalWeight,
		customs,
		getShipmentOrigin,
	} );

	const labels = useLabelsState( {
		currentShipmentId,
		totalWeight,
		getPackageForRequest: packages.getPackageForRequest,
		getShipmentItems,
		getSelectionItems,
		getShipmentHazmat,
		updateRates,
		getShipmentOrigin,
		customs,
		shipments,
		applyHazmatToPackage,
		getSelectedRateOptions,
	} );

	const account = useAccountState();
	const essentialDetails = useEssentialDetails();

	const value = {
		orderItems,
		shipment: {
			shipments,
			setShipments,
			selections,
			setSelection,
			resetSelections,
			currentShipmentId,
			getShipmentItems,
			getSelectionItems,
			setShipmentOrigin,
			getShipmentOrigin,
			getShipmentDestination,
			setCurrentShipmentId,
			revertLabelShipmentIdsToUpdate,
			labelShipmentIdsToUpdate,
			getShipmentPurchaseOrigin,
			hasVariations,
			hasMultipleShipments,
			isExtraLabelPurchaseValid,
			resetShipmentAndSelection,
		},
		hazmat: {
			getShipmentHazmat,
			setShipmentHazmat,
			applyHazmatToPackage,
			isHazmatSpecified,
		},
		packages,
		storeCurrency,
		rates: {
			selectedRates,
			selectRates,
			selectRate,
			getSelectedRate,
			removeSelectedRate,
			isFetching,
			fetchRates,
			errors,
			setErrors,
			updateRates,
			sortRates,
			matchAndSelectRate,
			availableRates,
			preselectRateBasedOnLastSelections,
			selectedRateOptions,
			selectRateOption,
			getSelectedRateOptions,
		},
		weight: {
			getShipmentWeight,
			getShipmentTotalWeight,
			setShipmentTotalWeight,
		},
		customs,
		labels,
		account,
		essentialDetails,
	};

	return (
		<LabelPurchaseContext.Provider value={ value }>
			{ children }
		</LabelPurchaseContext.Provider>
	);
};
