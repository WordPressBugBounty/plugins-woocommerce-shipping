<?php
/**
 * File containing the MigrationNotices class.
 *
 * @package Automattic\WCShipping\Migration
 */

namespace Automattic\WCShipping\Migration;

/**
 * Class MigrationNotices
 */
class MigrationNotices {
	/**
	 * Constructor.
	 */
	public static function init(): void {
		add_action( 'admin_notices', array( __CLASS__, 'output_migration_notices' ) );
	}

	/**
	 * Output migration notices.
	 */
	public static function output_migration_notices(): void {
		// Only show notices if we have traces that WCS&T used to be activated on the website.
		if ( ! get_option( 'wc_connect_options', false ) ) {
			return;
		}

		if ( MigrationState::INSTALLATION_COMPLETED === MigrationState::get_state() && ! MigrationState::is_data_migration_required() && self::should_show_notice( 'installed' ) ) {
			self::installation_completed_notice();
		} elseif ( MigrationState::INSTALLATION_COMPLETED === MigrationState::get_state() && MigrationState::is_data_migration_required() ) {
			self::data_migration_required_notice();
		} elseif ( MigrationState::DATA_MIGRATION_STARTED === MigrationState::get_state() ) {
			self::data_migration_started_notice();
		} elseif ( MigrationState::DATA_MIGRATION_COMPLETED === MigrationState::get_state() && self::should_show_notice( 'migrated' ) ) {
			self::data_migration_completed_notice();
		}
	}

	/**
	 * Installation completed notice. No data migration is needed.
	 */
	public static function installation_completed_notice(): void {
		wp_admin_notice(
			sprintf(
				'<p>%s</p>',
				esc_html__( 'WooCommerce Shipping has successfully been installed and activated — enjoy the new WooCommerce Shipping experience.', 'woocommerce-shipping' )
			),
			array(
				'id'          => 'wcshipping_migration_installed_message',
				'type'        => 'success',
				'dismissible' => true,
			)
		);

		// Allow the notice to persist for 3 minutes.
		if ( ! get_option( 'wcshipping_installation_completed_shown' ) ) {
			update_option( 'wcshipping_installation_completed_shown', current_time( 'U' ) + ( MINUTE_IN_SECONDS * 3 ), false );
		}
	}

	/**
	 * Check if a notice should be shown.
	 *
	 * @param string $notice The notice to check.
	 * @return bool Wehther the notice should be shown.
	 */
	public static function should_show_notice( $notice ): bool {
		switch ( $notice ) {
			case 'installed':
				$option_name = 'wcshipping_installation_completed_shown';
				break;
			case 'migrated':
				$option_name = 'wcshipping_migration_completed_shown';
				break;
			default:
				return false;
		}

		$option_value = get_option( $option_name );
		if ( ! $option_value ) {
			return true;
		}

		return current_time( 'U' ) < $option_value;
	}

	/**
	 * Data migration required notice.
	 */
	public static function data_migration_required_notice(): void {
		$migration_type = MigrationState::get_data_migration_required_type();
		switch ( $migration_type ) {
			case MigrationState::SETTINGS_TYPE:
				$migration_message = __( 'Next, transfer your WooCommerce Shipping & Tax settings to WooCommerce Shipping.', 'woocommerce-shipping' );
				break;
			case MigrationState::LABELS_TYPE:
				$migration_message = __( 'Next, transfer your WooCommerce Shipping & Tax shipping labels to WooCommerce Shipping.', 'woocommerce-shipping' );
				break;
			case MigrationState::ALL_TYPE:
				$migration_message = __( 'Next, transfer your WooCommerce Shipping & Tax settings and shipping labels to WooCommerce Shipping.', 'woocommerce-shipping' );
				break;
			default:
				return;
		}

		$message = sprintf(
			'<p>%s</p>
			<p>%s</p>
			<form method="post" action="">
				<p>
					<button type="submit" name="wcst_start_migration" class="action-button button button-primary">%s</button>
				</p>
			</form>',
			esc_html__( 'Congratulations! You have successfully installed and activated WooCommerce Shipping.', 'woocommerce-shipping' ),
			esc_html( $migration_message ),
			esc_html__( 'Click here to start the process', 'woocommerce-shipping' )
		);

		add_filter(
			'wp_kses_allowed_html',
			function ( $allowedtags ) {
				$allowedtags['form'] = array(
					'method' => true,
					'action' => true,
				);

				return $allowedtags;
			}
		);

		wp_admin_notice(
			$message,
			array(
				'type'           => 'warning',
				'paragraph_wrap' => false,
			)
		);
	}

	/**
	 * Data migration started notice.
	 */
	public static function data_migration_started_notice() {
		switch ( MigrationState::get_data_migration_required_type() ) {
			case MigrationState::SETTINGS_TYPE:
				$message = __( 'WooCommerce Shipping & Tax settings are being migrated to WooCommerce Shipping.', 'woocommerce-shipping' );
				break;
			case MigrationState::LABELS_TYPE:
				$message = __( 'WooCommerce Shipping & Tax labels are being migrated to WooCommerce Shipping.', 'woocommerce-shipping' );
				break;
			case MigrationState::ALL_TYPE:
				$message = __( 'WooCommerce Shipping & Tax legacy settings and labels are being migrated to WooCommerce Shipping.', 'woocommerce-shipping' );
				break;
			default:
				return;
		}

		wp_admin_notice(
			sprintf(
				'<p>%s</p><p>%s</p>',
				esc_html( $message ),
				esc_html__( 'You may continue to use your website as usual. We will notify you once the migration process is complete.', 'woocommerce-shipping' )
			),
			array(
				'type'        => 'success',
				'dismissible' => true,
			)
		);
	}

	/**
	 * Data migration completed notice.
	 */
	public static function data_migration_completed_notice() {
		wp_admin_notice(
			sprintf(
				'<p>%s</p>',
				esc_html__( 'Your shipping settings and label history have been successfully migrated — enjoy the new WooCommerce Shipping experience.', 'woocommerce-shipping' )
			),
			array(
				'id'          => 'wcshipping_migration_completed_message',
				'type'        => 'success',
				'dismissible' => true,
			)
		);

		// Allow the notice to persist for 3 minutes.
		if ( ! get_option( 'wcshipping_migration_completed_shown' ) ) {
			update_option( 'wcshipping_migration_completed_shown', current_time( 'U' ) + ( MINUTE_IN_SECONDS * 3 ), false );
		}
	}
}
