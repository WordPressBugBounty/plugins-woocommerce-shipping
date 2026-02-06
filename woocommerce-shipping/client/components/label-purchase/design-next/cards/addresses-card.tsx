import {
	Button,
	CardDivider,
	Modal,
	Tooltip,
	__experimentalText as Text,
	__experimentalSpacer as Spacer,
	Card,
	CardBody,
	Flex,
	Spinner,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useCollapsibleCard } from '../internal/useCollapsibleCard';
import { addressStore } from 'data/address';
import { ADDRESS_TYPES } from 'data/constants';
import { dispatch, useSelect } from '@wordpress/data';
import { useLabelPurchaseContext } from 'context/label-purchase';
import {
	createInterpolateElement,
	useEffect,
	useRef,
	useState,
} from '@wordpress/element';
import {
	addressToString,
	areAddressesClose,
	composeName,
	formatAddressFields,
} from 'utils';
import { AddressStep } from 'components/address-step';
import { pencil as edit } from '@wordpress/icons';
import { Badge } from 'components/wp';
import { Destination, Order, OriginAddress } from 'types';
import { ShipFromSelectV2 } from '../internal/ship-from-select-v2';
import { withBoundaryNext } from 'components/HOC/error-boundary/with-boundary-next';
import { startCase, toLower } from 'lodash';
import Notification from 'components/notification';
import { Link } from 'components/wc';

const firstFilled = ( arr: ( string | undefined )[] ) => {
	for ( const item of arr ) {
		if ( item && item.trim().length > 0 ) {
			return item;
		}
	}
	return '';
};

const getAddressSummary = (
	originAddress: OriginAddress,
	destinationAddress: Destination
) => {
	return `${ firstFilled( [
		originAddress?.company,
		originAddress?.name,
		__( 'No name provided', 'woocommerce-shipping' ),
	] ) } (${
		originAddress
			? `${ startCase( toLower( originAddress.city ) ) }, ${
					originAddress.state
			  } ${ originAddress.postcode }`
			: __( 'No address provided', 'woocommerce-shipping' )
	}) → ${
		destinationAddress
			? `${ startCase( toLower( destinationAddress.city ) ) }, ${
					destinationAddress.state
			  } ${ destinationAddress.postcode }`
			: __( 'No address provided', 'woocommerce-shipping' )
	}`;
};

const AddressBlock = ( {
	address,
	children,
}: {
	address: Destination | OriginAddress;
	children?: React.ReactNode;
} ) => (
	<Flex direction={ 'column' } gap={ 1 }>
		<Text weight={ 500 }>
			{ address &&
				firstFilled( [
					address.company,
					composeName( {
						first_name:
							address.firstName ??
							( address as any ).first_name ?? // eslint-disable-line
							'',
						last_name:
							address.lastName ??
							( address as any ).last_name ?? // eslint-disable-line
							'',
						name: address.name ?? '',
					} ),
					__( 'No name provided', 'woocommerce-shipping' ),
				] ) }
		</Text>
		<Text weight={ 400 }>
			{ address &&
				firstFilled( [
					address.phone,
					__( 'No phone provided', 'woocommerce-shipping' ),
				] ) }
		</Text>
		<Flex
			direction={ 'row' }
			align="flex-end"
			justify="flex-start"
			gap={ 2 }
			wrap={ false }
		>
			<Text truncate numberOfLines={ 2 }>
				{ address
					? addressToString( address )
					: __( 'No address provided', 'woocommerce-shipping' ) }
			</Text>
			{ children }
		</Flex>
	</Flex>
);

const AddressesCardComponent = ( {
	order,
	destinationAddress,
}: {
	order: Order;
	destinationAddress: Destination | OriginAddress;
} ) => {
	const [ isAddressModalOpen, setIsAddressModalOpen ] = useState( false );
	const [ isRecipientAddressHovered, setIsRecipientAddressHovered ] =
		useState( false );

	const isDestinationAddressVerified = useSelect(
		( select ) =>
			select( addressStore ).getIsAddressVerified(
				ADDRESS_TYPES.DESTINATION
			),
		[]
	);
	const isDestinationAddressVerifying = useSelect(
		( select ) =>
			select( addressStore ).getIsAddressVerificationInProgress(
				ADDRESS_TYPES.DESTINATION
			),
		[]
	);
	const normalisedDestinationAddress = useSelect(
		( select ) =>
			select( addressStore ).getNormalizedAddress(
				ADDRESS_TYPES.DESTINATION
			),
		[]
	);
	const {
		rates: { updateRates },
		labels: { hasPurchasedLabel },
		shipment: { getShipmentOrigin, getShipmentPurchaseOrigin },
	} = useLabelPurchaseContext();

	const origins = useSelect(
		( select ) => select( addressStore ).getOriginAddresses(),
		[]
	);

	const originAddress = ! hasPurchasedLabel( false )
		? ( getShipmentOrigin() as OriginAddress )
		: ( getShipmentPurchaseOrigin() as OriginAddress );

	/**
	 * 1) We need to run the auto verification process only once but the useEffect runs on every render. So we use a ref
	 * to keep track of it, but if `normalisedDestinationAddress` is not defined yet, we want to allow it to run again
	 * that's why passing an empty dependency array wouldn't work, and we need to use a ref to keep track of the
	 * effective runs
	 *
	 * 2) We should also not run the auto verification process if the address modal is open.
	 *
	 */
	const hasAutoVerificationRunOnce = useRef( false );

	useEffect(
		() => {
			if ( hasAutoVerificationRunOnce.current || isAddressModalOpen ) {
				return;
			}

			// Check if the destination address is verified, if not, run it through the normalization process and then through areAddressesClose to determine if it's close enough to auto verify the address.
			const verifyShippingAddress = async () => {
				if ( isDestinationAddressVerified ) {
					return Promise.resolve();
				}

				await dispatch( addressStore ).verifyOrderShippingAddress( {
					orderId: String( order.id ),
				} );

				// If destination address is not verified, lets normalize it and check if it's close to the verified address and then auto verify it.
				if ( ! isDestinationAddressVerified ) {
					if ( ! normalisedDestinationAddress ) {
						return Promise.resolve();
					}

					// Set the flag to true so that the auto verification process runs only once.
					hasAutoVerificationRunOnce.current = true;

					const transformedNormalisedAddress = {
						...normalisedDestinationAddress,
					};

					const shouldAutoVerify = areAddressesClose(
						transformedNormalisedAddress,
						destinationAddress
					);

					if ( ! shouldAutoVerify ) {
						return Promise.resolve();
					}

					// If made it till here, verify the address.
					await dispatch( addressStore ).updateShipmentAddress(
						{
							orderId: order.id ? String( order.id ) : '',
							address: transformedNormalisedAddress,
							isVerified: true, // Either the address is verified or the normalized address is selected
						},
						ADDRESS_TYPES.DESTINATION
					);
				}

				return Promise.resolve();
			};

			verifyShippingAddress();
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps -- isAddressModalOpen is not a dependency
		[
			order,
			destinationAddress,
			isDestinationAddressVerified,
			normalisedDestinationAddress,
		]
	);

	const onCompleteCallback = () => {
		setIsAddressModalOpen( false );
		updateRates();
	};

	const { CardHeader, isOpen } = useCollapsibleCard( true );
	return (
		<Card>
			<CardHeader isBorderless iconSize={ 'small' }>
				<Flex direction={ 'row' } align="space-between">
					<Text weight={ 500 } size={ 15 }>
						{ __( 'Addresses', 'woocommerce-shipping' ) }
					</Text>
					{ isDestinationAddressVerifying ? (
						<Flex
							direction="row"
							align="center"
							justify="flex-end"
							gap={ 0 }
						>
							<div style={ { marginTop: -2 } }>
								<Spinner />
							</div>
							<Text as="span" weight={ 400 } size={ 12 }>
								{ __(
									'Validating address…',
									'woocommerce-shipping'
								) }
							</Text>
						</Flex>
					) : (
						! isDestinationAddressVerified && (
							<Badge intent="warning-alt">
								{ __(
									'Recipient address needs review',
									'woocommerce-shipping'
								) }{ ' ' }
							</Badge>
						)
					) }
					{ isDestinationAddressVerified && ! isOpen && (
						<Tooltip
							text={ getAddressSummary(
								originAddress,
								destinationAddress
							) }
						>
							<Text
								as="span"
								weight={ 400 }
								size={ 13 }
								style={ {
									maxWidth: '350px',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap',
								} }
							>
								{ getAddressSummary(
									originAddress,
									destinationAddress
								) }
							</Text>
						</Tooltip>
					) }
				</Flex>
			</CardHeader>
			{ isOpen && (
				<CardBody style={ { padding: 0, paddingBottom: 0 } }>
					<Flex direction="column" gap={ 0 } justify="space-between">
						<Spacer
							paddingX={ 6 }
							paddingBottom={ 4 }
							marginBottom={ 0 }
						>
							<Flex direction={ 'column' } gap={ 1 }>
								<Text
									size={ 11 }
									weight={ 500 }
									lineHeight={ '24px' }
									variant="muted"
									upperCase
								>
									{ __( 'Sender', 'woocommerce-shipping' ) }
								</Text>
								{ ! hasPurchasedLabel( false ) && (
									<>
										{ origins.length > 1 ? (
											<ShipFromSelectV2
												disabled={ hasPurchasedLabel(
													false
												) }
											/>
										) : (
											<AddressBlock
												address={ origins[ 0 ] }
											/>
										) }
									</>
								) }
								{ hasPurchasedLabel( false ) && (
									<AddressBlock
										address={
											originAddress as OriginAddress
										}
									/>
								) }
							</Flex>
						</Spacer>
						<Spacer marginBottom={ 0 } marginX={ 6 }>
							<CardDivider />
						</Spacer>
						{ ! isDestinationAddressVerified &&
							! isDestinationAddressVerifying && (
								<Spacer
									marginBottom={ 0 }
									marginTop={ 4 }
									marginX={ 6 }
								>
									<Notification type="warning">
										{ createInterpolateElement(
											__(
												'This address couldn’t be validated automatically. Please check the details and try again. <a>Review address</a>',
												'woocommerce-shipping'
											),
											{
												a: (
													<Link
														onClick={ () =>
															setIsAddressModalOpen(
																true
															)
														}
														type="wc-admin"
														href="#"
														role="button"
													>
														{ __(
															'Review address',
															'woocommerce-shipping'
														) }
													</Link>
												),
											}
										) }
									</Notification>
								</Spacer>
							) }
						<Spacer
							paddingX={ 6 }
							paddingTop={ 4 }
							paddingBottom={ 3 }
							marginBottom={ 3 }
							onMouseEnter={ () => {
								if ( hasPurchasedLabel( false ) ) {
									return;
								}
								setIsRecipientAddressHovered( true );
							} }
							onMouseLeave={ () => {
								setIsRecipientAddressHovered( false );
							} }
							style={ {
								background: isRecipientAddressHovered
									? '#F9F7F8'
									: 'transparent',
							} }
						>
							<Flex direction={ 'column' } gap={ 1 }>
								<Flex
									direction="row"
									align="flex-start"
									gap={ 4 }
								>
									<Text
										size={ 11 }
										lineHeight={ '24px' }
										weight={ 500 }
										variant="muted"
										upperCase
									>
										{ __(
											'Recipient',
											'woocommerce-shipping'
										) }
									</Text>
									{ isRecipientAddressHovered ? (
										<Button
											onClick={ () =>
												setIsAddressModalOpen( true )
											}
											icon={ edit }
											iconSize={ 24 }
											hidden={
												! isRecipientAddressHovered
											}
											title={ __(
												'Click to change address',
												'woocommerce-shipping'
											) }
											style={ {
												color: '#1E1E1E',
												height: 24,
												width: 24,
												minWidth: 24,
												padding: 0,
											} }
										/>
									) : (
										' '
									) }
								</Flex>
								{ ! hasPurchasedLabel( false ) && (
									<AddressBlock
										address={ destinationAddress }
									/>
								) }
								{ hasPurchasedLabel( false ) && (
									<AddressBlock
										address={ destinationAddress }
									/>
								) }
							</Flex>
						</Spacer>
					</Flex>
				</CardBody>
			) }
			{ isAddressModalOpen && (
				<Modal
					onRequestClose={ () => setIsAddressModalOpen( false ) }
					focusOnMount
					shouldCloseOnClickOutside={ false }
					size="medium"
					title={ __(
						'Edit destination address',
						'woocommerce-shipping'
					) }
				>
					<AddressStep
						type={ ADDRESS_TYPES.DESTINATION }
						address={ {
							id: '',
							...formatAddressFields(
								destinationAddress as
									| OriginAddress
									| Destination
							),
							firstName: '',
							lastName: '',
						} }
						isAdd={ false }
						onCompleteCallback={ onCompleteCallback }
						onCancelCallback={ () =>
							setIsAddressModalOpen( false )
						}
						orderId={ `${ order.id }` }
						originCountry={ getShipmentOrigin()?.country }
						nextDesign={ true }
					/>
				</Modal>
			) }
		</Card>
	);
};

export const AddressesCard = withBoundaryNext( AddressesCardComponent )();
