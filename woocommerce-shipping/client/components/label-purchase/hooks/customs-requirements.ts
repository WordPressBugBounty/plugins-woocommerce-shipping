import { useEffect, useRef, useState } from 'react';
import apiFetch from '@wordpress/api-fetch';
import { getCustomsRequirementsPath } from 'data/routes';

export interface RouteAddress {
	country?: string;
	state?: string;
	postcode?: string;
	city?: string;
}

export interface OriginRouteAddress extends RouteAddress {
	id?: string;
}

interface CustomsRequirementsResponse {
	eu_product_ids_required: boolean;
}

// Every field the server reads, so an edited destination or a switched origin re-requests.
const getRouteKey = (
	origin: OriginRouteAddress | undefined,
	destination: RouteAddress | undefined,
	isReturn: boolean
) =>
	JSON.stringify(
		[ origin, destination ]
			.flatMap( ( address ) =>
				[
					address?.country,
					address?.state,
					address?.postcode,
					address?.city,
				].map( ( value ) => ( value ?? '' ).trim().toUpperCase() )
			)
			.concat( origin?.id ?? '', isReturn ? 'return' : '' )
	);

// Origins are limited to the US and its territories (ACCEPTED_USPS_ORIGIN_COUNTRIES),
// so a same-country route is domestic and never an EU import.
const isCrossBorder = (
	origin: RouteAddress | undefined,
	destination: RouteAddress | undefined
) => {
	const from = origin?.country?.trim().toUpperCase();
	const to = destination?.country?.trim().toUpperCase();
	return Boolean( from && to && from !== to );
};

/**
 * Whether the shipment route needs EU product identifiers, as decided by the server.
 * Answers are cached per route; while one is pending, `isLoading` is true.
 */
export const useCustomsRequirements = (
	orderId: number | undefined,
	origin: OriginRouteAddress | undefined,
	destination: RouteAddress | undefined,
	isReturn: boolean
): { isEUProductIdRequired: boolean; isLoading: boolean } => {
	const [ cache, setCache ] = useState< Record< string, boolean > >( {} );
	// Per route, like the cache, so one route's failure never settles or reopens another.
	const [ failedKeys, setFailedKeys ] = useState< Record< string, true > >(
		{}
	);
	const inFlight = useRef( new Set< string >() );

	const key = getRouteKey( origin, destination, isReturn );
	const canRequest =
		Boolean( orderId ) && isCrossBorder( origin, destination );
	const isCached = key in cache;

	useEffect( () => {
		if ( ! canRequest || isCached || inFlight.current.has( key ) ) {
			return;
		}
		// Coming back to a failed route retries it.
		setFailedKeys( ( { [ key ]: _failed, ...others } ) => others );
		inFlight.current.add( key );
		(
			apiFetch( {
				path: getCustomsRequirementsPath(),
				method: 'POST',
				// The server reads the destination from the order and the origin by ID.
				data: {
					order_id: orderId,
					...( origin?.id ? { origin_id: origin.id } : {} ),
					is_return: isReturn,
				},
			} ) as Promise< CustomsRequirementsResponse >
		 )
			.then( ( response ) => {
				// Stored under its own route, so a late answer never changes the current one.
				setCache( ( current ) => ( {
					...current,
					[ key ]: Boolean( response?.eu_product_ids_required ),
				} ) );
			} )
			.catch( ( error ) => {
				// eslint-disable-next-line no-console
				console.error(
					'[wcshipping] Could not load customs requirements',
					error
				);
				setFailedKeys( ( current ) => ( {
					...current,
					[ key ]: true,
				} ) );
			} )
			.finally( () => {
				inFlight.current.delete( key );
			} );
		// orderId is fixed per page; origin and destination are read through `key`.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ key, canRequest, isCached ] );

	return {
		isEUProductIdRequired: cache[ key ] ?? false,
		isLoading: canRequest && ! isCached && ! failedKeys[ key ],
	};
};
