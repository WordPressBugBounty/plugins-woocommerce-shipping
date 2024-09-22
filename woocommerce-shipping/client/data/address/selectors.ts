import { AddressTypes, Destination } from 'types';
import { camelCaseKeys, composeAddress, composeName } from 'utils';
import { AddressState } from '../types';

export const getStoreOrigin = ( state: AddressState ) => {
	return state.storeOrigin;
};

export const getDestination = ( state: AddressState ): Destination => {
	return camelCaseKeys( state.destination?.address ?? {} );
};

export const getOriginAddresses = ( state: AddressState ) =>
	state.origin.addresses;

export const getIsAddressVerified = (
	state: AddressState,
	type: AddressTypes
) => {
	return state[ type ]?.isVerified ?? false;
};

export const getFormErrors = ( state: AddressState, type: AddressTypes ) => {
	return state[ type ]?.formErrors ?? {};
};

export const getNormalizedAddress = (
	state: AddressState,
	type: AddressTypes
) => {
	return state[ type ]?.normalizedAddress;
};

export const getSubmittedAddress = (
	state: AddressState,
	type: AddressTypes
) => {
	return state[ type ]?.submittedAddress;
};

export const getIsAddressTrivialNormalization = (
	state: AddressState,
	type: AddressTypes
) => {
	return state[ type ]?.isTrivialNormalization;
};

export const getAddressNeedsConfirmation = (
	state: AddressState,
	type: AddressTypes
) => {
	return state[ type ]?.addressNeedsConfirmation;
};

export const getPreparedDestination = ( state: AddressState ) => {
	/* eslint-disable camelcase, no-unused-vars */
	const {
		firstName,
		lastName,
		email,
		address1,
		address2,
		...rawDestination
	} = getDestination( state );
	const destination = {
		...rawDestination,
		name: composeName( {
			first_name: firstName,
			last_name: lastName,
			name: rawDestination.name,
		} ),
		address: composeAddress( {
			address_1: address1,
			address_2: address2,
			address: rawDestination.address,
		} ),
	};
	// eslint-disable-next-line no-unused-vars
	return destination;
};
