import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { camelCase, groupBy } from 'lodash';
import { LABEL_RATE_TYPE } from 'data/constants';
import { getBatchRatesPath } from 'data/routes';
import { getExtraOptionRate } from 'utils/rates';
import type { LocationResponse, Rate, SnakeToCamelCase } from 'types';
import type {
	BulkPurchaseOptions,
	OrderRate,
	OrderRateErrors,
	OrderRatesMap,
} from './types';

type OriginInput = Partial< LocationResponse >;

/**
 * One order's contribution to the batch rate request. The modal resolves
 * the effective (auto-assigned or manually-picked) package per order and
 * hands it here already normalized to numeric dimensions + weight.
 */
export interface RateRequestOrder {
	order_id: number;
	destination: Record< string, unknown >;
	package: {
		length: number;
		width: number;
		height: number;
		weight: number;
		box_id: string;
		is_letter: boolean;
	};
	/** UTC-midnight ISO string, sent as `shipment_options.label_date`. */
	ship_date: string;
}

interface UseOrderRatesResult {
	isResolving: boolean;
	/** Order ids with a rate request currently in flight. */
	resolvingIds: number[];
	error: Error | null;
	rates: OrderRatesMap;
	rateErrors: OrderRateErrors;
}

// Every order's single package is sent under this id, so the response is
// keyed by it. Mirrors the single-order flow's `default_box` convention.
const PACKAGE_ID = 'default_box';

type OrderRateBuckets = Record<
	( typeof LABEL_RATE_TYPE )[
		| 'DEFAULT'
		| 'SIGNATURE_REQUIRED'
		| 'ADULT_SIGNATURE_REQUIRED' ],
	OrderRate[]
>;
type OrderRateBucketsMap = Record< number, OrderRateBuckets >;

// `getExtraOptionRate` matches by service id only and memoizes on the
// array identity, so hand it one stable array per carrier.
const ratesByCarrierCache = new WeakMap<
	OrderRate[],
	Record< string, OrderRate[] >
>();

const EMPTY_RATES: OrderRateBucketsMap = {};
const EMPTY_ERRORS: OrderRateErrors = {};

/**
 * The single-order rate endpoint runs each address through the server's
 * `Address` sanitizer (which renames country→country_code,
 * state→state_code, address_1→address). The batch endpoint skips that
 * step and feeds the raw payload straight into `normalize_api_rate_request`,
 * which then reads `country_code`/`state_code`. So the batch caller must
 * pre-shape addresses or the server blanks the country and the Connect
 * server rejects the request ("origin.country must be one of […]").
 */
export const toRateAddress = (
	addr: Record< string, unknown > | null | undefined
): Record< string, unknown > => {
	const source = ( addr ?? {} ) as Record< string, unknown >;
	const { country, state, ...rest } = source;
	delete rest.id;
	delete rest.is_verified;
	delete rest.default_address;
	return {
		...rest,
		country_code: country ?? '',
		state_code: state ?? '',
	};
};

interface RawRate {
	rate_id?: string;
	service_id?: string;
	carrier_id?: string;
	shipment_id?: string;
	title?: string;
	rate?: number;
	retail_rate?: number;
	delivery_days?: number;
}

interface RawRateType {
	rates?: RawRate[];
}
interface RawErrorShape {
	code?: string;
	message?: string;
}
type RawPackageBucket = Record< string, RawRateType >;
// The endpoint returns either `{ error: {...} }` or a package-keyed map of
// rate buckets per order. Keep it loose and narrow at runtime.
type RawOrderEntry = unknown;

const getErrorShape = ( entry: RawOrderEntry ): RawErrorShape | null => {
	if ( ! entry || typeof entry !== 'object' ) {
		return null;
	}
	const maybe = ( entry as { error?: unknown } ).error;
	return maybe && typeof maybe === 'object'
		? ( maybe as RawErrorShape )
		: null;
};

const normalizeRates = ( rawRates: RawRate[] ): OrderRate[] =>
	rawRates
		.filter( ( r ): r is RawRate & { rate_id: string } =>
			Boolean( r.rate_id )
		)
		.map( ( r ): OrderRate => {
			const title = r.title?.trim();
			const rate = typeof r.rate === 'number' ? r.rate : 0;
			return {
				rateId: r.rate_id,
				serviceId: r.service_id ?? '',
				carrierId: ( r.carrier_id ?? '' ) as OrderRate[ 'carrierId' ],
				shipmentId: r.shipment_id ?? '',
				title:
					title && title.length > 0
						? title
						: r.service_id ?? r.rate_id,
				rate,
				retailRate:
					typeof r.retail_rate === 'number' ? r.retail_rate : rate,
				deliveryDays:
					typeof r.delivery_days === 'number'
						? r.delivery_days
						: undefined,
			};
		} );

const parseBatchResponse = (
	response: Record< string, RawOrderEntry > | undefined
): { rates: OrderRateBucketsMap; errors: OrderRateErrors } => {
	const rates: OrderRateBucketsMap = {};
	const errors: OrderRateErrors = {};
	if ( ! response ) {
		return { rates, errors };
	}

	for ( const [ key, entry ] of Object.entries( response ) ) {
		const orderId = Number( key );
		if ( ! Number.isFinite( orderId ) ) {
			continue;
		}

		const errorShape = getErrorShape( entry );
		if ( errorShape ) {
			const message = errorShape.message?.trim();
			errors[ orderId ] =
				message && message.length > 0
					? message
					: 'Could not get rates for this order.';
			continue;
		}

		if ( ! entry || typeof entry !== 'object' ) {
			continue;
		}

		// Response is keyed by the package id we sent; fall back to the
		// first package bucket if the server echoed a different id.
		const buckets = entry as Record< string, RawPackageBucket >;
		const packageBucket =
			buckets[ PACKAGE_ID ] ?? Object.values( buckets )[ 0 ];

		const bucketRates = ( type: keyof OrderRateBuckets ): OrderRate[] =>
			normalizeRates( packageBucket?.[ type ]?.rates ?? [] );
		rates[ orderId ] = {
			[ LABEL_RATE_TYPE.DEFAULT ]: bucketRates( LABEL_RATE_TYPE.DEFAULT ),
			[ LABEL_RATE_TYPE.SIGNATURE_REQUIRED ]: bucketRates(
				LABEL_RATE_TYPE.SIGNATURE_REQUIRED
			),
			[ LABEL_RATE_TYPE.ADULT_SIGNATURE_REQUIRED ]: bucketRates(
				LABEL_RATE_TYPE.ADULT_SIGNATURE_REQUIRED
			),
		};
	}

	return { rates, errors };
};

/**
 * Quote rates for every order in one POST to the batch rate endpoint,
 * using the shared origin and each order's resolved package. Refetches
 * only when the origin, a package/destination signature or the ship date
 * changes — not on unrelated re-renders.
 */
export const useOrderRates = (
	origin: OriginInput | null,
	orders: RateRequestOrder[],
	signatureOption: BulkPurchaseOptions[ 'signature' ]
): UseOrderRatesResult => {
	const [ rateBuckets, setRateBuckets ] =
		useState< OrderRateBucketsMap >( EMPTY_RATES );
	const [ serverRateErrors, setRateErrors ] =
		useState< OrderRateErrors >( EMPTY_ERRORS );
	const [ isResolving, setIsResolving ] = useState< boolean >( false );
	// Order ids whose rate request is currently in flight, so each row can
	// show a progress bar instead of a stale selected rate.
	const [ resolvingIds, setResolvingIds ] = useState< number[] >( [] );
	const [ error, setError ] = useState< Error | null >( null );

	// Quote-able orders need a real box (positive dims) and a destination.
	const quotable = useMemo(
		() =>
			orders.filter(
				( o ) =>
					o.package.length > 0 &&
					o.package.width > 0 &&
					o.package.height > 0
			),
		[ orders ]
	);

	// Per-order fingerprint: changes only when *this* order's box,
	// destination or ship date changes, so a single manual package edit
	// re-quotes that one order instead of the whole batch.
	const orderSig = ( o: RateRequestOrder ): string =>
		JSON.stringify( [
			o.package.length,
			o.package.width,
			o.package.height,
			o.package.weight,
			o.package.box_id,
			o.package.is_letter,
			o.ship_date,
			o.destination.postcode,
			o.destination.country,
			o.destination.state,
		] );

	// Origin affects every order's rate, so a changed origin must re-quote
	// all of them.
	const originSig = origin
		? JSON.stringify( [
				origin.id,
				origin.postcode,
				origin.country,
				origin.state,
				origin.city,
				origin.address_1,
				origin.address_2,
		  ] )
		: '';

	// Effect dependency — flips whenever the origin or *any* order's
	// fingerprint changes; the effect then diffs to fetch only what moved.
	const signature = useMemo( () => {
		if ( ! origin || quotable.length === 0 ) {
			return '';
		}
		return (
			originSig +
			'|' +
			quotable
				.map( ( o ) => `${ o.order_id }:${ orderSig( o ) }` )
				.join( ';' )
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- originSig/orderSig are pure derivations of the deps
	}, [ origin, quotable, originSig ] );

	// Latest payload + the per-order signatures last fetched, reachable
	// from the effect without churning its dependency on array identity.
	const payloadRef = useRef< {
		origin: OriginInput | null;
		quotable: RateRequestOrder[];
	} >( { origin, quotable } );
	payloadRef.current = { origin, quotable };

	const fetchedSigRef = useRef< Map< number, string > >( new Map() );
	const originSigRef = useRef< string | null >( null );

	useEffect( () => {
		const { origin: reqOrigin, quotable: reqOrders } = payloadRef.current;

		if ( ! reqOrigin || reqOrders.length === 0 ) {
			fetchedSigRef.current = new Map();
			originSigRef.current = null;
			setRateBuckets( EMPTY_RATES );
			setRateErrors( EMPTY_ERRORS );
			setIsResolving( false );
			setResolvingIds( [] );
			setError( null );
			return;
		}

		const currentIds = new Set( reqOrders.map( ( o ) => o.order_id ) );

		// Drop rows that are no longer quote-able (package cleared, order
		// removed) so stale rates can't linger.
		fetchedSigRef.current.forEach( ( _sig, id ) => {
			if ( ! currentIds.has( id ) ) {
				fetchedSigRef.current.delete( id );
			}
		} );
		const prune = < T >(
			map: Record< number, T >
		): Record< number, T > => {
			let changed = false;
			const next: Record< number, T > = {};
			Object.entries( map ).forEach( ( [ key, value ] ) => {
				if ( currentIds.has( Number( key ) ) ) {
					next[ Number( key ) ] = value;
				} else {
					changed = true;
				}
			} );
			return changed ? next : map;
		};
		setRateBuckets( ( prev ) => prune( prev ) );
		setRateErrors( ( prev ) => prune( prev ) );

		// A changed origin invalidates every quote; otherwise only the
		// orders whose own fingerprint moved (or that were never fetched).
		const originChanged =
			originSigRef.current !== null && originSigRef.current !== originSig;
		const toFetch = reqOrders.filter( ( o ) => {
			if ( originChanged ) {
				return true;
			}
			return fetchedSigRef.current.get( o.order_id ) !== orderSig( o );
		} );

		if ( toFetch.length === 0 ) {
			originSigRef.current = originSig;
			setIsResolving( false );
			setResolvingIds( [] );
			return;
		}

		let cancelled = false;
		setIsResolving( true );
		// Mark these orders in-flight so their rows show a progress bar
		// instead of a stale selected rate.
		setResolvingIds( toFetch.map( ( o ) => o.order_id ) );
		setError( null );

		const originAddress = toRateAddress(
			reqOrigin as unknown as Record< string, unknown >
		);
		// The rate-address contract requires a phone, but shipping-context
		// drops an empty shipping phone and we don't have the order's
		// billing phone client-side. For a *quote* (no label bought yet)
		// the store phone is an acceptable stand-in so carriers like USPS
		// don't reject the whole order.
		const fallbackPhone =
			typeof originAddress.phone === 'string' ? originAddress.phone : '';

		apiFetch< Record< string, RawOrderEntry > >( {
			path: getBatchRatesPath(),
			method: 'POST',
			data: {
				origin: originAddress,
				orders: toFetch.map( ( o ) => {
					const destination = toRateAddress( o.destination );
					const destPhone =
						typeof destination.phone === 'string' &&
						destination.phone.trim().length > 0
							? destination.phone
							: fallbackPhone;
					return {
						order_id: o.order_id,
						destination: { ...destination, phone: destPhone },
						shipment_options: { label_date: o.ship_date },
						packages: [
							{
								id: PACKAGE_ID,
								box_id: o.package.box_id,
								length: o.package.length,
								width: o.package.width,
								height: o.package.height,
								weight: o.package.weight,
								is_letter: o.package.is_letter,
							},
						],
					};
				} ),
			},
		} )
			.then( ( response ) => {
				if ( cancelled ) {
					return;
				}
				const parsed = parseBatchResponse( response );
				// Merge only the fetched orders; leave every other order's
				// existing rates untouched.
				setRateBuckets( ( prev ) => {
					const next = { ...prev };
					toFetch.forEach( ( o ) => {
						if ( o.order_id in parsed.rates ) {
							next[ o.order_id ] = parsed.rates[ o.order_id ];
						} else {
							delete next[ o.order_id ];
						}
					} );
					return next;
				} );
				setRateErrors( ( prev ) => {
					const next = { ...prev };
					toFetch.forEach( ( o ) => {
						if ( o.order_id in parsed.errors ) {
							next[ o.order_id ] = parsed.errors[ o.order_id ];
						} else {
							delete next[ o.order_id ];
						}
					} );
					return next;
				} );
				toFetch.forEach( ( o ) =>
					fetchedSigRef.current.set( o.order_id, orderSig( o ) )
				);
				originSigRef.current = originSig;
				setIsResolving( false );
				setResolvingIds( [] );
			} )
			.catch( ( err: unknown ) => {
				if ( cancelled ) {
					return;
				}
				const failure =
					err instanceof Error
						? err
						: new Error( 'Failed to fetch rates.' );
				// Invalidate exactly the orders we just re-quoted: their
				// inputs changed, so any prior rate is stale and must not
				// keep reading as "Ready". Orders that weren't part of
				// this request keep their valid rates (no full-table wipe).
				setRateBuckets( ( prev ) => {
					const next = { ...prev };
					toFetch.forEach( ( o ) => delete next[ o.order_id ] );
					return next;
				} );
				setRateErrors( ( prev ) => {
					const next = { ...prev };
					toFetch.forEach( ( o ) => {
						next[ o.order_id ] = failure.message;
					} );
					return next;
				} );
				// Drop their fingerprints so an unchanged signature still
				// retries instead of treating them as already fetched.
				toFetch.forEach( ( o ) =>
					fetchedSigRef.current.delete( o.order_id )
				);
				setError( failure );
				setIsResolving( false );
				setResolvingIds( [] );
			} );

		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` encodes every input the effect reads
	}, [ signature ] );

	// Every quote holds all signature buckets, so the option is applied
	// here and stays out of the fetch fingerprint.
	const { rates, rateErrors } = useMemo( () => {
		const selected: OrderRatesMap = {};
		const unavailable: OrderRateErrors = {};
		const bucketKey =
			signatureOption === 'adult'
				? LABEL_RATE_TYPE.ADULT_SIGNATURE_REQUIRED
				: LABEL_RATE_TYPE.SIGNATURE_REQUIRED;
		const type = camelCase( bucketKey ) as SnakeToCamelCase<
			typeof bucketKey
		>;
		Object.entries( rateBuckets ).forEach( ( [ key, buckets ] ) => {
			const orderId = Number( key );
			const baseRates = buckets[ LABEL_RATE_TYPE.DEFAULT ];
			if ( signatureOption === 'no' ) {
				selected[ orderId ] = baseRates;
				return;
			}
			const optionRates = buckets[ bucketKey ];
			let ratesByCarrier = ratesByCarrierCache.get( optionRates );
			if ( ! ratesByCarrier ) {
				ratesByCarrier = groupBy( optionRates, 'carrierId' );
				ratesByCarrierCache.set( optionRates, ratesByCarrier );
			}
			selected[ orderId ] = baseRates.flatMap( ( baseRate ) => {
				const carrierRates = ratesByCarrier[ baseRate.carrierId ];
				const signatureRate =
					carrierRates &&
					getExtraOptionRate(
						baseRate.serviceId,
						// Only the `OrderRate` fields of `Rate` are read.
						carrierRates as Rate[],
						baseRate.rate,
						type
					);
				return signatureRate
					? [ { ...signatureRate, parent: baseRate } ]
					: [];
			} );
			if ( baseRates.length > 0 && selected[ orderId ].length === 0 ) {
				unavailable[ orderId ] = __(
					'Selected signature option not available',
					'woocommerce-shipping'
				);
			}
		} );
		return {
			rates: selected,
			rateErrors: { ...unavailable, ...serverRateErrors },
		};
	}, [ rateBuckets, serverRateErrors, signatureOption ] );

	return useMemo(
		() => ( { isResolving, resolvingIds, error, rates, rateErrors } ),
		[ isResolving, resolvingIds, error, rates, rateErrors ]
	);
};
