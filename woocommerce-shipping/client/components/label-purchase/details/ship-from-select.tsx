import React from 'react';
import { __ } from '@wordpress/i18n';
import { Flex, Modal } from '@wordpress/components';
import {
	createInterpolateElement,
	useCallback,
	useEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { Link } from 'components/wc';
import { useSelect } from '@wordpress/data';
import { isEqual } from 'lodash';
import {
	camelCaseKeys,
	formatAddressFields,
	getConfig,
	snakeCaseKeys,
} from 'utils';
import { OriginAddress } from 'types';
import { OPEN_ORIGIN_ADDRESS_MODAL_EVENT, settingsPageUrl } from '../constants';
import { ShipFromDropdown } from './ship-from-dropdown';
import { useLabelPurchaseContext } from 'context/label-purchase';
import { AddressStep } from 'components/address-step';
import { ADDRESS_TYPES } from 'data/constants';
import { AddressVerifiedIcon } from 'components/address-verified-icon';
import { addressStore } from 'data/address';

export const ShipFromSelect = () => {
	const origins = useSelect(
		( select ) => select( addressStore ).getOriginAddresses(),
		[]
	);
	const {
		shipment: { getShipmentOrigin, setShipmentOrigin },
		rates: { updateRates },
	} = useLabelPurchaseContext();
	const prevOrigin = useRef( getShipmentOrigin() );

	// Re-quote once the edited origin is in state, not the pre-edit one.
	useEffect( () => {
		if ( ! isEqual( prevOrigin.current, getShipmentOrigin() ) ) {
			updateRates();
		}
		prevOrigin.current = getShipmentOrigin();
	}, [ getShipmentOrigin, updateRates, prevOrigin ] );

	const [ addressForEdit, openAddressForEdit ] = useState<
		OriginAddress | false
	>( false );

	const onCompleteCallback = useCallback(
		( address: OriginAddress ) => {
			setShipmentOrigin( address.id );
			openAddressForEdit( false );
		},
		[ setShipmentOrigin ]
	);

	const editShipmentOrigin = useCallback( () => {
		const origin = getShipmentOrigin();
		if ( origin?.id ) {
			openAddressForEdit( origin );
		}
	}, [ getShipmentOrigin ] );

	useEffect( () => {
		window.addEventListener(
			OPEN_ORIGIN_ADDRESS_MODAL_EVENT,
			editShipmentOrigin
		);
		return () =>
			window.removeEventListener(
				OPEN_ORIGIN_ADDRESS_MODAL_EVENT,
				editShipmentOrigin
			);
	}, [ editShipmentOrigin ] );

	if ( origins.length < 1 ) {
		return createInterpolateElement(
			__(
				'You have no verified origin address, <a>visit settings</a> to add one',
				'woocommerce-shipping'
			),
			{
				a: (
					<Link href={ settingsPageUrl } type="wp-admin">
						{ __( 'visit settings', 'woocommerce-shipping' ) }
					</Link>
				),
			}
		);
	}

	const noValidAddress = origins.every( ( address ) => ! address.isVerified );
	return (
		<>
			<Flex
				direction="column"
				gap={ 0 }
				justify="flex-start"
				align="flex-start"
			>
				<ShipFromDropdown
					origins={ origins }
					selectedOrigin={ getShipmentOrigin() }
					onSelect={ ( address ) => setShipmentOrigin( address.id ) }
					onEdit={ openAddressForEdit }
				/>
				{ noValidAddress && (
					<AddressVerifiedIcon
						isVerified={ false }
						onClick={ () => editShipmentOrigin() }
						errorMessage={ __(
							'Validate your address',
							'woocommerce-shipping'
						) }
						addressType={ ADDRESS_TYPES.ORIGIN }
					/>
				) }
			</Flex>

			{ addressForEdit && (
				<Modal
					className="edit-address-modal"
					onRequestClose={ () => openAddressForEdit( false ) }
					focusOnMount
					shouldCloseOnClickOutside={ false }
					title={ __( 'Edit address', 'woocommerce-shipping' ) }
				>
					<AddressStep
						type={ 'origin' }
						address={ camelCaseKeys(
							formatAddressFields(
								snakeCaseKeys( addressForEdit )
							)
						) }
						onCompleteCallback={ onCompleteCallback }
						onCancelCallback={ () => openAddressForEdit( false ) }
						orderId={ `${ getConfig().order.id }` }
						isAdd={ false }
					/>
				</Modal>
			) }
		</>
	);
};
