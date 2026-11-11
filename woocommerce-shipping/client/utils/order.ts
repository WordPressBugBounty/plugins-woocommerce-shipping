import { getConfig } from './config';
import { Destination, LocationResponse, OriginAddress } from '../types';
import { groupBy } from 'lodash';
import { camelCaseKeys } from './common';
import { joinAddressLines, separateAddressLines } from './address-lines';

export const getCurrentOrder = () => {
	return getConfig().order;
};

export const getCurrentOrderItems = () => {
	return getConfig().order.line_items;
};

export const getCurrentOrderShipTo = () => {
	return camelCaseKeys( getConfig().order.shipping_address );
};

export const getIsDestinationVerified = () => {
	return getConfig().is_destination_verified;
};

export const getIsOriginVerified = () => {
	return getConfig().is_origin_verified;
};

/**
 * Builds the one-line street address, with the secondary line once.
 *
 * `address` wins over `address_1` when set. It may already hold the joined
 * line, or the unit more than once on orders saved before WOOSHIP-2515.
 *
 * @param address           Address fields.
 * @param address.address   Street line, possibly joined with `address_2`.
 * @param address.address_1 Street line 1.
 * @param address.address_2 Secondary line (apartment, suite, unit).
 * @return The joined street line.
 */
// eslint-disable-next-line camelcase
export const composeAddress = ( {
	address_1,
	address_2,
	address,
}: Pick< LocationResponse, 'address' | 'address_1' | 'address_2' > ) =>
	// eslint-disable-next-line camelcase, @typescript-eslint/prefer-nullish-coalescing -- an empty `address` falls back to `address_1`
	joinAddressLines( address || address_1 || '', address_2 ?? '' );

/**
 * Builds the street fields for a request to the server: line 1 in `address`
 * and the unit, once, in `address_2`.
 *
 * @param address           Address fields.
 * @param address.address   Street line, possibly joined with `address_2`.
 * @param address.address_1 Street line 1.
 * @param address.address_2 Secondary line (apartment, suite, unit).
 * @return `address` and `address_2` for the request body.
 */
// eslint-disable-next-line camelcase
export const composeStreetForRequest = ( {
	address_1,
	address_2,
	address,
}: Pick< LocationResponse, 'address' | 'address_1' | 'address_2' > ): {
	address: string;
	address_2?: string; // eslint-disable-line camelcase
} => {
	const [ line1, line2 ] = separateAddressLines(
		// eslint-disable-next-line camelcase, @typescript-eslint/prefer-nullish-coalescing -- an empty `address` falls back to `address_1`
		address || address_1 || '',
		address_2 ?? '' // eslint-disable-line camelcase
	);
	return { address: line1, address_2: line2 }; // eslint-disable-line camelcase
};

export const composeName = ( {
	first_name: firstName,
	last_name: lastName,
	name,
}: Pick< LocationResponse, 'name' | 'last_name' | 'first_name' > ) => {
	if ( name ) {
		return name;
	}
	return `${ firstName ?? '' } ${ lastName ?? '' }`;
};

export const addressToString = (
	address:
		| Pick<
				Destination | OriginAddress,
				| 'address'
				| 'address1'
				| 'address2'
				| 'city'
				| 'state'
				| 'postcode'
				| 'country'
		  >
		| null
		| undefined
) => {
	// Handle null or undefined address
	if ( ! address ) {
		return '';
	}

	const concatAddress = composeAddress( {
		address: address.address,
		address_1: address.address1,
		address_2: address.address2,
	} );

	const parts = [
		concatAddress,
		address.city || '',
		`${ address.state || '' } ${ address.postcode || '' }`.trim(),
		address.country || '',
	].filter( ( part ) => part ); // Remove empty parts

	return parts.join( ', ' );
};

export const formatAddressFields = (
	addressData: Destination | OriginAddress
) => {
	const { firstName, lastName, address, address2, address1, ...rest } =
		addressData;

	let formattedAddress = {
		...rest,
		address: composeAddress( {
			address,
			address_1: address1,
			address_2: address2,
		} ),
	};

	if ( firstName ) {
		// we may have a contact name but not a name, if first_name is present, construct a name
		formattedAddress = {
			...formattedAddress,
			name: composeName( {
				name: formattedAddress.name,
				first_name: firstName,
				last_name: lastName,
			} ),
		};
	}

	return formattedAddress;
};

export const getPurchasedLabels = () => {
	const { currentOrderLabels = [] } = getConfig().shippingLabelData;
	return groupBy( currentOrderLabels.map( camelCaseKeys ), 'id' );
};
