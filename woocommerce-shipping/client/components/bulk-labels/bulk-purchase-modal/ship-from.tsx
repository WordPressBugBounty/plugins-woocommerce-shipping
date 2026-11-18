import { __ } from '@wordpress/i18n';
import { createInterpolateElement } from '@wordpress/element';
import { settingsPageUrl } from 'components/label-purchase/constants';
import { ShipFromDropdown } from 'components/label-purchase/details/ship-from-dropdown';
import { Link } from 'components/wc';
import { camelCaseKeys } from 'utils';
import type { ReactNode } from 'react';
import type { LocationResponse, OriginAddress } from 'types';

export interface ShipFromProps {
	origins: Partial< LocationResponse >[];
	selectedOriginId: string;
	onOriginChange: ( originId: string ) => void;
	isOriginResolving: boolean;
	/** True when the origins request failed, so there is no list to show. */
	hasOriginError: boolean;
}

export const ShipFrom = ( {
	origins,
	selectedOriginId,
	onOriginChange,
	isOriginResolving,
	hasOriginError,
}: ShipFromProps ) => {
	const originAddresses = origins.map( ( origin ) =>
		camelCaseKeys< Partial< LocationResponse >, OriginAddress >( origin )
	);
	const selectedOrigin = originAddresses.find(
		( origin ) => origin.id === selectedOriginId
	);

	let body: ReactNode;
	if ( isOriginResolving ) {
		body = (
			<span role="status">
				{ __( 'Loading ship from addresses…', 'woocommerce-shipping' ) }
			</span>
		);
	} else if ( hasOriginError ) {
		body = __(
			'The ship from addresses did not load.',
			'woocommerce-shipping'
		);
	} else if ( ! selectedOrigin ) {
		body = createInterpolateElement(
			__(
				'You have no verified origin address, <a>visit settings</a> to add one',
				'woocommerce-shipping'
			),
			{
				a: <Link href={ settingsPageUrl } type="wp-admin" />,
			}
		);
	} else {
		body = (
			<ShipFromDropdown
				origins={ originAddresses }
				selectedOrigin={ selectedOrigin }
				onSelect={ ( address ) => onOriginChange( address.id ) }
				isSelectable={ ( address ) => Boolean( address.isVerified ) }
			/>
		);
	}

	return (
		<section className="bulk-purchase-modal__sidebar-card">
			<h3 className="bulk-purchase-modal__sidebar-heading">
				{ __( 'Ship from', 'woocommerce-shipping' ) }
			</h3>
			<div className="bulk-purchase-modal__ship-from-body">{ body }</div>
		</section>
	);
};
