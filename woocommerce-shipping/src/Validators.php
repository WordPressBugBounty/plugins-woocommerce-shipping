<?php

namespace Automattic\WCShipping;

class Validators {
	/**
	 * Validates if a parameter is a boolean-like value.
	 * Accepts: 'true', 'false', true, false, '0', '1', 0, 1
	 *
	 * @param mixed            $param The parameter to validate
	 * @param \WP_REST_Request $request The request object
	 * @param string           $key The parameter key
	 * @return bool Whether the parameter is valid
	 */
	public static function validate_boolean_like( $param, $request, $key ): bool {
		return in_array( $param, array( 'true', 'false', true, false, '0', '1', 0, 1 ), true );
	}
}
