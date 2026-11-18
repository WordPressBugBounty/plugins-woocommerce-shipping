import React from 'react';
import { Button, Flex } from '@wordpress/components';
import { useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useLabelPurchaseContext } from 'context/label-purchase';
import { canPurchaseFromOrigin } from 'utils';
import { requestOriginAddressModal } from './constants';

interface GetRatesButtonProps {
	isBusy: boolean;
	disabled: boolean;
	onClick: ( userInitiated?: boolean ) => void;
}

export const GetRatesButton = ( {
	isBusy,
	disabled,
	onClick,
}: GetRatesButtonProps ) => {
	const {
		shipment: { getShipmentOrigin },
		rates: { availableRates },
	} = useLabelPurchaseContext();
	const canPurchase = canPurchaseFromOrigin( getShipmentOrigin() );
	const shouldGetRatesOnceVerified = useRef( false );

	// Rates can't be bought from an unverified origin, so get them once it is
	// verified on this shipment, unless some are already shown.
	useEffect( () => {
		if ( ! canPurchase ) {
			shouldGetRatesOnceVerified.current = true;
		} else if ( shouldGetRatesOnceVerified.current && ! isBusy ) {
			shouldGetRatesOnceVerified.current = false;
			if ( ! disabled && ! availableRates ) {
				// System-driven, like the tabs' own auto-fetch: keep notices.
				onClick( false );
			}
		}
	}, [ canPurchase, isBusy, disabled, availableRates, onClick ] );

	// The form is a prompt, not a gate: fetchRates still decides what to fetch.
	const handleClick = () => {
		if ( ! canPurchase ) {
			requestOriginAddressModal();
		}
		onClick();
	};

	return (
		<Flex
			direction="column"
			align="flex-start"
			className="get-rates-button-wrapper"
		>
			<Button
				onClick={ handleClick }
				isBusy={ isBusy }
				disabled={ disabled }
				variant="secondary"
				title={
					disabled
						? __(
								'Complete package selection/fields to get shipping rates',
								'woocommerce-shipping'
						  )
						: __( 'Get shipping rates', 'woocommerce-shipping' )
				}
			>
				{ __( 'Get shipping rates', 'woocommerce-shipping' ) }
			</Button>
		</Flex>
	);
};
