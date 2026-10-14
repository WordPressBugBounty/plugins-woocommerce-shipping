<?php
/**
 * Fulfillments Class Resolver.
 *
 * Creates namespaced class aliases for core WooCommerce fulfillment classes,
 * resolving the correct namespace based on WooCommerce version.
 *
 * This file must be required (not autoloaded) before any class that uses
 * the aliases is loaded.
 *
 * @package Automattic\WCShipping\Fulfillments
 */

defined( 'ABSPATH' ) || exit;

/**
 * Resolve fulfillment base classes to namespaced aliases.
 *
 * Checks for the new namespace first (WooCommerce 10.5+), then falls back
 * to the old Internal namespace (WooCommerce 10.1-10.4).
 *
 * Aliases created:
 * - Automattic\WCShipping\Fulfillments\Base\Fulfillment            → Fulfillment model
 * - Automattic\WCShipping\Fulfillments\Base\FulfillmentsDataStore  → FulfillmentsDataStore
 * - Automattic\WCShipping\Fulfillments\Base\FulfillmentsController → FulfillmentsController
 */
function wcshipping_resolve_fulfillment_classes(): void {
	// Idempotent: the aliases only need creating once, so a second call is a no-op.
	if ( class_exists( 'Automattic\WCShipping\Fulfillments\Base\Fulfillment', false ) ) {
		return;
	}

	// New namespace (after WOOPLUG-6249).
	if ( class_exists( 'Automattic\WooCommerce\Admin\Features\Fulfillments\Fulfillment' ) ) {
		class_alias( 'Automattic\WooCommerce\Admin\Features\Fulfillments\Fulfillment', 'Automattic\WCShipping\Fulfillments\Base\Fulfillment' );
		class_alias( 'Automattic\WooCommerce\Admin\Features\Fulfillments\DataStore\FulfillmentsDataStore', 'Automattic\WCShipping\Fulfillments\Base\FulfillmentsDataStore' );
		class_alias( 'Automattic\WooCommerce\Admin\Features\Fulfillments\FulfillmentsController', 'Automattic\WCShipping\Fulfillments\Base\FulfillmentsController' );
		return;
	}

	// Old namespace (WooCommerce 10.1-10.4).
	if ( class_exists( 'Automattic\WooCommerce\Internal\Fulfillments\Fulfillment' ) ) {
		class_alias( 'Automattic\WooCommerce\Internal\Fulfillments\Fulfillment', 'Automattic\WCShipping\Fulfillments\Base\Fulfillment' );
		class_alias( 'Automattic\WooCommerce\Internal\DataStores\Fulfillments\FulfillmentsDataStore', 'Automattic\WCShipping\Fulfillments\Base\FulfillmentsDataStore' );
		class_alias( 'Automattic\WooCommerce\Internal\Fulfillments\FulfillmentsController', 'Automattic\WCShipping\Fulfillments\Base\FulfillmentsController' );
		return;
	}
}

// Resolve on before_woocommerce_init, not plugins_loaded: the aliased core classes extend
// WC_Data / WC_Data_Store_WP, so autoloading them before WooCommerce is fully loaded can fatal on
// the missing parent (WOOSHIP-2410). This still runs before our own consumers, which load on
// before_woocommerce_init at the default priority.
add_action( 'before_woocommerce_init', 'wcshipping_resolve_fulfillment_classes', 5 );
