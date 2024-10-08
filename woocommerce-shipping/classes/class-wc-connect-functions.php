<?php

namespace Automattic\WCShipping\Connect;

use WC_Helper_Options;
use WP_Error;

class WC_Connect_Functions {
	/**
	 * Checks if the potentially expensive Shipping API requests should be sent
	 * based on the context in which they are initialized.
	 *
	 * @return bool true if the request can be sent, false otherwise
	 */
	public static function should_send_cart_api_request() {
		// Allow if this is an API call to store/cart endpoint. Provides compatibility with WooCommerce Blocks.
		return self::is_store_api_call() || ! (
			// Skip for carts loaded from session in the dashboard.
			( is_admin() && did_action( 'woocommerce_cart_loaded_from_session' ) ) ||
			// Skip during Jetpack API requests.
			( ! empty( $_SERVER['REQUEST_URI'] ) && false !== strpos( $_SERVER['REQUEST_URI'], 'jetpack/v4/' ) ) || // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
			// Skip during REST API or XMLRPC requests.
			( defined( 'REST_REQUEST' ) || defined( 'REST_API_REQUEST' ) || defined( 'XMLRPC_REQUEST' ) ) ||
			// Skip during Jetpack REST API proxy requests.
			( isset( $_GET['rest_route'] ) && isset( $_GET['_for'] ) && ( 'jetpack' === $_GET['_for'] ) ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended --- Ignoring this as no DB operation
		);
	}

	/**
	 * Get the WC Helper authorization information to use with WC Connect Server requests( e.g. site ID, access token).
	 *
	 * @return array|WP_Error
	 */
	public static function get_wc_helper_auth_info() {
		if ( class_exists( 'WC_Helper_Options' ) && is_callable( 'WC_Helper_Options::get' ) ) {
			$helper_auth_data = WC_Helper_Options::get( 'auth' );
		}

		// It's possible for WC_Helper_Options::get() to return false, throw error if this is the case.
		if ( ! $helper_auth_data ) {
			return new WP_Error(
				'missing_wccom_auth',
				__( 'WooCommerce Helper auth is missing', 'woocommerce-shipping' )
			);
		}
		return $helper_auth_data;
	}

	/**
	 * Check if we are currently in Rest API request for the wc/store/cart or wc/store/checkout API call.
	 *
	 * @return bool
	 */
	public static function is_store_api_call() {
		if ( ! WC()->is_rest_api_request() && empty( $GLOBALS['wp']->query_vars['rest_route'] ) ) {
			return false;
		}
		$rest_route = $GLOBALS['wp']->query_vars['rest_route'];

		// Use regex to check any route that has "wc/store" with any of these text : "cart", "checkout", or "batch"
		// Example : wc/store/v3/batch
		preg_match( '/wc\/store\/v[0-9]{1,}\/(batch|cart|checkout)/', $rest_route, $route_matches, PREG_OFFSET_CAPTURE );

		return ( ! empty( $route_matches ) );
	}

	/**
	 * Check if current page is a cart page or has woocommerce cart block.
	 *
	 * @return bool
	 */
	public static function is_cart() {
		if ( is_cart() || self::has_cart_block() ) {
			return true;
		}

		return false;
	}

	/**
	 * Check if current page is a checkout page or has woocommerce checkout block.
	 *
	 * @return bool
	 */
	public static function is_checkout() {
		if ( is_checkout() || self::has_checkout_block() ) {
			return true;
		}

		return false;
	}

	/**
	 * Check if current page has woocommerce cart block.
	 *
	 * @return bool
	 */
	public static function has_cart_block() {
		// To support WP < 5.0.0, we need to check if `has_block` exists first as has_block only being introduced on WP 5.0.0.
		if ( function_exists( 'has_block' ) ) {
			return has_block( 'woocommerce/cart' );
		}

		return false;
	}

	/**
	 * Check if current page has woocommerce checkout block.
	 *
	 * @return bool
	 */
	public static function has_checkout_block() {
		// To support WP < 5.0.0, we need to check if `has_block` exists first as has_block only being introduced on WP 5.0.0.
		if ( function_exists( 'has_block' ) ) {
			return has_block( 'woocommerce/checkout' );
		}

		return false;
	}

	/**
	 * Check if current page has woocommerce cart or checkout block.
	 *
	 * @return bool
	 */
	public static function has_cart_or_checkout_block() {
		if ( self::has_checkout_block() || self::has_cart_block() ) {
			return true;
		}

		return false;
	}

	/**
	 * Checks whether the current user has permissions to manage shipping labels.
	 *
	 * @return boolean
	 */
	public static function user_can_manage_labels() {
		/**
		 * @since 1.25.14
		 */
		return apply_filters( 'wcshipping_user_can_manage_labels', current_user_can( 'manage_woocommerce' ) || current_user_can( 'wcshipping_manage_labels' ) );
	}
}
