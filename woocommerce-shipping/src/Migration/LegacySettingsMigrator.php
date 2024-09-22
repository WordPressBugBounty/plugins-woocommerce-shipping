<?php

namespace Automattic\WCShipping\Migration;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once WCSHIPPING_PLUGIN_DIR . '/classes/class-wc-connect-nux.php';

use Automattic\WCShipping\Connect\WC_Connect_Nux;
use Automattic\WooCommerce\Internal\Traits\AccessiblePrivateMethods;
use Automattic\WooCommerce\Utilities\ArrayUtil;
use WP_User;

/**
 * Class LegacySettingsMigrator
 *
 * This service helps to migrate settings data from WCS&T to the WC Shipping.
 *
 * @package Automattic\WCShipping\Migration
 */
class LegacySettingsMigrator {
	use AccessiblePrivateMethods;

	public const PURCHASE_SETTINGS = array(
		'label_box_id'    => array(
			'legacy'     => 'wc_connect_last_box_id',
			'wcshipping' => 'wcshipping_last_box_id',
		),
		'last_service_id' => array(
			'legacy'     => 'wc_connect_last_service_id',
			'wcshipping' => 'wcshipping_last_service_id',
		),
		'last_carrier_id' => array(
			'legacy'     => 'wc_connect_last_carrier_id',
			'wcshipping' => 'wcshipping_last_carrier_id',
		),
	);

	public const OPTIONS = array(
		'legacy'     => 'wc_connect_options',
		'wcshipping' => 'wcshipping_options',
	);

	public const ORIGIN_ADDRESS = array(
		'legacy'     => 'wc_connect_origin_address',
		'wcshipping' => 'wcshipping_origin_addresses',
	);

	public const NONE_MIGRATABLE_SETTINGS = array(
		'tos'    => 'tos_accepted',
		'guid'   => 'store_guid',
		'banner' => 'should_display_nux_after_jp_cxn_banner',
		// All payment related data is something we fetch automatically in WC Shipping as well,
		// and their will automatically happen after a WPCOM connection is established, so they
		// will block settings migration from happening if e.g. a merchant visits the settings
		// page before doing a migration.
		'pm_url' => 'add_payment_method_url',
		'pms'    => 'payment_methods',
	);

	public function __construct() {
		self::mark_method_as_accessible( 'needs_migration' );
		self::mark_method_as_accessible( 'migrate_settings' );
		self::mark_method_as_accessible( 'has_migrated_purchase_settings' );
		self::mark_method_as_accessible( 'migrate_label_purchase_settings' );
		self::mark_method_as_accessible( 'migrate_origin_address' );
	}

	public function migrate_all(): void {
		do_action( 'wcshipping_settings_migration_started' );
		$this->migrate_label_purchase_settings();
		$this->migrate_settings();
		$this->migrate_origin_address();
		do_action( 'wcshipping_settings_migration_completed' );
	}

	public function needs_migration(): bool {
		$wcshipping_options = get_option( self::OPTIONS['wcshipping'] );
		$wcshipping_origins = get_option( self::ORIGIN_ADDRESS['wcshipping'] );
		$legacy_options     = get_option( self::OPTIONS['legacy'] );
		$legacy_origins     = get_option( self::ORIGIN_ADDRESS['legacy'] );

		foreach ( self::NONE_MIGRATABLE_SETTINGS as $setting_key ) {
			if ( isset( $wcshipping_options[ $setting_key ] ) ) {
				unset( $wcshipping_options[ $setting_key ] );
			}
			if ( isset( $legacy_options[ $setting_key ] ) ) {
				unset( $legacy_options[ $setting_key ] );
			}
		}

		return ! empty( $this->get_users_with_legacy_purchase_settings() )
			|| ( empty( $wcshipping_options ) && ! empty( $legacy_options ) )
			|| ( empty( $wcshipping_origins ) && ! empty( $legacy_origins ) );
	}

	private function migrate_settings(): void {
		if ( ! $this->needs_migration() ) {
			return;
		}

		$legacy_options     = get_option( self::OPTIONS['legacy'], array() );
		$wcshipping_options = get_option( self::OPTIONS['wcshipping'], array() );

		foreach ( self::NONE_MIGRATABLE_SETTINGS as $setting_key ) {
			if ( isset( $legacy_options[ $setting_key ] ) ) {
				// We want to keep store_guid since it's unique to the store and a new one
				// will be generated if we do not move it.
				if ( 'store_guid' === $setting_key ) {
					continue;
				}

				unset( $legacy_options[ $setting_key ] );
			}
		}

		if ( ! empty( $legacy_options ) ) {
			update_option(
				self::OPTIONS['wcshipping'],
				array_merge(
					$wcshipping_options,
					$legacy_options
				)
			);
		}
	}

	/**
	 * @return int[]
	 */
	private function get_users_with_legacy_purchase_settings(): array {
		/**
		 * As all the items in self::PURCHASE_SETTINGS get saved in one go per user, it's fine to use only
		 * one of them to retrieve users with this metadata
		 */
		$users = get_users(
			array(
				'meta_query' => array(
					'relation' => 'AND',
					array(
						'key'     => self::PURCHASE_SETTINGS['label_box_id']['legacy'],
						'compare' => 'EXISTS',
					),
					array(
						'key'     => self::PURCHASE_SETTINGS['label_box_id']['wcshipping'],
						'compare' => 'NOT EXISTS',
					),
				),
			)
		);

		return array_column( $users, 'ID' );
	}

	private function migrate_label_purchase_settings(): void {
		$user_ids = $this->get_users_with_legacy_purchase_settings();
		foreach ( $user_ids as $user_id ) {
			foreach ( self::PURCHASE_SETTINGS as $versioned_setting ) {
				$setting_value = get_user_meta( $user_id, $versioned_setting['legacy'], true );
				update_user_meta( $user_id, $versioned_setting['wcshipping'], $setting_value );
			}
		}
	}

	private function migrate_origin_address(): void {
		$legacy_origin      = get_option( self::ORIGIN_ADDRESS['legacy'] );
		$wcshipping_origins = get_option( self::ORIGIN_ADDRESS['wcshipping'] );

		if ( ! empty( $legacy_origin ) && empty( $wcshipping_origins ) ) {
			/**
			 * In the legacy plugin only verified origin address is saved but in WCS,
			 * a valid origin has to have a phone number and email and since in WCS&T email address is not recorded
			 * the migrated address is always set as unverified
			 */
			$legacy_origin['is_verified'] = false;
			$legacy_origin['id']          = 'wcst_copy_over';
			update_option(
				self::ORIGIN_ADDRESS['wcshipping'],
				array(
					$legacy_origin,
				)
			);
		}
	}
}
