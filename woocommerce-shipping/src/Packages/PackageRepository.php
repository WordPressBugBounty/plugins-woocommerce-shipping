<?php

namespace Automattic\WCShipping\Packages;

use Automattic\WCShipping\Connect\WC_Connect_Options;
use Automattic\WCShipping\Logger;

/**
 * Handles CRUD operations on saved packages.
 */
class PackageRepository {

	/**
	 * Gets custom packages from the database.
	 *
	 * @return array[]
	 */
	public function get_custom_packages() {
		$packages_as_array_sanitizer = new PackagesAsArraysSanitizer(
			$this->get_stored_packages(),
			false
		);

		return $packages_as_array_sanitizer->to_packages_as_arrays();
	}

	/**
	 * Reads the raw `packages` option.
	 *
	 * The option is not guaranteed to hold an array. It accepted unvalidated REST input before
	 * #898, `LegacySettingsMigrator` merges the WCS&T option into it verbatim, and anything on the
	 * site can write to it. `PackagesAsArraysSanitizer` type hints its first argument as `array`,
	 * so reading the option unguarded is a fatal on every path that lists packages - the packages
	 * screen, the label-purchase package picker and the eligibility check, not just the REST route.
	 *
	 * Every read of the option goes through here so the guard cannot be missing on one path.
	 *
	 * @return array Raw stored packages, or an empty array when the option holds anything else.
	 */
	private function get_stored_packages(): array {
		$stored = WC_Connect_Options::get_option( 'packages', array() );

		return is_array( $stored ) ? $stored : array();
	}

	/**
	 * Adds packages to the collection of existing custom packages in the database.
	 *
	 * @param array[] $new_packages Array of packages-as-arrays.
	 *
	 * @throws PackageValidationException If at least one of the provided packages doesn't pass validation.
	 */
	public function add_custom_packages( array $new_packages ) {
		$this->replace_custom_packages(
			array_merge(
				$this->get_custom_packages(),
				$new_packages
			)
		);
	}

	/**
	 * Replaces the collection of existing custom packages in the database with the provided packages.
	 *
	 * Stored packages that cannot be read (see `log_unreadable_stored_packages()`) are not in the
	 * provided list, because `get_custom_packages()` filters them out, so the save drops them.
	 *
	 * @param array[] $packages Array of packages-as-arrays.
	 *
	 * @throws PackageValidationException If at least one of the provided packages doesn't pass validation.
	 */
	public function replace_custom_packages( array $packages ) {
		$sanitized_packages = ( new PackagesAsArraysSanitizer( $packages ) )->to_packages_as_arrays();

		$this->log_unreadable_stored_packages();

		WC_Connect_Options::update_option( 'packages', $sanitized_packages );
	}

	/**
	 * Logs a warning for each stored package the save that follows will drop.
	 *
	 * A package with a negative, infinite or non-numeric dimension was never a usable box, so
	 * nothing usable is lost, but the removal must not be silent.
	 */
	private function log_unreadable_stored_packages(): void {
		foreach ( $this->get_stored_packages() as $stored_package ) {
			if ( ! is_array( $stored_package ) ) {
				Logger::warning(
					'Removing a saved package entry that is not a package.',
					array(
						'entry'  => $stored_package,
						'source' => 'woocommerce-shipping',
					)
				);
				continue;
			}

			try {
				Package::from_array( $stored_package );
			} catch ( PackageValidationException $e ) {
				$name = $stored_package['name'] ?? '';
				Logger::warning(
					sprintf(
						'Removing saved package "%s" because it cannot be read: %s',
						is_scalar( $name ) ? (string) $name : wp_json_encode( $name ),
						$e->getMessage()
					),
					array(
						'package' => $stored_package,
						'source'  => 'woocommerce-shipping',
					)
				);
			}
		}
	}
}
