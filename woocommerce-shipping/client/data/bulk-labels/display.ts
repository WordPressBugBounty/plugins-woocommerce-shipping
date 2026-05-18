/**
 * Helpers that turn raw orders shipping-context records into the
 * display-ready rows the bulk-purchase modal renders. The service /
 * cost / status / note fields are placeholders for now — WOOSHIP-2133
 * fills them in from the rate-quote and eligibility endpoints.
 *
 * Everything is deterministic on order_id so the layout doesn't shift
 * between renders.
 */

import { __, sprintf } from '@wordpress/i18n';
import type {
	AddressGrouping,
	BatchSummary,
	BulkPurchaseOrder,
	OrderShippingContextRecord,
	PackageDisplay,
} from './types';

type OrderShippingContext = OrderShippingContextRecord;

const PLACEHOLDER_PACKAGES = [
	{ name: __( 'QWER', 'woocommerce-shipping' ), dimensions: '8×9×10' },
	{
		name: __( 'Medium box', 'woocommerce-shipping' ),
		dimensions: '12×9×6',
	},
	{
		name: __( 'Padded mailer', 'woocommerce-shipping' ),
		dimensions: '10×7',
	},
];

const formatDimensions = (
	length: number,
	width: number,
	height: number
): string => {
	const parts = [ length, width, height ].filter( ( n ) => n > 0 );
	if ( parts.length === 0 ) {
		return '';
	}
	return parts.map( String ).join( '×' );
};

const placeholderPackageForIndex = ( index: number ) =>
	PLACEHOLDER_PACKAGES[ index % PLACEHOLDER_PACKAGES.length ];

/**
 * Display-ready package for an order. Uses the real selected package if
 * the order has one; otherwise falls back to a deterministic placeholder
 * so the layout stays stable across renders.
 */
const buildPackageDisplay = (
	order: OrderShippingContext,
	index: number
): PackageDisplay => {
	const fallback = placeholderPackageForIndex( index );
	const real = order.package;

	const totalWeight = order.total_weight ?? 0;
	const weightUnit = order.weight_unit ?? 'kg';

	if ( real ) {
		const dims = formatDimensions( real.length, real.width, real.height );
		return {
			name: real.name?.trim() || real.box_id?.trim() || fallback.name,
			dimensions: dims || fallback.dimensions,
			weight: real.weight > 0 ? real.weight : totalWeight,
			weight_unit: weightUnit,
		};
	}

	return {
		name: fallback.name,
		dimensions: fallback.dimensions,
		weight: totalWeight,
		weight_unit: weightUnit,
	};
};

const SERVICES = [
	{
		carrier: 'USPS',
		name: __( 'Priority Mail', 'woocommerce-shipping' ),
		estimate: __( '3 biz days', 'woocommerce-shipping' ),
	},
	{
		carrier: 'USPS',
		name: __( 'Ground Advantage', 'woocommerce-shipping' ),
		estimate: __( '3–4 biz days', 'woocommerce-shipping' ),
	},
];

const isInternational = ( order: OrderShippingContext ): boolean => {
	const country = order.destination?.country;
	return Boolean( country ) && country !== 'US';
};

/**
 * Find pairs of orders shipping to the same destination so the Notes
 * column can show "Same address as #X, #Y".
 */
const buildAddressGroups = (
	orders: OrderShippingContext[]
): Map< number, number[] > => {
	const groups = new Map< string, number[] >();
	const result = new Map< number, number[] >();

	orders.forEach( ( order ) => {
		const parts = [
			order.destination?.address_1?.trim() ?? '',
			order.destination?.city?.trim() ?? '',
			order.destination?.postcode?.trim() ?? '',
		];

		// Only group orders that share a full address. Earlier we joined
		// the parts and checked for an overall non-empty string, which
		// matched orders sharing only city + postcode (e.g. "|City|12345")
		// — that's not "the same address" and would mis-suggest combining
		// unrelated orders.
		if ( parts.some( ( p ) => p === '' ) ) {
			return;
		}

		const key = parts.join( '|' );

		const list = groups.get( key ) ?? [];
		list.push( order.order_id );
		groups.set( key, list );
	} );

	groups.forEach( ( ids ) => {
		if ( ids.length < 2 ) {
			return;
		}
		ids.forEach( ( id ) => {
			result.set(
				id,
				ids.filter( ( otherId ) => otherId !== id )
			);
		} );
	} );

	return result;
};

export const buildBulkPurchaseOrders = (
	orders: OrderShippingContext[]
): BulkPurchaseOrder[] => {
	const addressGroups = buildAddressGroups( orders );

	return orders.map( ( order, index ) => {
		const intl = isInternational( order );
		const groupedWith = addressGroups.get( order.order_id ) ?? [];
		const cost = 5.5 + ( ( order.order_id * 1.7 ) % 25 );
		const savings = 0.5 + ( ( order.order_id * 0.3 ) % 5 );

		let note: BulkPurchaseOrder[ 'note' ] = { type: null, text: '' };
		if ( intl ) {
			note = {
				type: 'warning',
				text: __(
					'International — customs form required',
					'woocommerce-shipping'
				),
			};
		} else if ( groupedWith.length > 0 ) {
			note = {
				type: 'info',
				text: sprintf(
					/* translators: %s: comma-separated list of order numbers, e.g. "#101, #102" */
					__( 'Same address as %s', 'woocommerce-shipping' ),
					groupedWith.map( ( id ) => `#${ id }` ).join( ', ' )
				),
			};
		}

		return {
			...order,
			package_display: buildPackageDisplay( order, index ),
			service: intl ? SERVICES[ 0 ] : SERVICES[ index % SERVICES.length ],
			cost: Math.round( cost * 100 ) / 100,
			cost_savings: intl ? 0 : Math.round( savings * 100 ) / 100,
			status: intl ? 'needs_fix' : 'ready',
			note,
		};
	} );
};

/**
 * Find the largest set of orders shipping to the exact same destination.
 * Powers the "X orders ship to the same address — combine?" suggestion.
 */
export const findLargestAddressGroup = (
	orders: OrderShippingContext[]
): AddressGrouping | null => {
	const groups = buildAddressGroups( orders );
	let best: number[] = [];
	let bestId: number | null = null;

	groups.forEach( ( others, id ) => {
		const fullGroup = [ id, ...others ];
		if ( fullGroup.length > best.length ) {
			best = fullGroup;
			bestId = id;
		}
	} );

	if ( bestId === null || best.length < 2 ) {
		return null;
	}

	const sample = orders.find( ( o ) => o.order_id === bestId );
	if ( ! sample ) {
		return null;
	}

	const cityState = [ sample.destination?.city, sample.destination?.state ]
		.filter( Boolean )
		.join( ', ' );

	return {
		customerName: sample.customer_name ?? '',
		cityState,
		orderIds: best.sort( ( a, b ) => a - b ),
	};
};

/**
 * Aggregated batch totals shown in the right-hand sidebar.
 */
export const buildBatchSummary = (
	orders: BulkPurchaseOrder[]
): BatchSummary => {
	const ready = orders.filter( ( o ) => o.status === 'ready' );
	const needsFix = orders.filter( ( o ) => o.status === 'needs_fix' );
	const subtotal = ready.reduce( ( sum, o ) => sum + o.cost, 0 );
	const discount = Math.round( subtotal * 0.1 * 100 ) / 100;
	const total = Math.round( ( subtotal - discount ) * 100 ) / 100;

	return {
		readyCount: ready.length,
		needsFixCount: needsFix.length,
		subtotal: Math.round( subtotal * 100 ) / 100,
		discount,
		total,
	};
};
