import {
	createInterpolateElement,
	useEffect,
	useState,
} from '@wordpress/element';

import {
	__experimentalDivider as Divider,
	__experimentalHeading as Heading,
	__experimentalText as Text,
	BaseControl,
	Button,
	Modal,
	Notice,
} from '@wordpress/components';
import { edit, help } from '@wordpress/icons';
import { __, sprintf } from '@wordpress/i18n';
import { dispatch, useSelect } from '@wordpress/data';

import {
	addressToString,
	formatAddressFields,
	getCurrentOrder,
	getOrderDestination,
} from 'utils';
import { addressStore } from 'data/address';
import { useLabelPurchaseContext } from 'components/label-purchase/context';
import { ADDRESS_TYPES, AddressStep } from 'components/address-step';
import { AddressVerifiedIcon } from 'components/address-verified-icon';
import { ControlledPopover } from 'components/controlled-popover';
import { withBoundary } from 'components/HOC';
import { ShipFromSelect } from './ship-from-select';
import { ShipmentCosts } from './shipment-costs';

export const ShipmentDetails = withBoundary( ( { order, address } ) => {
	const [ isAddressModalOpen, setIsAddressModalOpen ] = useState( false );
	const shippingType = getCurrentOrder().shipping_methods;

	const isDestinationVerified = useSelect(
		( select ) =>
			select( addressStore ).getIsAddressVerified( 'destination' ),
		[]
	);

	const {
		storeCurrency,
		rates: { getSelectedRate, updateRates },
		labels: {
			hasPurchasedLabel,
			getSelectedDestination,
			getSelectedOrigin,
			getCurrentShipmentLabel,
		},
		shipment: { getOrigin },
	} = useLabelPurchaseContext();
	useEffect( () => {
		const verifyShippingAddress = async () =>
			await dispatch( addressStore ).verifyOrderShippingAddress( {
				orderId: order.id,
			} );
		verifyShippingAddress();
	}, [ order ] );

	const discount = getSelectedRate()?.rate
		? getSelectedRate().rate.retailRate - getSelectedRate().rate.rate
		: 0;

	const onDestinationUpdate = () => {
		updateRates();
	};

	const currentLabel = getCurrentShipmentLabel();
	return (
		<div className="shipment-details">
			<Heading level={ 3 }>
				{ __( 'Order details', 'woocommerce-shipping' ) }
			</Heading>

			<BaseControl
				id="ship-from"
				label={ __( 'Ship from', 'woocommerce-shipping' ) }
			>
				{ ! hasPurchasedLabel( false ) && (
					<ShipFromSelect disabled={ hasPurchasedLabel( false ) } />
				) }
				{ hasPurchasedLabel( false ) && getSelectedOrigin() && (
					<Text>{ addressToString( getSelectedOrigin() ) }</Text>
				) }

				{ currentLabel?.isLegacy && (
					// Inaccurate ship from address
					<Text>**************************</Text>
				) }
			</BaseControl>

			<BaseControl
				id="ship-to"
				label={ __( 'Ship to', 'woocommerce-shipping' ) }
				className="purchase-label__ship-to"
			>
				{ ! hasPurchasedLabel( false ) && (
					<Text display="flex">
						<Button
							onClick={ () => setIsAddressModalOpen( true ) }
							icon={ edit }
							className="ship-to-edit-icon"
							title={ __(
								'Click to change address',
								'woocommerce-shipping'
							) }
						/>
						{ addressToString( address ) }
						<AddressVerifiedIcon
							isVerified={ isDestinationVerified }
							onClick={ () => setIsAddressModalOpen( true ) }
						></AddressVerifiedIcon>
					</Text>
				) }
				{ hasPurchasedLabel( false ) &&
					getSelectedDestination() &&
					addressToString( getSelectedDestination() ) }

				{ currentLabel?.isLegacy &&
					addressToString( getOrderDestination() ) }
			</BaseControl>

			<BaseControl
				id="no-of-items"
				label={ __( 'Number of items', 'woocommerce-shipping' ) }
			>
				<Text>{ order.total_line_items_quantity }</Text>
			</BaseControl>

			<BaseControl
				id="order-value"
				label={ __( 'Order value', 'woocommerce-shipping' ) }
			>
				<Text>{ storeCurrency.formatAmount( order.total ) }</Text>
			</BaseControl>

			<BaseControl
				id="shipping-type"
				label={ __( 'Shipping type', 'woocommerce-shipping' ) }
			>
				<Text>{ shippingType }</Text>
			</BaseControl>

			<BaseControl
				id="shipping-costs"
				label={ __( 'Shipping costs', 'woocommerce-shipping' ) }
			>
				<Text>
					{ storeCurrency.formatAmount( order.total_shipping ) }
				</Text>
			</BaseControl>

			<section
				className={ `shipment-details__costs${
					getSelectedRate() ?? currentLabel?.rate ? ' has-rates' : ''
				}` }
			>
				<Divider margin="8" />
				<Heading level={ 3 }>
					{ __( 'Shipment Costs', 'woocommerce-shipping' ) }
				</Heading>

				<ShipmentCosts
					hasPurchasedLabel={ hasPurchasedLabel( false ) }
					selectedRate={ getSelectedRate() }
					label={ currentLabel }
				/>

				{ Boolean( getSelectedRate() ) && Boolean( discount ) && (
					<>
						<Notice
							className="rate-discount"
							isDismissible={ false }
							status={
								hasPurchasedLabel( false ) ? 'success' : null
							}
						>
							{ createInterpolateElement(
								sprintf(
									hasPurchasedLabel( false )
										? // translators: %s is the discount amount
										  __(
												'You saved %s with WooCommerce Shipping. <i/>',
												'woocommerce-shipping'
										  )
										: // translators: %s is the discount amount
										  __(
												'You save %s with WooCommerce Shipping. <i/>',
												'woocommerce-shipping'
										  ),
									storeCurrency.formatAmount( discount )
								),
								{
									i: (
										<ControlledPopover
											icon={ help }
											withArrow={ false }
											trigger="hover"
										>
											{ __(
												'WooCommerce Shipping gives you access to commercial pricing, which is discounted over retail rates.',
												'woocommerce-shipping'
											) }
										</ControlledPopover>
									),
								}
							) }
						</Notice>
					</>
				) }
			</section>

			{ isAddressModalOpen && (
				<Modal
					className="edit-address-modal"
					onRequestClose={ () => setIsAddressModalOpen( false ) }
					focusOnMount
					shouldCloseOnClickOutside={ false }
					title={ __(
						'Edit destination address',
						'woocommerce-shipping'
					) }
				>
					<AddressStep
						type={ ADDRESS_TYPES.DESTINATION }
						address={ formatAddressFields( address ) }
						onCompleteCallback={ () =>
							setIsAddressModalOpen( false )
						}
						onUpdateCallback={ onDestinationUpdate }
						orderId={ `${ order.id }` }
						originCountry={ getOrigin()?.country }
					/>
				</Modal>
			) }
		</div>
	);
} )( 'ShipmentDetails' );
