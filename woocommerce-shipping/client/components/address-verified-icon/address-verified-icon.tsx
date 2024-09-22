import React, { MouseEvent, MouseEventHandler } from 'react';
import { Button, Icon } from '@wordpress/components';
import { check, info } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';
import './styles.scss';

interface AddressVerifiedIconProps {
	isVerified: boolean;
	isFormChanged?: boolean;
	isFormValid?: boolean;
	errorMessage?: string;
	onClick?: MouseEventHandler;
	message?: string;
}

export const AddressVerifiedIcon = ( {
	isVerified,
	isFormChanged = false,
	isFormValid = true,
	errorMessage = __( 'Unverified address', 'woocommerce-shipping' ),
	onClick,
	message = __( 'Address verified', 'woocommerce-shipping' ),
}: AddressVerifiedIconProps ) => {
	if ( isVerified && ! isFormChanged && isFormValid ) {
		return (
			<span className="verification">
				<Icon icon={ check } size={ 16 } />
				{ message }
			</span>
		);
	}

	return (
		<span className="verification not-verified">
			{ /* If onclick is provided, it will be a button */ }
			{ onClick ? (
				<Button
					variant="link"
					icon={ info }
					onClick={ ( e: MouseEvent ) => onClick?.( e ) }
					title={ errorMessage }
				>
					{ errorMessage }
				</Button>
			) : (
				<>
					{ /* based on how the svg is implemented, 22 yields ~16 */ }
					<Icon icon={ info } size={ 22 } />
					{ errorMessage }
				</>
			) }
		</span>
	);
};
