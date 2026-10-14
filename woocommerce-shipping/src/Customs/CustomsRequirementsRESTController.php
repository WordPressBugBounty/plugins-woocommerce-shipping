<?php
/**
 * Class CustomsRequirementsRESTController
 *
 * @package Automattic\WCShipping
 */

namespace Automattic\WCShipping\Customs;

use Automattic\WCShipping\Connect\WC_Connect_API_Client;
use Automattic\WCShipping\Connect\WC_Connect_Logger;
use Automattic\WCShipping\OriginAddresses\OriginAddressService;
use Automattic\WCShipping\WCShippingRESTController;
use WC_Order;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

/**
 * Tells clients which customs data a shipment route requires.
 */
class CustomsRequirementsRESTController extends WCShippingRESTController {

	/**
	 * Route
	 *
	 * @var string
	 */
	protected $rest_base = 'label/customs-requirements';

	/**
	 * Connect Server API client.
	 *
	 * @var WC_Connect_API_Client
	 */
	private $api_client;

	/**
	 * Origin address service.
	 *
	 * @var OriginAddressService
	 */
	private $origin_address_service;

	/**
	 * Logger.
	 *
	 * @var WC_Connect_Logger
	 */
	private $logger;

	/**
	 * Class constructor.
	 *
	 * @param WC_Connect_API_Client $api_client             Connect Server API client.
	 * @param OriginAddressService  $origin_address_service Origin address service.
	 * @param WC_Connect_Logger     $logger                 Logger.
	 */
	public function __construct( WC_Connect_API_Client $api_client, OriginAddressService $origin_address_service, WC_Connect_Logger $logger ) {
		$this->api_client             = $api_client;
		$this->origin_address_service = $origin_address_service;
		$this->logger                 = $logger;
	}

	/**
	 * Register API routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'get_requirements' ),
					'permission_callback' => array( $this, 'ensure_rest_permission' ),
					'args'                => array(
						'order_id'  => array(
							'description' => __( 'Order whose shipping address is the destination.', 'woocommerce-shipping' ),
							'type'        => 'integer',
							'required'    => true,
						),
						'origin_id' => array(
							'description' => __( 'ID of the origin address the shipment leaves from. Defaults to the default origin, or the default return address for returns.', 'woocommerce-shipping' ),
							'type'        => 'string',
						),
						'is_return' => array(
							'description' => __( 'Whether this is a return shipment. When true, origin and destination are reversed, as in the rates endpoint.', 'woocommerce-shipping' ),
							'type'        => 'boolean',
							'default'     => false,
						),
					),
				),
			)
		);
	}

	/**
	 * Customs requirements for the requested route, from Connect Server.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_requirements( WP_REST_Request $request ) {
		// Only the live client and the E2E mock implement it; the base class does not.
		if ( ! method_exists( $this->api_client, 'get_customs_requirements' ) ) {
			return $this->unavailable();
		}

		$order = wc_get_order( (int) $request->get_param( 'order_id' ) );
		// Refunds are orders too, but have no shipping address.
		if ( ! $order instanceof WC_Order ) {
			return new WP_Error( 'order_not_found', __( 'Order not found.', 'woocommerce-shipping' ), array( 'status' => 404 ) );
		}

		$is_return = (bool) $request->get_param( 'is_return' );
		$origin    = $this->find_origin( $request->get_param( 'origin_id' ), $is_return );
		if ( null === $origin ) {
			return new WP_Error( 'invalid_origin_id', __( 'Unknown origin address.', 'woocommerce-shipping' ), array( 'status' => 400 ) );
		}

		$response = $this->api_client->get_customs_requirements(
			array(
				'origin'      => self::route_address( $origin ),
				'destination' => self::route_address( $order->get_address( 'shipping' ) ),
				'is_return'   => $is_return,
			)
		);

		// Log the cause only; the route addresses stay out of the log.
		if ( is_wp_error( $response ) ) {
			$this->logger->log(
				sprintf( 'Customs requirements request failed: %s %s', $response->get_error_code(), $response->get_error_message() ),
				__CLASS__
			);
			return $this->unavailable();
		}

		if ( ! is_object( $response ) || ! isset( $response->eu_product_ids_required ) || ! is_bool( $response->eu_product_ids_required ) ) {
			$this->logger->log( 'Customs requirements response has no boolean eu_product_ids_required.', __CLASS__ );
			return $this->unavailable();
		}

		return rest_ensure_response( array( 'eu_product_ids_required' => $response->eu_product_ids_required ) );
	}

	/**
	 * The fields Connect Server reads; the rest of the address stays on the site.
	 *
	 * @param array $address Address.
	 * @return array
	 */
	private static function route_address( array $address ): array {
		return array(
			'country'  => (string) ( $address['country'] ?? '' ),
			'state'    => (string) ( $address['state'] ?? '' ),
			'postcode' => (string) ( $address['postcode'] ?? '' ),
			'city'     => (string) ( $address['city'] ?? '' ),
		);
	}

	/**
	 * The origin the shipment leaves from.
	 *
	 * @param mixed $origin_id Requested origin ID, or null for the default.
	 * @param bool  $is_return Returns default to the default return address.
	 * @return array|null The origin, an empty array when the store has none, or null for an unknown ID.
	 */
	private function find_origin( $origin_id, bool $is_return ): ?array {
		$origins = $this->origin_address_service->get_origin_addresses();

		if ( null !== $origin_id && '' !== $origin_id ) {
			foreach ( $origins as $origin ) {
				if ( isset( $origin['id'] ) && (string) $origin['id'] === (string) $origin_id ) {
					return $origin;
				}
			}
			return null;
		}

		$default_key = $is_return ? 'default_return_address' : 'default_address';
		foreach ( array( $default_key, 'default_address' ) as $key ) {
			foreach ( $origins as $origin ) {
				if ( ! empty( $origin[ $key ] ) ) {
					return $origin;
				}
			}
		}

		return $origins[0] ?? array();
	}

	/**
	 * Error clients treat as "unknown", distinct from "not required".
	 *
	 * @return WP_Error
	 */
	private function unavailable(): WP_Error {
		return new WP_Error(
			'customs_requirements_unavailable',
			__( 'Customs requirements could not be loaded. Try again.', 'woocommerce-shipping' ),
			array( 'status' => 502 )
		);
	}
}
