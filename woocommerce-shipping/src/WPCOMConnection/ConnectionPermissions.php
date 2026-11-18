<?php
/**
 * Class ConnectionPermissions.
 *
 * @package Automattic\WCShipping
 */

namespace Automattic\WCShipping\WPCOMConnection;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Automattic\WCShipping\Connect\WC_Connect_Jetpack;

/**
 * Who may connect the store to WordPress.com and accept the Terms of Service.
 *
 * Both actions change store-wide state, so they need more than `manage_woocommerce`,
 * which WooCommerce also grants to Shop managers. `manage_options` is the capability
 * the Jetpack Connection package itself requires to connect a site.
 */
final class ConnectionPermissions {

	/**
	 * Capability required to connect the store or accept the Terms of Service.
	 */
	const CAPABILITY = 'manage_options';

	/**
	 * Whether the current user may register the store with WordPress.com.
	 *
	 * @return bool
	 */
	public static function user_can_connect_site() {
		return current_user_can( self::CAPABILITY );
	}

	/**
	 * Whether the current user may accept the Terms of Service on a connected store.
	 *
	 * Outside Jetpack development mode, the user must be the WordPress.com
	 * connection owner.
	 *
	 * @return bool
	 */
	public static function user_can_accept_tos() {
		if ( ! current_user_can( self::CAPABILITY ) ) {
			return false;
		}

		if ( defined( 'JETPACK_DEV_DEBUG' ) && true === JETPACK_DEV_DEBUG ) {
			return true;
		}

		return WC_Connect_Jetpack::is_current_user_connection_owner();
	}
}
