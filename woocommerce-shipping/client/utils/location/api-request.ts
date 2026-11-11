import { LocationResponse, OriginAddress, RequestAddress } from 'types';
import { snakeCaseKeys } from '../common';
import { composeName, composeStreetForRequest } from '../order';

export const mapAddressForRequest = (
	originAddress: OriginAddress
): RequestAddress => {
	const {
		company,
		phone,
		email,
		country,
		state,
		address_2,
		city,
		postcode,
		id,
	} = snakeCaseKeys< OriginAddress, LocationResponse >( originAddress );

	return {
		company,
		name: composeName( {
			first_name: originAddress.firstName,
			last_name: originAddress.lastName,
			name: originAddress.name,
		} ),
		phone,
		email,
		country,
		state,
		...composeStreetForRequest( {
			address_1: originAddress.address1,
			address_2,
			address: originAddress.address,
		} ),
		city,
		postcode,
		id,
	};
};
