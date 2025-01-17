import React from 'react';
import { useEffect, useRef, useState } from '@wordpress/element';
import {
	__experimentalDivider as Divider,
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
} from 'utils';
import { ShippingIcon } from './shipping-icon';
import { ModalHeader } from './order-label-purchase-modal';
import { LabelPurchaseContextProvider } from './context';
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
		setShipmentOrigin,
		getShipmentOrigin,
		getShipmentDestination,
		revertLabelShipmentIdsToUpdate,
		labelShipmentIdsToUpdate,
		getShipmentPurchaseOrigin,
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
		getShipmentItems,
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
		getShipmentHazmat,
		updateRates,
		getShipmentOrigin,
		customs,
		shipments,
	} );

	const account = useAccountState();

	const essentialDetails = useEssentialDetails();

	const hasSplitShipments = Object.keys( shipments ).length > 1;
	const hasMissingPurchase = Object.keys( shipments ).some(
		( id ) => ! labels.hasPurchasedLabel( false, false, id )
	);
	// Get product ids for purchased labels.
	const purchasedLabelsProductIds: number[] = [];
	Object.keys( shipments ).forEach( ( id ) => {
		const ids = labels.getLabelProductIds( id );
		purchasedLabelsProductIds.push( ...ids );
	} );

	const orderFulfilled = ! hasMissingPurchase;

	const tabs = [
		...Object.keys( shipments ).map( ( name ) => ( {
			name,
			title: getShipmentTitle( name, Object.keys( shipments ).length ),
			icon: (
				<>
					{ getShipmentTitle(
						name,
						Object.keys( shipments ).length
					) }
					{ labels.hasPurchasedLabel( true, true, name ) && (
						<Icon icon={ check } />
					) }
				</>
			),
			className: `shipment-tab-${ name }`,
		} ) ),
		...( hasMissingPurchase
			? [
					{
						name: 'edit',
						title: __( 'Edit shipments', 'woocommerce-shipping' ),
					},
			  ]
			: [] ),
	];
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

	const closeLabelsModal = () => {
		setIsOpen( false );

		deleteUrlParam( labelsModalPersistKey );
	};

	const canHaveMultipleShipments = hasMissingPurchase && count > 1;

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
					setShipmentOrigin,
					getShipmentOrigin,
					getShipmentDestination,
					setCurrentShipmentId,
					revertLabelShipmentIdsToUpdate,
					labelShipmentIdsToUpdate,
					getShipmentPurchaseOrigin,
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
						purchasedLabelsProductIds.length,
						count
					) }
				</FlexItem>
				<FlexItem className="wcshipping-shipping-label-meta-box__button-container">
					<Button variant="primary" onClick={ openLabelsModal }>
						{ orderFulfilled
							? _n(
									'View purchased shipping label',
									'View purchased shipping labels',
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
						{ ! hasSplitShipments && (
							<>
								<Divider />

								<ShipmentContent items={ orderItems }>
									{ canHaveMultipleShipments && (
										<Button
											variant="tertiary"
											onClick={ () => {
												const tracksProps = {
													order_product_count: count,
												};
												recordEvent(
													'label_purchase_split_shipment_clicked',
													tracksProps
												);
												setStartSplitShipment(
													! startSplitShipment
												);
											} }
										>
											{ __(
												'Split shipment',
												'woocommerce-shipping'
											) }
										</Button>
									) }
								</ShipmentContent>
							</>
						) }
						{ hasSplitShipments && (
							<TabPanel
								ref={ ref }
								selectOnMove={ true }
								className="shipment-tabs"
								tabs={ tabs }
								initialTabName={ currentShipmentId }
								onSelect={ ( tabName ) => {
									/**
									 * storing the previous tab name to prevent jumping to a new tab
									 * when the user clicks on the "Edit shipments" tab
									 */
									if ( tabName === 'edit' ) {
										setStartSplitShipment( true );
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
						) }
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
