<?php
/**
 * AddressUtils class.
 *
 * A class to provide utility methods for working with addresses.
 *
 * @package Automattic/WCShipping
 */

namespace Automattic\WCShipping\Utilities;

use Automattic\WooCommerce\StoreApi\Utilities\ValidationUtils;

/**
 * AddressUtils class.
 */
class AddressUtils {

	/**
	 * Longest secondary line `separate_address_lines()` still splits, in bytes.
	 *
	 * Checkout and the Store API do not cap `address_2`, and the split builds
	 * a regular expression from it. The client mirrors this bound.
	 *
	 * @var int
	 */
	public const ADDRESS_2_SPLIT_MAX_LENGTH = 200;

	/**
	 * Most words a secondary line may have for `separate_address_lines()` to split it.
	 *
	 * @var int
	 */
	public const ADDRESS_2_SPLIT_MAX_WORDS = 50;

	/**
	 * Standard address fields.
	 *
	 * @var array
	 */
	public static array $standard_address_fields = array(
		'address_1',
		'address_2',
		'city',
		'state',
		'postcode',
		'country',
	);

	/**
	 * Map of address abbreviations.
	 *
	 * @var array
	 */
	public static array $address_abbreviation_map = array(
		'STREET'    => 'ST',
		'AVENUE'    => 'AVE',
		'BOULEVARD' => 'BLVD',
		'ROAD'      => 'RD',
		'DRIVE'     => 'DR',
		'LANE'      => 'LN',
		'COURT'     => 'CT',
		'PARKWAY'   => 'PKWY',
		'PLACE'     => 'PL',
		'TERRACE'   => 'TER',
		'CIRCLE'    => 'CIR',
		'HIGHWAY'   => 'HWY',
		'MOUNT'     => 'MT',
		'MOUNTAIN'  => 'MTN',
		'SQUARE'    => 'SQ',
		'SUITE'     => 'STE',
		'BUILDING'  => 'BLDG',
		'FLOOR'     => 'FL',
		'ROOM'      => 'RM',
		'APARTMENT' => 'APT',
		'UNIT'      => 'UNIT',
		'HARBOR'    => 'HBR',
		'ISLAND'    => 'IS',
		'CREEK'     => 'CRK',
		'HEIGHTS'   => 'HTS',
		'SPRING'    => 'SPG',
		'VALLEY'    => 'VLY',
		'CROSSING'  => 'XING',
		'NORTH'     => 'N',
		'SOUTH'     => 'S',
		'EAST'      => 'E',
		'WEST'      => 'W',
	);

	/**
	 * Compare two addresses to determine if they are close.
	 *
	 * @param array $address1 The first address.
	 * @param array $address2 The second address.
	 *
	 * @return bool
	 */
	public static function are_addresses_close( array $address1, array $address2 ): bool {
		$address1 = self::get_standardized_address( $address1 );
		$address2 = self::get_standardized_address( $address2 );

		// Set thresholds (adjust as necessary).
		$street_threshold = 5;

		foreach ( self::$standard_address_fields as $field ) {
			if ( in_array( $field, array( 'address_1', 'address_2' ), true ) ) {
				if ( levenshtein( $address1[ $field ], $address2[ $field ] ) > $street_threshold ) {
					return false;
				}
			} elseif ( $address1[ $field ] !== $address2[ $field ] ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Returns a standardized address string.
	 *
	 * @param array $address The address.
	 *
	 * @return array
	 */
	public static function get_standardized_address( array $address ): array {

		$standardized_address = array();

		foreach ( self::$standard_address_fields as $field ) {
			if ( empty( $address[ $field ] ) ) {
				$standardized_address[ $field ] = '';
			} elseif ( in_array( $field, array( 'city', 'country' ), true ) ) {
				$standardized_address[ $field ] = strtoupper( $address[ $field ] );
			} elseif ( 'state' === $field ) {
				$standardized_address[ $field ] = self::convert_state_to_wc_format( $address[ $field ], $address['country'] );
			} elseif ( 'postcode' === $field ) {
				$standardized_address[ $field ] = wc_format_postcode( $address[ $field ], $address['country'] );
			} else {
				$standardized_address[ $field ] = self::get_standardized_address_field( $address[ $field ] );
			}
		}

		return $standardized_address;
	}

	/**
	 * Convert a state to WooCommerce format.
	 *
	 * @param string $state   The state.
	 * @param string $country The country.
	 *
	 * @return string
	 */
	public static function convert_state_to_wc_format( string $state, string $country ): string {
		$wc_validation_utils = new ValidationUtils();

		$state       = wc_strtoupper( remove_accents( $state ) );
		$country     = wc_strtoupper( $country );
		$states      = $wc_validation_utils->get_states_for_country( $country );
		$state_codes = array_map( 'wc_strtoupper', array_keys( $states ) );

		// Check if the state is already in the correct format.
		if ( in_array( $state, $state_codes, true ) ) {
			return $state;
		}

		$country_state_combo = $country . '-' . $state;

		// Check if the state is a country-state combo.
		if ( in_array( $country_state_combo, $state_codes, true ) ) {
			return $country_state_combo;
		}

		// Check if the state is a full name.
		if ( count( $states ) ) {
			$standardized_states = array_map(
				'wc_strtoupper',
				array_map(
					'remove_accents',
					$states
				)
			);

			$state_values = array_map( 'wc_strtoupper', array_flip( array_map( 'wc_strtoupper', $standardized_states ) ) );

			if ( isset( $state_values[ $state ] ) ) {
				// Convert to state code if a state name was provided.
				return $state_values[ $state ];
			}
		}

		return $state;
	}

	/**
	 * Get standardized address field.
	 *
	 * @param string $field The address field.
	 *
	 * @return string
	 */
	public static function get_standardized_address_field( string $field ): string {

		// Convert to uppercase and remove periods, commas, and extra spaces.
		$result = strtoupper( $field );
		$result = preg_replace( '/\./', '', $result );
		$result = preg_replace( '/,/', '', $result );
		$result = preg_replace( '/\s+/', ' ', $result );

		// Replace full words with abbreviations.
		foreach ( self::$address_abbreviation_map as $full => $abbr ) {
			$result = preg_replace( '/\b' . preg_quote( $full, '/' ) . '\b/', $abbr, $result );
		}

		return $result;
	}

	/**
	 * Compare two addresses to determine if they are equal.
	 *
	 * @param array $address1 The first address.
	 * @param array $address2 The second address.
	 *
	 * @return bool
	 */
	public static function are_addresses_equal( array $address1, array $address2 ): bool {
		$address1 = array_map( 'strtoupper', $address1 );
		$address2 = array_map( 'strtoupper', $address2 );

		// Sort the address fields.
		$address1 = self::get_standardized_address( $address1 );
		$address2 = self::get_standardized_address( $address2 );

		return $address1 === $address2;
	}

	/**
	 * Get required shipping address field keys for the passed country.
	 *
	 * @param string $country The country.
	 * @param string $type    The address type. Default is 'billing_'.
	 *
	 * @return array
	 */
	public static function get_required_shipping_address_field_keys( string $country, string $type = 'billing_' ): array {
		$fields_for_country = self::get_country_address_fields( $country, $type );
		$locale             = WC()->countries->get_country_locale();
		$country_locale     = $locale[ $country ] ?? array();

		$field_keys_to_ignore = array( 'first_name', 'last_name', 'company', 'email', 'phone' );
		$required_field_keys  = array();

		foreach ( $fields_for_country as $field_key => $field ) {
			$key = str_replace( $type, '', $field_key );

			if ( in_array( $key, $field_keys_to_ignore, true ) ) {
				continue;
			}

			$required = $field['required'] ?? $country_locale[ $key ]['required'] ?? false;

			if ( $required ) {
				$required_field_keys[] = $key;
			}
		}

		return $required_field_keys;
	}

	/**
	 * Get address field keys to validate for the passed country.
	 *
	 * @param string $country The country.
	 * @param string $type    The address type. Default is 'billing_'.
	 *
	 * @return array
	 */
	public static function get_address_field_keys_to_validate( string $country, string $type = 'billing_' ): array {
		$fields_for_country = self::get_country_address_fields( $country, $type );
		$locale             = WC()->countries->get_country_locale();
		$country_locale     = $locale[ $country ] ?? array();

		$field_keys_to_ignore   = array( 'first_name', 'last_name', 'company', 'email', 'phone' );
		$field_keys_to_validate = array();

		foreach ( $fields_for_country as $field_key => $field ) {
			$key = str_replace( $type, '', $field_key );

			if ( in_array( $key, $field_keys_to_ignore, true ) ) {
				continue;
			}

			$hidden   = $field['hidden'] ?? $country_locale[ $key ]['hidden'] ?? false;
			$required = $field['required'] ?? $country_locale[ $key ]['required'] ?? false;

			if ( $required || ! $hidden ) {
				$field_keys_to_validate[] = $key;
			}
		}

		return $field_keys_to_validate;
	}

	/**
	 * Get address fields for the passed country.
	 *
	 * @param string $country The country.
	 * @param string $type    The address type. Default is 'billing_'. Possible values are 'billing_' and 'shipping_'.
	 *
	 * @return array
	 */
	public static function get_country_address_fields( string $country, string $type = 'billing_' ): array {
		static $fields_for_country;

		if ( null !== $fields_for_country ) {
			return $fields_for_country;
		}

		$fields_for_country = WC()->countries->get_address_fields( $country, $type );

		return $fields_for_country;
	}

	/**
	 * Splits a street line that may also carry the secondary line back into two lines.
	 *
	 * The label UI joins `address_1` and `address_2` into one street line
	 * (`"350 5th Ave, D 4102"`) and has also sent `address_2` beside it.
	 * Saving that pair as-is put the unit in both fields, and every later join
	 * added it again (`"…, D 4102, D 4102"`). This removes those copies so the
	 * unit is carried once.
	 *
	 * Rules, when `$line_2` is not empty (case and spacing are ignored):
	 * - `$line_1` ends with one or more `", <line_2>"` copies: they are removed
	 *   and `$line_2` is kept.
	 * - `$line_1` already ends with `" <line_2>"` and `$line_2` has two or more
	 *   words (for example a verified `"350 5TH AVE STE 3000"` with
	 *   `"Ste 3000"`): the suffix is removed from `$line_1` and `$line_2` is
	 *   kept.
	 *   One-word units are left alone, because `"County Road 12"` with unit
	 *   `"12"` is a real address.
	 * - Otherwise both lines are returned unchanged.
	 *
	 * @param string $line_1 Street line, possibly joined with the secondary line.
	 * @param string $line_2 Secondary line (apartment, suite, unit).
	 *
	 * @return string[] Two items: the street line and the secondary line.
	 */
	public static function separate_address_lines( string $line_1, string $line_2 ): array {
		$line_1 = trim( $line_1 );
		$line_2 = trim( $line_2 );

		if ( '' === $line_2 || '' === $line_1 ) {
			return array( $line_1, $line_2 );
		}

		// `preg_split()` returns false on malformed UTF-8. A huge value is no
		// unit, and the pattern built from it can exceed the regex engine's
		// limits (the client mirrors these bounds), so leave both lines alone.
		$words = strlen( $line_2 ) > self::ADDRESS_2_SPLIT_MAX_LENGTH ? false : preg_split( '/\s+/u', $line_2 );
		if ( ! is_array( $words ) || count( $words ) > self::ADDRESS_2_SPLIT_MAX_WORDS ) {
			return array( $line_1, $line_2 );
		}

		$pattern = implode( '\s+', array_map( fn( $word ) => preg_quote( $word, '/' ), $words ) );

		$stripped = preg_replace( '/(?:\s*,\s*' . $pattern . ')+\s*,?\s*$/iu', '', $line_1 );
		if ( is_string( $stripped ) && $stripped !== $line_1 ) {
			$stripped = rtrim( $stripped, " \t\n\r\0\x0B," );
			if ( '' !== $stripped ) {
				return array( $stripped, $line_2 );
			}
		}

		if ( count( $words ) > 1 ) {
			$without_suffix = preg_replace( '/\s+' . $pattern . '\s*$/iu', '', $line_1 );
			if ( is_string( $without_suffix ) && $without_suffix !== $line_1 && '' !== trim( $without_suffix ) ) {
				return array( trim( $without_suffix ), $line_2 );
			}
		}

		return array( $line_1, $line_2 );
	}

	/**
	 * Format an address array into a single string for HTML.
	 *
	 * @param array $address_data Address data array.
	 * @return string Formatted address.
	 */
	public static function address_array_to_formatted_html_string( array $address_data ) {
		$parts = array();
		if ( ! empty( $address_data['company'] ) ) {
			$parts[] = $address_data['company'];
		}
		if ( ! empty( $address_data['name'] ) ) {
			$parts[] = $address_data['name'];
		}
		if ( ! empty( $address_data['address'] ) ) {
			$parts[] = $address_data['address'];
		}

		$city_line = array_filter(
			array(
				$address_data['city'] ?? '',
				$address_data['state'] ?? '',
				$address_data['postcode'] ?? '',
			)
		);
		if ( ! empty( $city_line ) ) {
			$parts[] = implode( ', ', $city_line );
		}

		if ( ! empty( $address_data['country'] ) ) {
			$parts[] = $address_data['country'];
		}
		if ( ! empty( $address_data['phone'] ) ) {
			$parts[] = 'Phone: ' . $address_data['phone'];
		}

		return implode( '<br/>', $parts );
	}
}
