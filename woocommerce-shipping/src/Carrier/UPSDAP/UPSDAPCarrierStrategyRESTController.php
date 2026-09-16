<?php

namespace Automattic\WCShipping\Carrier\UPSDAP;

use Automattic\WCShipping\Connect\ConnectServerErrorCodes;
use Automattic\WCShipping\Exceptions\RESTRequestException;
use Automattic\WCShipping\WCShippingRESTController;
use WP_REST_Server;

class UPSDAPCarrierStrategyRESTController extends WCShippingRESTController {

	protected $rest_base = 'carrier-strategy/upsdap';

	public function __construct( UPSDAPCarrierStrategyService $upsdap_carrier_service ) {
		$this->upsdap_carrier_service = $upsdap_carrier_service;
	}

	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'update' ),
					'permission_callback' => array( $this, 'ensure_rest_permission' ),
				),
			)
		);
	}

	/**
	 * Error codes raised locally that indicate client validation errors (HTTP 400).
	 *
	 * Errors relayed from the Connect Server carry their own status instead;
	 * see `get_error_status_code()`.
	 */
	private const CLIENT_ERROR_CODES = array(
		'invalid_user_email',
	);

	/**
	 * Resolve the HTTP status to answer a failed strategy update with.
	 *
	 * The route's historical contract is narrow: `invalid_user_email` is a 400
	 * and every other failure a 500. Widening that is a change to a published
	 * error contract (`docs/api/README.md`), and clients that branch on the
	 * status band rather than the body `code` would see it - a relayed 401/403
	 * in particular reads as session expiry to most mobile HTTP layers.
	 *
	 * So relay exactly one status: the 403 the Connect Server answers with for
	 * `origin_address_limit_reached`, which is the merchant-actionable case
	 * this fix is about (WOOSHIP-2373). Everything else - including
	 * `MISSING_UPSDAP_TOS_ACCEPTANCE`, which is also on the passthrough list
	 * and also carries an upstream `status` - keeps the previous mapping.
	 *
	 * @param \WP_Error $error Error returned by the strategy service.
	 * @return int
	 */
	private function get_error_status_code( \WP_Error $error ): int {
		$code = $error->get_error_code();

		if ( ConnectServerErrorCodes::ORIGIN_ADDRESS_LIMIT_REACHED === $code ) {
			$data = $error->get_error_data();
			// Confirm the upstream status is the 403 we expect rather than
			// trusting whatever the decoded payload carried.
			if ( is_array( $data ) && isset( $data['status'] ) && 403 === $data['status'] ) {
				return 403;
			}
		}

		return in_array( $code, self::CLIENT_ERROR_CODES, true ) ? 400 : 500;
	}

	public function update( $request ) {
		try {
			[
				$origin,
				$confirmed,
			] = $this->get_and_check_request_params( $request, array( 'origin', 'confirmed' ) );
		} catch ( RESTRequestException $error ) {
			return rest_ensure_response( $error->get_error_response() );
		}

		$response = $this->upsdap_carrier_service->update_strategies( $origin, array( 'tos' => $confirmed ) );

		if ( is_wp_error( $response ) ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'code'    => $response->get_error_code(),
					'message' => $response->get_error_message(),
				),
				$this->get_error_status_code( $response )
			);
		}

		return rest_ensure_response(
			array(
				'success'   => true,
				'confirmed' => (bool) $confirmed,
			)
		);
	}
}
