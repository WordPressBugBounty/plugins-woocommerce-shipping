import React from 'react';
import { useEffect, useRef, useState } from '@wordpress/element';
import {
	Button,
	Flex,
	FlexItem,
	Icon,
	Modal,
	TabPanel,
} from '@wordpress/components';
import { __, _n } from '@wordpress/i18n';
import CurrencyFactory from '@woocommerce/currency';
import { check } from '@wordpress/icons';
import {
	getCurrentOrderItems,
	getCurrentOrder,
	recordEvent,
	deleteUrlParam,
	urlParamHasValue,
	setUrlParamValue,
	getSubItems,
} from 'utils';
import { ShippingIcon } from './shipping-icon';
import { ModalHeader } from './order-label-purchase-modal';
import { LabelPurchaseContextProvider } from 'context/label-purchase';
import { SplitShipmentModal } from './split-shipment';
import { getShipmentSummaryText, getShipmentTitle } from './utils';
import { ShipmentContent } from './shipment-content';
import {
	useAccountState,
	useCustomsState,
	useEssentialDetails,
	useHazmatState,
	useLabelsState,
	usePackageState,
	useRatesState,
	useShipmentState,
	useTotalWeight,
} from './hooks';
import { ShipmentItem } from 'types';

interface OrderLabelPurchaseProps {
	orderId: number;
	openModal?: boolean;
}

export const OrderLabelPurchase = ( {
	orderId,
	openModal,
}: OrderLabelPurchaseProps ) => {
	const orderItems = getCurrentOrderItems();
	const order = getCurrentOrder();
	const count = order.total_line_items_quantity;
	const [ isOpen, setIsOpen ] = useState( openModal );
	const [ startSplitShipment, setStartSplitShipment ] = useState( false );
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
	const storeCurrency = CurrencyFactory();
	const {
		getShipmentHazmat,
		setShipmentHazmat,
		applyHazmatToPackage,
		isHazmatSpecified,
	} = useHazmatState( currentShipmentId );
	const totalWeight = getShipmentTotalWeight();
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
	} );
	const {
		hasMissingPurchase,
		hasUnfinishedShipment,
		purchasedLabelsProductIds,
		hasPurchasedLabel,
		isPurchasing,
		isUpdatingStatus,
		getShipmentsWithoutLabel,
	} = labels;

	const account = useAccountState();

	const essentialDetails = useEssentialDetails();

	const orderFulfilled = ! hasMissingPurchase();

	const tabs = () => {
		let extraTabs: { name: string; title: string }[] = [];
		if (
			! orderFulfilled &&
			! isPurchasing &&
			! isUpdatingStatus &&
			count > 1
		) {
			extraTabs = [
				{
					name: 'edit',
					title: __( 'Split shipment', 'woocommerce-shipping' ),
				},
			];
		} else if ( hasUnfinishedShipment() ) {
			extraTabs = [];
		}
		if (
			getShipmentsWithoutLabel()?.length === 0 &&
			! isPurchasing &&
			! isUpdatingStatus
		) {
			extraTabs = [
				{
					name: 'new-shipment',
					title: __( 'Add shipment', 'woocommerce-shipping' ),
				},
			];
		}
		return [
			...Object.keys( shipments ).map( ( name ) => ( {
				name,
				title: getShipmentTitle(
					name,
					Object.keys( shipments ).length
				),
				icon: (
					<>
						{ getShipmentTitle(
							name,
							Object.keys( shipments ).length
						) }
						{ hasPurchasedLabel( true, true, name ) && (
							<Icon icon={ check } />
						) }
					</>
				),
				className: `shipment-tab-${ name }`,
			} ) ),
			...extraTabs,
		];
	};

	const ref = useRef( null );

	const labelsModalPersistKey = 'labels-modal';
	const labelsModalPersistValue = 'open';

	const selectPreviousTab = () => {
		if ( ref?.current ) {
			const previousTab = (
				ref.current as HTMLBaseElement
			 ).querySelector< HTMLButtonElement >(
				`.shipment-tab-${ currentShipmentId }`
			);
			previousTab?.click();
		}
	};

	const closeOrCancelShipmentEdit = () => {
		selectPreviousTab();
		setStartSplitShipment( false );
	};

	const openLabelsModal = () => {
		setIsOpen( true );

		setUrlParamValue( labelsModalPersistKey, labelsModalPersistValue );

		const tracksProps = {
			order_fulfilled: orderFulfilled,
			order_product_count: count,
		};
		recordEvent( 'order_create_shipping_label_clicked', tracksProps );
	};

	const createShipmentForExtraLabel = async () => {
		const newShipmentId = Object.keys( shipments ).length;
		const newShipment = orderItems.map( ( orderItem ) => ( {
			...orderItem,
			subItems: getSubItems( orderItem as ShipmentItem ),
		} ) );
		const updatedShipments = {
			...shipments,
			[ newShipmentId ]: newShipment,
		};

		setShipments( updatedShipments );
		setSelection( {
			...selections,
			[ newShipmentId ]: newShipment,
		} );
		setCurrentShipmentId( `${ newShipmentId }` );

		const selectedPackage = packages.getSelectedPackage();
		if ( selectedPackage ) {
			packages.setSelectedPackage( selectedPackage );
		}

		customs.updateCustomsItems();
	};
	const closeLabelsModal = () => {
		setIsOpen( false );

		deleteUrlParam( labelsModalPersistKey );
	};

	useEffect( () => {
		// Maybe persist the modal on page refresh.
		if (
			urlParamHasValue( labelsModalPersistKey, labelsModalPersistValue )
		) {
			setIsOpen( true );
		}
	}, [] );

	return (
		<LabelPurchaseContextProvider
			initialValue={ {
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
			} }
		>
			<Flex wrap className="wcshipping-shipping-label-meta-box">
				<FlexItem className="wcshipping-shipping-label-meta-box__content">
					<ShippingIcon />
					{ getShipmentSummaryText(
						orderFulfilled,
						purchasedLabelsProductIds().length,
						count
					) }
				</FlexItem>
				<FlexItem className="wcshipping-shipping-label-meta-box__button-container">
					<Button variant="primary" onClick={ openLabelsModal }>
						{ orderFulfilled
							? _n(
									'View or add shipment',
									'View or add shipments',
									count,
									'woocommerce-shipping'
							  )
							: _n(
									'Create shipping label',
									'Create shipping labels',
									count,
									'woocommerce-shipping'
							  ) }
					</Button>
				</FlexItem>
				{ isOpen && (
					<Modal
						overlayClassName="label-purchase-overlay"
						className="label-purchase-modal"
						onRequestClose={ closeLabelsModal }
						focusOnMount
						shouldCloseOnClickOutside={ false }
						shouldCloseOnEsc={ false }
						__experimentalHideHeader={ true }
						isDismissible={ false }
					>
						<ModalHeader
							closeModal={ closeLabelsModal }
							orderId={ orderId }
						/>
						<TabPanel
							ref={ ref }
							selectOnMove={ true }
							className="shipment-tabs"
							tabs={ tabs() }
							initialTabName={ currentShipmentId }
							onSelect={ ( tabName ) => {
								/**
								 * storing the previous tab name to prevent jumping to a new tab
								 * when the user clicks on the "Edit shipments" tab
								 */
								if ( tabName === 'edit' ) {
									setStartSplitShipment( true );
								} else if ( tabName === 'new-shipment' ) {
									createShipmentForExtraLabel();
								} else {
									setCurrentShipmentId( tabName );
								}
							} }
							children={ () => (
								<ShipmentContent
									items={ shipments[ currentShipmentId ] }
								/>
							) }
						/>
						{ startSplitShipment && (
							<SplitShipmentModal
								close={ closeOrCancelShipmentEdit }
							/>
						) }
					</Modal>
				) }
			</Flex>
		</LabelPurchaseContextProvider>
	);
};
