import { __ } from '@wordpress/i18n';
import { getConnectServerErrorCodes } from 'utils/config';
import { LabelPurchaseError } from 'types';

interface CarrierStrategyError {
	code?: string;
	message?: string;
}

export interface UPSDAPTosFailure {
	/**
	 * Whether the terms modal should be dismissed rather than left open for
	 * the merchant to retry.
	 */
	closeModal: boolean;
	error: LabelPurchaseError;
}

/**
 * Decide how to present a failed UPS terms acceptance.
 *
 * Terms acceptance rides on the origin-address save, so failures here are not
 * always about the terms. When the site is at its origin-address cap the
 * Connect Server answers with a 403 the merchant cannot resolve by retrying,
 * and leaving the modal open invites exactly that retry — one merchant made 31
 * attempts over 19.5 hours against an identical 403 (WOOSHIP-2373). For those,
 * dismiss the modal and relay the server's own message, which points at
 * support. Everything else keeps the retryable terms-acceptance copy.
 *
 * @param failure Error body from the carrier-strategy endpoint.
 */
export const getUPSDAPTosFailure = (
	failure: CarrierStrategyError | null | undefined
): UPSDAPTosFailure => {
	const { ORIGIN_ADDRESS_LIMIT_REACHED } = getConnectServerErrorCodes();

	if (
		ORIGIN_ADDRESS_LIMIT_REACHED &&
		failure?.code === ORIGIN_ADDRESS_LIMIT_REACHED
	) {
		return {
			closeModal: true,
			error: {
				cause: 'carrier_error',
				code: failure.code,
				// An absent or blank server message still needs to say something
				// actionable, so fall back rather than render an empty notice.
				message: [
					failure.message?.trim()
						? failure.message
						: __(
								'You have reached the maximum number of origin addresses for this site. Please contact WooCommerce support if you need to create more origin addresses.',
								'woocommerce-shipping'
						  ),
				],
			},
		};
	}

	return {
		closeModal: false,
		error: {
			cause: 'carrier_error',
			message: [
				__(
					'We were unable to update your acceptance of the UPS® Terms and Conditions. Please try again later or contact WooCommerce support if the issue persists.',
					'woocommerce-shipping'
				),
			],
		},
	};
};
