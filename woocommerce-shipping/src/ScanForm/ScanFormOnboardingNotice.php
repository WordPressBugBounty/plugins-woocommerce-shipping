<?php
/**
 * ScanForm Onboarding Notice
 *
 * Displays a one-time onboarding notice for the ScanForm feature on the orders list screen.
 *
 * @package WCShipping
 */

namespace Automattic\WCShipping\ScanForm;

use Automattic\WCShipping\Connect\WC_Connect_Functions;
use Automattic\WCShipping\FeatureFlags\FeatureFlags;
use Automattic\WCShipping\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ScanFormOnboardingNotice
 *
 * Displays an onboarding notice for the ScanForm feature within orders list screen.
 */
class ScanFormOnboardingNotice {

	/**
	 * Notice ID.
	 *
	 * @var string
	 */
	private string $notice_id = 'wcshipping_scanform_onboarding';

	/**
	 * Constructor
	 *
	 * Registers hooks if the ScanForm feature is enabled.
	 */
	public function __construct() {
		if ( ! FeatureFlags::is_scanform_enabled() ) {
			return;
		}

		// Register hooks.
		add_action( 'admin_notices', array( $this, 'maybe_show_notice' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_action( 'wp_ajax_wcshipping_dismiss_scanform_onboarding', array( $this, 'ajax_dismiss_notice' ) );
	}

	/**
	 * Maybe show the onboarding notice.
	 */
	public function maybe_show_notice() {
		// Check if user has permission to manage labels.
		if ( ! WC_Connect_Functions::user_can_manage_labels() ) {
			return;
		}

		// Check if we're on the orders list screen.
		if ( ! Utils::is_orders_screen() ) {
			return;
		}

		// Check if already dismissed.
		if ( $this->is_dismissed() ) {
			return;
		}

		?>
		<div class="notice notice-info is-dismissible wcshipping-scanform-onboarding-notice">
			<p>
				<?php
				printf(
					/* translators: %1$s: opening strong tag, %2$s: closing strong tag, %3$s: line break */
					esc_html__( '%1$sNew: USPS ScanForm is now available.%2$s Create a single barcode for all USPS packages scheduled for pickup.%3$sTo use it, select your orders and click Create ScanForm.', 'woocommerce-shipping' ),
					'<strong>',
					'</strong>',
					'<br>'
				);
				?>
			</p>
			<p class="wcshipping-scanform-onboarding-actions">
				<button type="button" class="button button-primary wcshipping-scanform-try-now">
					<?php esc_html_e( 'Try it now', 'woocommerce-shipping' ); ?>
				</button>
				<button type="button" class="button wcshipping-scanform-got-it">
					<?php esc_html_e( 'Got it', 'woocommerce-shipping' ); ?>
				</button>
			</p>
		</div>
		<?php
	}

	/**
	 * Enqueues JavaScript and CSS assets.
	 */
	public function enqueue_assets() {
		if ( ! Utils::is_orders_screen() ) {
			return;
		}

		if ( $this->is_dismissed() ) {
			return;
		}

		wp_enqueue_style(
			'wcshipping-scanform-onboarding',
			WCSHIPPING_STYLESHEETS_URL . 'wcshipping-scanform-onboarding.css',
			array(),
			WCSHIPPING_VERSION
		);

		wp_enqueue_script(
			'wcshipping-scanform-onboarding',
			WCSHIPPING_JAVASCRIPT_URL . 'wcshipping-scanform-onboarding.js',
			array(),
			WCSHIPPING_VERSION,
			true
		);

		wp_localize_script(
			'wcshipping-scanform-onboarding',
			'wcShippingScanFormOnboarding',
			array(
				'nonce' => wp_create_nonce( 'wcshipping_dismiss_scanform_onboarding_nonce' ),
			)
		);
	}

	/**
	 * Check if the notice has been dismissed.
	 *
	 * @return bool True if dismissed, false otherwise.
	 */
	private function is_dismissed(): bool {
		return (bool) get_user_meta( get_current_user_id(), $this->notice_id . '_dismissed', true );
	}

	/**
	 * Dismiss the notice.
	 */
	private function dismiss_notice() {
		update_user_meta( get_current_user_id(), $this->notice_id . '_dismissed', true );
	}

	/**
	 * Handle AJAX request to dismiss the notice.
	 */
	public function ajax_dismiss_notice() {
		check_ajax_referer( 'wcshipping_dismiss_scanform_onboarding_nonce', 'nonce' );

		if ( ! WC_Connect_Functions::user_can_manage_labels() ) {
			wp_send_json_error( array( 'message' => 'Insufficient permissions' ) );
			return;
		}

		$this->dismiss_notice();

		wp_send_json_success( array( 'message' => 'Notice dismissed successfully' ) );
	}
}
