<?php
/**
 * Class ConnectServerErrorCodes
 *
 * @package Automattic\WCShipping
 */

namespace Automattic\WCShipping\Connect;

// No direct access please.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Connect Server error codes the API clients must surface verbatim.
 *
 * By default a non-2xx response from the Connect Server is flattened into a
 * single `wcc_server_error_response` WP_Error, which throws away the server's
 * `code` and wraps its message in "Error: The WooCommerce Shipping server
 * returned: ...". That is fine for genuine server faults, but the Connect
 * Server also returns codes describing a client-side condition the merchant
 * (or support) can act on. Flattening those leaves the merchant staring at an
 * opaque 500 for a state they could otherwise resolve.
 *
 * Codes listed here keep their `code`, their untouched message, and their
 * upstream HTTP status, so callers can branch on them and show the merchant
 * what actually happened.
 */
final class ConnectServerErrorCodes {

	/**
	 * The merchant has not accepted the UPS DAP terms of service yet. Drives
	 * the UPS terms modal in the label purchase flow.
	 */
	public const MISSING_UPSDAP_TOS_ACCEPTANCE = 'missing_upsdap_terms_of_service_acceptance';

	/**
	 * The site is at the per-site origin-address cap. Returned as a 403 and
	 * not resolvable by the merchant: the message directs them to support.
	 *
	 * Only `POST /shipping/origin-addresses` can return it: the Connect Server
	 * throws it from `enforceOriginAddressCapAsync()`, reached solely through
	 * `getOrCreateOriginAddress()`, whose two call sites both sit inside
	 * `saveOriginAddressHandler`. On this side that endpoint has one caller,
	 * `send_tos_acceptance_for_origin_address()`, so the code surfaces only
	 * through the UPS DAP carrier-strategy route. The unpaid-debt purchase
	 * guard added by the same project uses a different code.
	 */
	public const ORIGIN_ADDRESS_LIMIT_REACHED = 'origin_address_limit_reached';

	/**
	 * Error codes that must reach the client with their code, message and
	 * status intact instead of being collapsed into a generic server error.
	 *
	 * This list is consulted in the shared request path, so a code added here
	 * changes the WP_Error for *every* Connect Server call that can return it -
	 * including the HTTP status, since `data['status']` is what
	 * `WP_REST_Server::error_to_response()` answers with. Before adding a code,
	 * check which Connect Server endpoints can emit it and confirm the routes
	 * relaying it are ones whose status may change.
	 */
	public const PASSTHROUGH = array(
		self::MISSING_UPSDAP_TOS_ACCEPTANCE,
		self::ORIGIN_ADDRESS_LIMIT_REACHED,
	);

	/**
	 * Whether a Connect Server error code should be surfaced verbatim.
	 *
	 * Accepts anything the response body carried, since the value comes off a
	 * decoded JSON payload and is not guaranteed to be a string.
	 *
	 * @param mixed $code Error code from the Connect Server response body.
	 * @return bool
	 */
	public static function should_pass_through( $code ): bool {
		return is_string( $code ) && in_array( $code, self::PASSTHROUGH, true );
	}

	/**
	 * The codes the client needs to branch on, keyed by name.
	 *
	 * Handed to the front end through `WCShipping_Config` so the codes are
	 * declared once, here, rather than duplicated as string literals in JS
	 * where they can drift from this list without anything noticing.
	 *
	 * @return array<string, string>
	 */
	public static function get_codes_for_js(): array {
		return array(
			'MISSING_UPSDAP_TOS_ACCEPTANCE' => self::MISSING_UPSDAP_TOS_ACCEPTANCE,
			'ORIGIN_ADDRESS_LIMIT_REACHED'  => self::ORIGIN_ADDRESS_LIMIT_REACHED,
		);
	}
}
