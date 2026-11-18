<?php
namespace Automattic\WCShipping\LegacyAPIControllers;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use Automattic\WCShipping\Connect\WC_Connect_Options;
use Automattic\WCShipping\WPCOMConnection\ConnectionPermissions;
use WP_REST_Response;
use WP_Error;

class WC_REST_Connect_Tos_Controller extends WC_REST_Connect_Base_Controller {

	protected $rest_base = 'connect/tos';

	public function get() {
		return new WP_REST_Response(
			array(
				'success'  => true,
				'accepted' => WC_Connect_Options::get_option( 'tos_accepted' ),
			),
			200
		);
	}

	public function post( $request ) {
		$settings = $request->get_json_params();

		if ( ! $settings || ! isset( $settings['accepted'] ) || ! $settings['accepted'] ) {
			return new WP_Error( 'bad_request', __( 'Bad request', 'woocommerce-shipping' ), array( 'status' => 400 ) );
		}

		WC_Connect_Options::update_option( 'tos_accepted', true );

		return new WP_REST_Response(
			array(
				'success'  => true,
				'accepted' => WC_Connect_Options::get_option( 'tos_accepted' ),
			),
			200
		);
	}

	/**
	 * Validate the requester's permissions
	 */
	public function check_permission( $request ) {
		$can_manage_legacy_tos = current_user_can( 'manage_woocommerce' ) &&
			current_user_can( 'install_plugins' ) &&
			current_user_can( 'activate_plugins' );

		if ( ! $can_manage_legacy_tos ) {
			return false;
		}

		// Keep the existing read permission for reads (HEAD is served by the GET route). Every other method changes store-wide legal state.
		if ( in_array( $request->get_method(), array( 'GET', 'HEAD' ), true ) ) {
			return true;
		}

		return ConnectionPermissions::user_can_accept_tos();
	}
}
