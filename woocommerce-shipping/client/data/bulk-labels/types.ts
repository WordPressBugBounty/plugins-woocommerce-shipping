/**
 * Type definitions for the bulk-labels data package.
 *
 * - `OrderShippingContextRecord` — one record returned by
 *   GET /wcshipping/v1/orders/shipping-context. Records for orders
 *   that couldn't be loaded carry only `order_id` + `error`;
 *   everything else is optional so callers can branch on `error`.
 * - `BulkPurchaseOrder` — what the modal actually renders: a record
 *   plus the placeholder fields (service / cost / status / note)
 *   that WOOSHIP-2133 will fill in for real.
 * - `PackageDisplay`, `BatchSummary`, `AddressGrouping` — small
 *   value types the display helpers and hooks return.
 */

import type { LocationResponse, Package } from 'types';

/**
 * The package selected for the order, sourced from the shipping
 * method's `wcshipping_packages` meta. Reuses the shared `Package`
 * shape for `id` and `name`, then layers on the snake-cased fields
 * the order meta actually carries (numeric dimensions and weight,
 * plus the box id that links back to the package definition).
 */
export type OrderSelectedPackage = Pick< Package, 'id' | 'name' > & {
	box_id: string;
	length: number;
	width: number;
	height: number;
	weight: number;
};

export interface OrderShippingContextRecord {
	order_id: number;
	order_number?: string;
	customer_name?: string;
	destination?: Partial< LocationResponse >;
	item_count?: number;
	total_weight?: number;
	weight_unit?: string;
	package?: OrderSelectedPackage | null;
	error: {
		code: string;
		message: string;
	} | null;
}

/**
 * Display-ready package summary for the table cell. Sourced from the
 * real `package` on the order when available, falls back to a
 * placeholder so the row still renders before the merchant has packed
 * the order.
 */
export interface PackageDisplay {
	name: string;
	dimensions: string;
	weight: number;
	weight_unit: string;
}

/**
 * A shipping-context record decorated with the table-display fields
 * that the modal renders. Service / cost / status / note are
 * placeholders for the shell — WOOSHIP-2133 replaces them with real
 * rate-quote and eligibility data.
 */
export interface BulkPurchaseOrder extends OrderShippingContextRecord {
	package_display: PackageDisplay;
	service: {
		carrier: string;
		name: string;
		estimate: string;
	};
	cost: number;
	cost_savings: number;
	status: 'ready' | 'needs_fix';
	note: {
		type: 'warning' | 'info' | null;
		text: string;
	};
}

/**
 * Aggregated batch totals for the right-hand sidebar.
 */
export interface BatchSummary {
	readyCount: number;
	needsFixCount: number;
	subtotal: number;
	discount: number;
	total: number;
}

/**
 * The largest set of orders shipping to the same destination, used
 * for the "combine into one package?" suggestion. `null` when no
 * group of 2+ exists.
 */
export interface AddressGrouping {
	customerName: string;
	cityState: string;
	orderIds: number[];
}
