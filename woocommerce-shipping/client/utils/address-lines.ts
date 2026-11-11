/**
 * Longest apartment, suite, etc. line the destination form accepts.
 *
 * The strictest carrier limit we know of: the UPS Shipping API caps each
 * `AddressLine` at 35 characters (USPS Labels v3 allows 50). Values that
 * reach the order from elsewhere (checkout, REST, mobile) are not capped
 * here; the carrier applies its own limit at label purchase.
 */
export const ADDRESS_2_MAX_LENGTH = 35;

/**
 * Longest secondary line the split still handles, in characters and words.
 *
 * The split builds a regular expression from the unit, and a huge value makes
 * the engine refuse the pattern. Checkout and the Store API do not cap
 * `address_2`, so a customer can store thousands of characters there. Such a
 * line is no unit, so both lines are returned unchanged instead.
 */
export const ADDRESS_2_SPLIT_MAX_LENGTH = 200;
export const ADDRESS_2_SPLIT_MAX_WORDS = 50;

const escapeRegExp = ( value: string ) =>
	value.replace( /[.*+?^${}()|[\]\\/]/g, '\\$&' );

/**
 * Splits a street line that may also carry the secondary line back into two lines.
 *
 * Mirrors `AddressUtils::separate_address_lines()` in PHP, so the client and
 * the server split a street line the same way. When `line2` is not empty
 * (case and spacing are ignored):
 * - `line1` ends with one or more `", <line2>"` copies: they are removed and
 *   `line2` is kept.
 * - `line1` already ends with `" <line2>"` and `line2` has two or more words
 *   (for example `"350 5TH AVE STE 3000"` with `"Ste 3000"`): the suffix is
 *   removed from `line1` and `line2` is kept.
 * - Otherwise both lines are returned unchanged (trimmed).
 *
 * @param line1 Street line, possibly joined with the secondary line.
 * @param line2 Secondary line (apartment, suite, unit).
 * @return The street line and the secondary line.
 */
export const separateAddressLines = (
	line1 = '',
	line2 = ''
): [ string, string ] => {
	const street = line1.trim();
	const unit = line2.trim();

	if ( ! street || ! unit ) {
		return [ street, unit ];
	}

	if ( unit.length > ADDRESS_2_SPLIT_MAX_LENGTH ) {
		return [ street, unit ];
	}

	const words = unit.split( /\s+/ );
	if ( words.length > ADDRESS_2_SPLIT_MAX_WORDS ) {
		return [ street, unit ];
	}

	const pattern = words.map( escapeRegExp ).join( '\\s+' );

	const withoutCopies = street.replace(
		new RegExp( `(?:\\s*,\\s*${ pattern })+\\s*,?\\s*$`, 'iu' ),
		''
	);
	if ( withoutCopies !== street ) {
		const stripped = withoutCopies.replace( /[\s,]+$/, '' );
		if ( stripped ) {
			return [ stripped, unit ];
		}
	}

	if ( words.length > 1 ) {
		const withoutSuffix = street.replace(
			new RegExp( `\\s+${ pattern }\\s*$`, 'iu' ),
			''
		);
		if ( withoutSuffix !== street && withoutSuffix.trim() ) {
			return [ withoutSuffix.trim(), unit ];
		}
	}

	return [ street, unit ];
};

/**
 * Joins a street line and a secondary line into one line, with the unit once.
 *
 * @param line1 Street line, possibly already joined with the secondary line.
 * @param line2 Secondary line (apartment, suite, unit).
 * @return `"<line1>, <line2>"`, or the street line alone when there is no unit.
 */
export const joinAddressLines = ( line1 = '', line2 = '' ): string => {
	const [ street, unit ] = separateAddressLines( line1, line2 );
	if ( ! unit ) {
		return street;
	}
	return street ? `${ street }, ${ unit }` : unit;
};
