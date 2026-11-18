import { type MouseEvent } from 'react';
import {
	__experimentalText as Text,
	Flex,
	MenuItem,
} from '@wordpress/components';
import { __, _x, sprintf } from '@wordpress/i18n';
import { addressToString } from 'utils';
import { OriginAddress } from 'types';
import { AddressVerifiedIcon } from '../../address-verified-icon';
import { check, Icon } from '@wordpress/icons';
import { Link } from 'components/wc';
import { ADDRESS_TYPES } from 'data/constants';

interface ShipFromOptionProps {
	address: OriginAddress;
	close: () => void;
	isSelected: boolean;
	onSelect: ( address: OriginAddress ) => void;
	onEdit?: ( address: OriginAddress ) => void;
	disabled?: boolean;
}

export const ShipFromOption = ( {
	address,
	close,
	isSelected,
	onSelect,
	onEdit,
	disabled,
}: ShipFromOptionProps ) => {
	return (
		<MenuItem
			onClick={ () => {
				if ( address.isVerified ) {
					onSelect( address );
				} else {
					onEdit?.( address );
				}
				close();
			} }
			disabled={ disabled }
			aria-label={ addressToString( address ) }
			isSelected={ isSelected }
			role="menuitemradio"
			suffix={ isSelected && <Icon icon={ check } size={ 20 } /> }
		>
			<Flex gap={ 2 } direction="column">
				<sub>
					{ ! address.defaultAddress
						? address.name ?? ''
						: sprintf(
								// translators: %1$s a user defined name for the address.
								_x(
									'%1$s (Default Origin)',
									'Origin address',
									'woocommerce-shipping'
								),
								address.name ?? ''
						  ) }
				</sub>
				<Text truncate={ false }>{ addressToString( address ) }</Text>
				{ onEdit && (
					<Link
						onClick={ ( e: MouseEvent ) => {
							e.stopPropagation();
							e.preventDefault();
							close();
							onEdit( address );
						} }
						type="wp-admin"
						href="#"
					>
						{ __( 'Edit', 'woocommerce-shipping' ) }
					</Link>
				) }
				{ Boolean( address.isVerified ) === false && (
					<AddressVerifiedIcon
						isVerified={ false }
						addressType={ ADDRESS_TYPES.ORIGIN }
						errorMessage={ __(
							'Verify to use this address',
							'woocommerce-shipping'
						) }
					/>
				) }
			</Flex>
		</MenuItem>
	);
};
