<?php
namespace Automattic\WCShipping\Integrations;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use Automattic\WCShipping\Connect\WC_Connect_Functions;
use Automattic\WCShipping\Connect\WC_Connect_Options;
use Automattic\WCShipping\WCShippingRESTController;
use Automattic\WCShipping\WPCOMConnection\ConnectionPermissions;
use WP_Error;
use WP_REST_Server;

class TosRESTController extends WCShippingRESTController {

	protected $rest_base = 'tos';
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			$this->rest_base,
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'post' ),
					'permission_callback' => array( $this, 'check_permission' ),
				),
			)
		);
	}

	/**
	 * Only the WordPress.com connection owner may accept the Terms of Service.
	 *
	 * @return bool|WP_Error
	 */
	public function check_permission() {
		if ( WC_Connect_Functions::user_can_manage_labels() && ConnectionPermissions::user_can_accept_tos() ) {
			return true;
		}

		return new WP_Error(
			'rest_forbidden',
			__( 'Only the WordPress.com connection owner can accept the Terms of Service.', 'woocommerce-shipping' ),
			array( 'status' => rest_authorization_required_code() )
		);
	}

	public function post( $request ) {
		$settings = $request->get_json_params();

		if ( ! $settings || ! isset( $settings['accepted'] ) || ! $settings['accepted'] ) {
			return new WP_Error( 'bad_request', __( 'Bad request', 'woocommerce-shipping' ), array( 'status' => 400 ) );
		}

		WC_Connect_Options::update_option( 'tos_accepted', true );

		return rest_ensure_response(
			array(
				'success'  => true,
				'accepted' => WC_Connect_Options::get_option( 'tos_accepted' ),
			),
		);
	}
}
