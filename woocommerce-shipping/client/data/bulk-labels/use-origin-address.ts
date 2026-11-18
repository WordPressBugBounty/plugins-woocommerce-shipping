import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { getOriginAddressesPath } from 'data/routes';
import type { LocationResponse } from 'types';

interface UseOriginAddressResult {
	isResolving: boolean;
	error: Error | null;
	/** The selected origin. Null until a verified origin is selected. */
	origin: Partial< LocationResponse > | null;
	/** Every saved origin address, verified or not, for the picker. */
	origins: Partial< LocationResponse >[];
	selectedOriginId: string;
	setSelectedOriginId: ( id: string ) => void;
}

/**
 * Raw origin row from GET /wcshipping/v1/address/origins. Includes
 * fields needed by both rate requests and purchase persistence.
 */
interface RawOriginAddress {
	id?: string;
	company?: string;
	name?: string;
	first_name?: string;
	last_name?: string;
	phone?: string;
	address_1?: string;
	address_2?: string;
	city?: string;
	state?: string;
	postcode?: string;
	country?: string;
	default_address?: boolean;
	is_verified?: boolean;
	is_approved?: boolean;
}

export const toOrigin = (
	raw: RawOriginAddress
): Partial< LocationResponse > => {
	const trimmedName = raw.name?.trim();
	const name =
		trimmedName && trimmedName.length > 0
			? trimmedName
			: [ raw.first_name, raw.last_name ]
					.map( ( part ) => part?.trim() )
					.filter( Boolean )
					.join( ' ' );

	return {
		id: raw.id,
		company: raw.company,
		name,
		phone: raw.phone,
		address_1: raw.address_1,
		address_2: raw.address_2,
		city: raw.city,
		state: raw.state,
		postcode: raw.postcode,
		country: raw.country,
		// An origin that was explicitly not approved cannot quote rates,
		// so it counts as unverified here.
		is_verified: Boolean( raw.is_verified ) && raw.is_approved !== false,
		default_address: raw.default_address,
	};
};

// The batch rate endpoint quotes the whole batch from a single origin.
export const useOriginAddress = (
	enabled: boolean
): UseOriginAddressResult => {
	const [ origins, setOrigins ] = useState< Partial< LocationResponse >[] >(
		[]
	);
	const [ selectedOriginId, setSelectedId ] = useState< string >( '' );
	const [ isResolving, setIsResolving ] = useState< boolean >( enabled );
	const [ error, setError ] = useState< Error | null >( null );

	useEffect( () => {
		if ( ! enabled ) {
			return;
		}

		let cancelled = false;
		setIsResolving( true );
		setError( null );

		apiFetch< RawOriginAddress[] >( { path: getOriginAddressesPath() } )
			.then( ( response ) => {
				if ( cancelled ) {
					return;
				}
				const list = Array.isArray( response ) ? response : [];
				const nextOrigins = list.map( toOrigin );
				// Only a verified origin can quote rates.
				const verified = nextOrigins.filter(
					( candidate ) => candidate.is_verified
				);
				const picked =
					verified.find(
						( candidate ) => candidate.default_address
					) ?? verified[ 0 ];
				setOrigins( nextOrigins );
				if ( ! picked ) {
					setSelectedId( '' );
					setError(
						list.length > 0
							? new Error(
									__(
										'No verified ship-from address. Verify an origin address in settings to quote rates.',
										'woocommerce-shipping'
									)
							  )
							: null
					);
					setIsResolving( false );
					return;
				}
				setSelectedId( picked.id ?? '' );
				setIsResolving( false );
			} )
			.catch( ( err: unknown ) => {
				if ( cancelled ) {
					return;
				}
				setOrigins( [] );
				setSelectedId( '' );
				setError(
					err instanceof Error
						? err
						: new Error( 'Failed to load the ship-from address.' )
				);
				setIsResolving( false );
			} );

		return () => {
			cancelled = true;
		};
	}, [ enabled ] );

	// Like the single-label picker, an unverified origin can't be selected.
	const setSelectedOriginId = useCallback(
		( id: string ) => {
			if (
				origins.some(
					( candidate ) =>
						candidate.id === id && candidate.is_verified
				)
			) {
				setSelectedId( id );
			}
		},
		[ origins ]
	);

	const origin = useMemo(
		() =>
			origins.find(
				( candidate ) => candidate.id === selectedOriginId
			) ?? null,
		[ origins, selectedOriginId ]
	);

	return useMemo(
		() => ( {
			isResolving,
			error,
			origin,
			origins,
			selectedOriginId,
			setSelectedOriginId,
		} ),
		[
			isResolving,
			error,
			origin,
			origins,
			selectedOriginId,
			setSelectedOriginId,
		]
	);
};
