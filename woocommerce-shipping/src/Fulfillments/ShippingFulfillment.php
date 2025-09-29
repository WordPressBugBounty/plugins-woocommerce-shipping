<?php
/**
 * WooCommerce Shipping Fulfillment class.
 *
 * Extends the WooCommerce Fulfillment class to add shipping-specific functionality.
 *
 * @package WCShipping\Fulfillments
 * @since   1.9.0
 */

declare( strict_types=1 );

namespace Automattic\WCShipping\Fulfillments;

defined( 'ABSPATH' ) || exit;

// Only extend the parent class if it exists (requires WooCommerce 10.1+)
if ( class_exists( '\Automattic\WooCommerce\Internal\Fulfillments\Fulfillment' ) ) {
	/**
	 * Shipping Fulfillment Class
	 *
	 * Extends the core Fulfillment class to provide shipping-specific functionality
	 * such as tracking information, carrier details, and label management.
	 *
	 * @since 1.9.0
	 */
	class ShippingFulfillment extends \Automattic\WooCommerce\Internal\Fulfillments\Fulfillment {

		/**
		 * Get the tracking number for this shipping fulfillment.
		 * Returns the tracking number from the purchased label, or null if no purchased label exists.
		 *
		 * @return string|null The tracking number or null if not set.
		 */
		public function get_tracking_number(): ?string {
			$purchased_label = $this->get_purchased_label();

			if ( $purchased_label && isset( $purchased_label['tracking'] ) ) {
				return $purchased_label['tracking'];
			}

			return null;
		}

		/**
		 * Get the carrier name for this shipping fulfillment.
		 * Returns the carrier name from the purchased label.
		 *
		 * @return string|null The carrier name or null if not set.
		 */
		public function get_carrier_name(): ?string {
			$purchased_label = $this->get_purchased_label();

			if ( $purchased_label && isset( $purchased_label['carrier_name'] ) ) {
				return $purchased_label['carrier_name'];
			}

			return null;
		}

		/**
		 * Get the carrier ID for this shipping fulfillment.
		 * Returns the carrier ID from the purchased label.
		 *
		 * @return string|null The carrier ID or null if not set.
		 */
		public function get_carrier_id(): ?string {
			$purchased_label = $this->get_purchased_label();

			if ( $purchased_label && isset( $purchased_label['carrier_id'] ) ) {
				return $purchased_label['carrier_id'];
			}

			return null;
		}

		/**
		 * Get the shipping service name for this fulfillment.
		 * Returns the service name from the purchased label.
		 *
		 * @return string|null The shipping service name or null if not set.
		 */
		public function get_service_name(): ?string {
			$purchased_label = $this->get_purchased_label();

			if ( $purchased_label && isset( $purchased_label['service_name'] ) ) {
				return $purchased_label['service_name'];
			}

			return null;
		}

		/**
		 * Get the shipping service ID for this fulfillment.
		 * Returns the service ID from the purchased label.
		 *
		 * @return string|null The shipping service ID or null if not set.
		 */
		public function get_service_id(): ?string {
			$purchased_label = $this->get_purchased_label();

			if ( $purchased_label && isset( $purchased_label['service_id'] ) ) {
				return $purchased_label['service_id'];
			}

			return null;
		}

		/**
		 * Get the shipping labels for this fulfillment.
		 *
		 * @return array The labels array or empty array if not set.
		 */
		public function get_labels(): array {
			$labels = $this->get_meta( '_shipping_labels' );
			return is_array( $labels ) ? array_map(
				function ( $label ) {
					return array_merge( $label, array( 'fulfillment_id' => $this->get_id() ) );
				},
				$labels
			) : array();
		}

		/**
		 * Set the shipping labels for this fulfillment.
		 * This method appends new labels to existing ones to preserve refunded labels.
		 *
		 * @param array $labels The labels array to add.
		 * @return void
		 */
		public function set_labels( array $labels ): void {
			$existing_labels = $this->get_labels();
			$all_labels      = array_merge( $existing_labels, $labels );
			$this->replace_all_labels( $all_labels );
		}

		/**
		 * Replace all shipping labels for this fulfillment.
		 * Use this method when you want to completely overwrite existing labels.
		 *
		 * @param array $labels The labels array to set (replaces all existing labels).
		 * @return void
		 */
		public function replace_all_labels( array $labels ): void {
			// Clean up existing individual label_id entries
			$this->cleanup_individual_label_entries();

			// Store the main labels array
			$this->update_meta_data( '_shipping_labels', $labels );

			// Store individual label_id entries for fast lookup
			foreach ( $labels as $label ) {
				if ( isset( $label['label_id'] ) ) {
					$this->add_meta_data( '_shipping_label_id', $label['label_id'] );
				}
			}
		}

		/**
		 * Add a single label to the fulfillment.
		 *
		 * @param array $label The label data to add.
		 * @return void
		 */
		public function add_label( array $label ): void {
			$this->set_labels( array( $label ) );
		}

		/**
		 * Remove a label by its ID.
		 *
		 * @param string $label_id The ID of the label to remove.
		 * @return bool True if label was removed, false if not found.
		 */
		public function remove_label( string $label_id ): bool {
			$labels         = $this->get_labels();
			$original_count = count( $labels );

			$labels = array_filter(
				$labels,
				function ( $label ) use ( $label_id ) {
					return ! isset( $label['label_id'] ) || $label['label_id'] != $label_id;
				}
			);

			if ( count( $labels ) !== $original_count ) {
				// Update the main labels array (this will also sync all individual entries)
				$this->replace_all_labels( array_values( $labels ) ); // Re-index array
				return true;
			}

			return false;
		}

		/**
		 * Get a specific label by its ID.
		 *
		 * @param string $label_id The ID of the label to retrieve.
		 * @return array|null The label data or null if not found.
		 */
		public function get_label_by_id( string $label_id ): ?array {
			$labels = $this->get_labels();

			foreach ( $labels as $label ) {
				if ( isset( $label['label_id'] ) && $label['label_id'] == $label_id ) {
					return $label;
				}
			}

			return null;
		}

		/**
		 * Get the purchased label for this fulfillment.
		 *
		 * @return array|null The purchased label data or null if not found.
		 */
		public function get_purchased_label(): ?array {
			$labels = $this->get_labels();

			foreach ( $labels as $label ) {
				if ( isset( $label['status'] ) && 'PURCHASED' === $label['status'] ) {
					return $label;
				}
			}

			return null;
		}

		/**
		 * Check if this fulfillment has shipping labels.
		 *
		 * @return bool True if labels exist, false otherwise.
		 */
		public function has_label(): bool {
			$labels = $this->get_labels();
			return ! empty( $labels );
		}

		/**
		 * Get the count of labels for this fulfillment.
		 *
		 * @return int The number of labels.
		 */
		public function get_label_count(): int {
			return count( $this->get_labels() );
		}

		/**
		 * Check if this fulfillment has tracking information.
		 * Returns true if there's a purchased label with tracking information.
		 *
		 * @return bool True if tracking information exists, false otherwise.
		 */
		public function has_tracking(): bool {
			return ! empty( $this->get_tracking_number() );
		}

		/**
		 * Get the shipping label rate information.
		 *
		 * @return array|null The shipping rate data or null if not set.
		 */
		public function get_shipping_label_rate(): ?array {
			$rate = $this->get_meta( '_shipping_label_rate' );
			return is_array( $rate ) ? $rate : null;
		}

		/**
		 * Set the shipping label rate information.
		 *
		 * @param array|null $rate The shipping rate data.
		 * @return void
		 */
		public function set_shipping_label_rate( ?array $rate ): void {
			if ( null === $rate ) {
				$this->delete_meta_data( '_shipping_label_rate' );
			} else {
				$this->update_meta_data( '_shipping_label_rate', $rate );
			}
		}

		/**
		 * Get the hazmat configuration for this fulfillment.
		 *
		 * @return array|null The hazmat configuration or null if not set.
		 */
		public function get_shipping_label_hazmat(): ?array {
			$hazmat = $this->get_meta( '_shipping_label_hazmat' );
			return is_array( $hazmat ) ? $hazmat : null;
		}

		/**
		 * Set the hazmat configuration for this fulfillment.
		 *
		 * @param array|null $hazmat The hazmat configuration.
		 * @return void
		 */
		public function set_shipping_label_hazmat( ?array $hazmat ): void {
			if ( null === $hazmat ) {
				$this->delete_meta_data( '_shipping_label_hazmat' );
			} else {
				$this->update_meta_data( '_shipping_label_hazmat', $hazmat );
			}
		}

		/**
		 * Get the selected origin address for this fulfillment.
		 *
		 * @return array|null The origin address or null if not set.
		 */
		public function get_selected_origin(): ?array {
			$origin = $this->get_meta( '_shipping_label_origin' );
			return is_array( $origin ) ? $origin : null;
		}

		/**
		 * Set the selected origin address for this fulfillment.
		 *
		 * @param array|null $origin The origin address.
		 * @return void
		 */
		public function set_selected_origin( ?array $origin ): void {
			if ( null === $origin ) {
				$this->delete_meta_data( '_shipping_label_origin' );
			} else {
				$this->update_meta_data( '_shipping_label_origin', $origin );
			}
		}

		/**
		 * Get the shipping label destination address.
		 *
		 * @return array|null The destination address or null if not set.
		 */
		public function get_shipping_label_destination(): ?array {
			$destination = $this->get_meta( '_shipping_label_destination' );
			return is_array( $destination ) ? $destination : null;
		}

		/**
		 * Set the shipping label destination address.
		 *
		 * @param array|null $destination The destination address.
		 * @return void
		 */
		public function set_shipping_label_destination( ?array $destination ): void {
			if ( null === $destination ) {
				$this->delete_meta_data( '_shipping_label_destination' );
			} else {
				$this->update_meta_data( '_shipping_label_destination', $destination );
			}
		}

		/**
		 * Get the shipping label customs information.
		 *
		 * @return array|null The customs information or null if not set.
		 */
		public function get_shipping_label_customs(): ?array {
			$customs = $this->get_meta( '_shipping_label_customs' );
			return is_array( $customs ) ? $customs : null;
		}

		/**
		 * Set the shipping label customs information.
		 *
		 * @param array|null $customs The customs information.
		 * @return void
		 */
		public function set_shipping_label_customs( ?array $customs ): void {
			if ( null === $customs ) {
				$this->delete_meta_data( '_shipping_label_customs' );
			} else {
				$this->update_meta_data( '_shipping_label_customs', $customs );
			}
		}

		/**
		 * Get the shipping label dates information.
		 *
		 * @return array|null The shipment dates or null if not set.
		 */
		public function get_shipping_label_dates(): ?array {
			$dates = $this->get_meta( '_shipping_label_dates' );
			return is_array( $dates ) ? $dates : null;
		}

		/**
		 * Set the shipping label dates information.
		 *
		 * @param array|null $dates The shipment dates.
		 * @return void
		 */
		public function set_shipping_label_dates( ?array $dates ): void {
			if ( null === $dates ) {
				$this->delete_meta_data( '_shipping_label_dates' );
			} else {
				$this->update_meta_data( '_shipping_label_dates', $dates );
			}
		}

		/**
		 * Update a specific label by its ID with new data.
		 *
		 * @param string $label_id The ID of the label to update.
		 * @param array  $data The data to update for the label.
		 * @return bool True if label was found and updated, false otherwise.
		 */
		public function update_label( string $label_id, array $data ): bool {
			$labels  = $this->get_labels();
			$updated = false;

			foreach ( $labels as &$label ) {
				if ( isset( $label['label_id'] ) && $label['label_id'] == $label_id ) {
					$label   = array_merge( $label, $data );
					$updated = true;
					break;
				}
			}

			if ( $updated ) {
				$this->replace_all_labels( $labels );
			}

			return $updated;
		}

		/**
		 * Clean up individual label_id meta entries.
		 * Removes all meta entries with '_shipping_label_id' key.
		 *
		 * @return void
		 */
		private function cleanup_individual_label_entries(): void {
			$this->delete_meta_data( '_shipping_label_id' );
		}

		/**
		 * Get shipping-specific data as an array.
		 *
		 * @return array The shipping data.
		 */
		public function get_shipping_data(): array {
			return array(
				'labels'               => $this->get_labels(),
				'selected_rates'       => $this->get_shipping_label_rate(),
				'selected_hazmat'      => $this->get_shipping_label_hazmat(),
				'selected_origin'      => $this->get_selected_origin(),
				'selected_destination' => $this->get_shipping_label_destination(),
				'customs_information'  => $this->get_shipping_label_customs(),
				'shipment_dates'       => $this->get_shipping_label_dates(),
			);
		}
	}
} else {
	/**
	 * Fallback Shipping Fulfillment Class
	 *
	 * Provides a class placeholder when the parent Fulfillment class
	 * is not available (WooCommerce < 10.1.0).
	 *
	 * @since 1.9.0
	 */
	class ShippingFulfillment extends \WC_Data {
	}
}
