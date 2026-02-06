<?php

namespace Automattic\WCShipping\FeatureFlags;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class FeatureFlags {

	/**
	 * Features supported by the store.
	 *
	 * Please do not use this constant directly - instead, use the
	 * `wcshipping_features_supported_by_store` filter.
	 *
	 * @var string[]
	 */
	const FEATURES_SUPPORTED_BY_STORE = array( 'upsdap' );

	public function register_hooks() {
		add_filter( 'wcshipping_api_client_body', array( $this, 'decorate_api_request_body_with_feature_flags' ) );
		add_filter( 'wcshipping_features_supported_by_store', array( $this, 'get_features_supported_by_store' ) );
	}

	public function decorate_api_request_body_with_feature_flags( array $body ): array {
		$body['settings']['features_supported_by_store'] = apply_filters( 'wcshipping_features_supported_by_store', array() );

		// Pass `features_supported_by_client` as part of `settings`.
		if ( isset( $body['features_supported_by_client'] ) ) {
			$body['settings']['features_supported_by_client'] = $body['features_supported_by_client'];
			unset( $body['features_supported_by_client'] );
		}

		return $body;
	}

	/**
	 * Get features supported by the store.
	 *
	 * @return string[]
	 */
	public function get_features_supported_by_store(): array {
		return self::FEATURES_SUPPORTED_BY_STORE;
	}

	/**
	 * Check if ScanForm feature is enabled.
	 *
	 * @return bool
	 */
	public static function is_scanform_enabled() {
		/**
		 * Filter to enable USPS ScanForm feature.
		 *
		 * @param bool $enable_scanform Whether to enable the ScanForm feature. Default false.
		 */
		return apply_filters( 'wcshipping_enable_scanform_feature', false );
	}
}
