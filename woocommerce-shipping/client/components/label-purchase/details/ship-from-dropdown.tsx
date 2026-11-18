import { __ } from '@wordpress/i18n';
import { DropdownMenu, MenuGroup } from '@wordpress/components';
import { chevronDown, Icon } from '@wordpress/icons';
import { addressToString } from 'utils';
import { OriginAddress } from 'types';
import { ShipFromOption } from './ship-from-option';

interface ShipFromDropdownProps {
	origins: OriginAddress[];
	selectedOrigin?: OriginAddress;
	onSelect: ( address: OriginAddress ) => void;
	onEdit?: ( address: OriginAddress ) => void;
	isSelectable?: ( address: OriginAddress ) => boolean;
}

export const ShipFromDropdown = ( {
	origins,
	selectedOrigin,
	onSelect,
	onEdit,
	isSelectable,
}: ShipFromDropdownProps ) => (
	<DropdownMenu
		label={ __( 'Choose a ship from address', 'woocommerce-shipping' ) }
		text={ '' }
		icon={
			<>
				<span>{ addressToString( selectedOrigin ) }</span>
				<Icon icon={ chevronDown } />
			</>
		}
		className="origin-address-dropdown"
		variant="ship-from"
	>
		{ ( { onClose } ) => (
			<MenuGroup className="origin-address-options">
				{ origins.map( ( address ) => (
					<ShipFromOption
						key={ address.id }
						close={ onClose }
						address={ address }
						isSelected={ address.id === selectedOrigin?.id }
						onSelect={ onSelect }
						onEdit={ onEdit }
						disabled={
							isSelectable ? ! isSelectable( address ) : false
						}
					/>
				) ) }
			</MenuGroup>
		) }
	</DropdownMenu>
);
