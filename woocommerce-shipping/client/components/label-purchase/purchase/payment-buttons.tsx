import React, { MouseEventHandler } from 'react';
import {
	__experimentalSpacer as Spacer,
	Button,
	CheckboxControl,
	Flex,
	FlexBlock,
	Notice,
} from '@wordpress/components';
import {
	createInterpolateElement,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { Link } from '@woocommerce/components';
import { __, sprintf } from '@wordpress/i18n';
import { uniq } from 'lodash';
import {
	getAddPaymentMethodURL,
	hasPaymentMethod,
	hasSelectedPaymentMethod,
	canManagePayments as canManagePaymentsUtil,
} from 'utils';
import { CreditCardButton } from './credit-card-button';
import { settingsPageUrl } from '../constants';
import { useLabelPurchaseContext } from '../context';
import { getShipmentTitle } from '../utils';
import { PaperSizeSelector } from '../paper-size';
import {
	Label,
	LabelPurchaseError,
	Order,
	RateWithParent,
	WPErrorRESTResponse,
} from 'types';
import { dispatch, select, useSelect } from '@wordpress/data';
import { labelPurchaseStore } from 'data/label-purchase';
import { EssentialDetails } from '../essential-details';
import { recordEvent } from 'utils/tracks';
import { LABEL_PURCHASE_STATUS } from 'data/constants';
import { UPSDAPTos } from 'components/carrier/upsdap/upsdap-tos';
import apiFetch from '@wordpress/api-fetch';
import { getCarrierStrategyPath } from 'data/routes';
import { mapAddressForRequest } from 'utils';

interface PaymentButtonsProps {
	order: Order;
}

export const PaymentButtons = ( { order }: PaymentButtonsProps ) => {
	const {
		shipment: { shipments, currentShipmentId, getShipmentOrigin },
		labels: {
			selectedLabelSize,
			requestLabelPurchase,
			isPurchasing,
			isUpdatingStatus,
			hasPurchasedLabel,
			getCurrentShipmentLabel,
		},
		packages: { getPackageForRequest },
		rates: { getSelectedRate, fetchRates, matchAndSelectRate },
		account: {
			accountSettings,
			canPurchase,
			setAccountCompleteOrder,
			getAccountCompleteOrder,
		},
	} = useLabelPurchaseContext();
	const lastOrderCompleted = getAccountCompleteOrder();
	const [ errors, setErrors ] = useState< LabelPurchaseError | null >( null );
	const [ markOrderAsCompleted, setMarkOrderAsCompleted ] =
		useState( lastOrderCompleted );
	const orderStatus = select( labelPurchaseStore ).getOrderStatus();

	const shipmentOrigin = getShipmentOrigin();

	const selectedRate = getSelectedRate();
	const [ showUPSDAPTos, setShowUPSDAPTos ] = useState( false );
	const [ isTOSConfirming, setIsTOSConfirming ] = useState( false );
	const canManagePayments = canManagePaymentsUtil( { accountSettings } );

	const isOrderCompleted = useMemo( () => {
		return order.status === 'completed' || orderStatus === 'completed';
	}, [ order, orderStatus ] );

	const resetErrors = () => {
		setErrors( null );
	};

	const purchaseAPIErrors = useSelect(
		( s ) =>
			s( labelPurchaseStore ).getPurchaseAPIError( currentShipmentId ),
		[ currentShipmentId ]
	);

	useEffect( () => {
		if ( purchaseAPIErrors ) {
			setErrors( purchaseAPIErrors );
		}
	}, [ purchaseAPIErrors ] );

	useLayoutEffect( () => {
		if ( isPurchasing ) {
			document
				.querySelector(
					'.label-purchase-modal .components-modal__content'
				)
				?.scrollTo( {
					left: 0,
					top: 0,
					behavior: 'smooth',
				} );
		}
	}, [ isPurchasing ] );

	const shipmentsCount = Object.keys( shipments ).length;
	const purchaseButtonLabel =
		shipmentsCount > 1
			? sprintf(
					// translators: %s is the shipment title as Shipment 1/2, Shipment 2/2, etc.
					__( 'Purchase %s', 'woocommerce-shipping' ),
					getShipmentTitle( currentShipmentId, shipmentsCount )
			  )
			: __( 'Purchase label', 'woocommerce-shipping' );

	const addCardButtonDescription = (
		onAddCard: MouseEventHandler< HTMLAnchorElement >
	) =>
		createInterpolateElement(
			__(
				'To print this shipping label, <a>add a credit card to your account</a>.',
				'woocommerce-shipping'
			),
			{
				a: (
					<Link
						onClick={ onAddCard }
						type="external"
						href="#"
						role="button"
					>
						{ ' ' }
					</Link>
				),
			}
		);
	const chooseCardButtonDescription = (
		onChooseCard: MouseEventHandler< HTMLAnchorElement >
	) =>
		createInterpolateElement(
			__(
				'To print this shipping label, <a>choose a credit card to add to your account</a>.',
				'woocommerce-shipping'
			),
			{
				a: (
					<Link
						onClick={ onChooseCard }
						type="internal"
						href="#"
						role="button"
					>
						{ ' ' }
					</Link>
				),
			}
		);

	const updateOrderStatus = useCallback(
		async ( label?: Label ) => {
			if (
				markOrderAsCompleted &&
				label?.status === LABEL_PURCHASE_STATUS.PURCHASED
			) {
				await dispatch( labelPurchaseStore ).updateOrderStatus( {
					orderId: `${ order.id }`,
					status: 'completed',
				} );
			}
		},
		[ markOrderAsCompleted, order.id ]
	);

	useEffect( () => {
		if ( ! isPurchasing && ! isUpdatingStatus && ! errors ) {
			( async () => {
				await updateOrderStatus( getCurrentShipmentLabel() );
			} )();
		}
	}, [
		isPurchasing,
		isUpdatingStatus,
		errors,
		getCurrentShipmentLabel,
		updateOrderStatus,
	] );

	useEffect( () => {
		if ( orderStatus === 'completed' ) {
			if ( window.parent?.document ) {
				const orderStatusSelect = window.parent.document.querySelector(
					'#order_data #order_status'
				)!;
				if ( orderStatusSelect ) {
					( orderStatusSelect as HTMLSelectElement ).value =
						'wc-completed';
					orderStatusSelect.dispatchEvent(
						new Event( 'change', { bubbles: true } )
					);
				}
			}
		}
	}, [ orderStatus ] );

	const purchaseLabel = async ( rate: RateWithParent ) => {
		resetErrors();
		if ( hasPurchasedLabel( false ) ) {
			return;
		}

		const tracksProperties = {
			order_product_count: order.line_items.length,
			shipment_product_count: shipments[ currentShipmentId ].length,
			order_shipping_total: order.total_shipping,
			order_total: order.total,
			order_shipping_method: order.shipping_methods,
			mark_order_as_completed: markOrderAsCompleted,
			selected_label_size: selectedLabelSize.key,
			order_destination_country: order.shipping_address.country,
			carrier_id: getSelectedRate()?.rate.carrierId,
			rate: getSelectedRate()?.rate.rate,
			list_rate: getSelectedRate()?.rate.listRate,
			retail_rate: getSelectedRate()?.rate.retailRate,
			service_id: getSelectedRate()?.rate.serviceId,
		};
		recordEvent(
			'label_purchase_purchase_shipping_label_clicked',
			tracksProperties
		);
		resetErrors();
		try {
			await requestLabelPurchase( order.id, rate );
			const currentShipmentLabel =
				select( labelPurchaseStore ).getPurchasedLabel(
					currentShipmentId
				);
			if ( ! errors ) {
				await updateOrderStatus( currentShipmentLabel );
			}
		} catch ( e ) {
			const error = e as unknown as WPErrorRESTResponse &
				LabelPurchaseError;

			if ( error.code === 'missing_upsdap_terms_of_service_acceptance' ) {
				setShowUPSDAPTos( true );
				return;
			}

			// If it's not the UPS DAP TOS error, treat it as a standard LabelPurchaseError.
			setErrors( {
				cause: 'purchase_error',
				message: error.message,
				actions: error.actions,
			} );
		}
	};

	// Add handler for UPS DAP TOS.
	const handleUPSDAPTos = {
		close: () => {
			setShowUPSDAPTos( false );
			setErrors( {
				cause: 'carrier_error',
				message: [
					__(
						'You must agree to the UPS® Terms and Conditions to purchase a UPS® label.',
						'woocommerce-shipping'
					),
				],
			} );
		},
		confirm: async ( confirmed: boolean ) => {
			resetErrors();

			try {
				const response: { success: boolean } = await apiFetch( {
					path: getCarrierStrategyPath( 'upsdap' ),
					method: 'POST',
					data: {
						origin: mapAddressForRequest( shipmentOrigin ),
						confirmed,
					},
				} );

				if ( ! response.success ) {
					// Skip to the `catch` clause to display the error.
					throw new Error(
						__(
							'We were unable to update your acceptance of the UPS® Terms and Conditions. Please try again later or contact WooCommerce support if the issue persists.',
							'woocommerce-shipping'
						)
					);
				}

				// Fetch rates again after successful TOS acceptance.
				// We do this to re-create shipments using the newly created carrier account.
				await fetchRates( getPackageForRequest() );

				setShowUPSDAPTos( false );

				/**
				 * Now that we've refetched rates, we need to reselect the rate that was previously selected.
				 * We can't purchase the UPS rate that was previously selected because it was created without TOS acceptance.
				 */
				if ( selectedRate ) {
					const switchedRate = matchAndSelectRate( selectedRate );
					if ( switchedRate ) {
						purchaseLabel( switchedRate );
					}
				}
			} catch ( error ) {
				setErrors( {
					cause: 'carrier_error',
					message: [
						__(
							'We were unable to update your acceptance of the UPS® Terms and Conditions. Please try again later or contact WooCommerce support if the issue persists.',
							'woocommerce-shipping'
						),
					],
				} );
			} finally {
				setIsTOSConfirming( false );
			}
		},
	};

	const markAsCompletedCheckboxHandler = () => {
		// If the checkbox is checked, set the markOrderAsCompleted state to true
		// and set the accountCompleteOrder state to true.
		setMarkOrderAsCompleted( ! markOrderAsCompleted );
		setAccountCompleteOrder( ! lastOrderCompleted );
	};

	// Reset errors when shipment origin or rate change
	useEffect( resetErrors, [ shipmentOrigin, selectedRate ] );

	return (
		<>
			{ showUPSDAPTos && (
				<UPSDAPTos
					close={ handleUPSDAPTos.close }
					confirm={ handleUPSDAPTos.confirm }
					shipmentOrigin={ shipmentOrigin }
					error={ errors }
					isConfirming={ isTOSConfirming }
					setIsConfirming={ setIsTOSConfirming }
				/>
			) }
			<Flex className="purchase-label-buttons" direction="column">
				{ canPurchase() && (
					<>
						<Flex>
							<PaperSizeSelector
								disabled={ hasPurchasedLabel( false ) }
							/>
							<Button
								variant="primary"
								disabled={
									! selectedRate ||
									isPurchasing ||
									isUpdatingStatus ||
									hasPurchasedLabel( false ) ||
									! shipmentOrigin.isVerified
								}
								onClick={ () => {
									const rate = getSelectedRate();
									if ( rate ) {
										purchaseLabel( rate );
									}
								} }
								isBusy={ isPurchasing }
								aria-disabled={
									! selectedRate ||
									isPurchasing ||
									hasPurchasedLabel( false ) ||
									! shipmentOrigin.isVerified
								}
							>
								{ purchaseButtonLabel }
							</Button>
						</Flex>
						<FlexBlock>
							<EssentialDetails />
						</FlexBlock>
						{ ! hasPurchasedLabel( false ) &&
							! isOrderCompleted && (
								<Flex>
									<CheckboxControl
										label={ __(
											'After purchasing a label, mark this order as complete and notify the customer',
											'woocommerce-shipping'
										) }
										onChange={
											markAsCompletedCheckboxHandler
										}
										checked={ lastOrderCompleted }
										disabled={ isPurchasing }
										aria-disabled={ isPurchasing }
										className="purchase-label-mark-order-complete"
									/>
								</Flex>
							) }
					</>
				) }
				{ ! hasPaymentMethod( { accountSettings } ) && (
					<>
						{ canManagePayments ? (
							<CreditCardButton
								url={ getAddPaymentMethodURL() }
								buttonLabel={ __(
									'Add credit card',
									'woocommerce-shipping'
								) }
								buttonDescription={ addCardButtonDescription }
							/>
						) : (
							<Notice status="warning" isDismissible={ false }>
								{ __(
									'Please contact your site administrator to add a payment method.',
									'woocommerce-shipping'
								) }
							</Notice>
						) }
					</>
				) }
				{ hasPaymentMethod( { accountSettings } ) &&
					! hasSelectedPaymentMethod( { accountSettings } ) && (
						<>
							{ canManagePayments ? (
								<CreditCardButton
									url={ settingsPageUrl }
									buttonLabel={ __(
										'Choose credit card',
										'woocommerce-shipping'
									) }
									buttonDescription={
										chooseCardButtonDescription
									}
								/>
							) : (
								<Notice
									status="warning"
									isDismissible={ false }
								>
									{ __(
										'Please contact your site administrator to set a default payment method.',
										'woocommerce-shipping'
									) }
								</Notice>
							) }
						</>
					) }
			</Flex>
			<Spacer />
			{ errors && Object.keys( errors ).length > 0 && (
				<Notice
					status="error"
					actions={ uniq( errors.actions ) }
					onDismiss={ resetErrors }
				>
					{ uniq( errors.message ).map( ( m, index ) => (
						<p key={ index }>{ m }</p>
					) ) }
				</Notice>
			) }
		</>
	);
};
