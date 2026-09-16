import { getConnectServerErrorCodes } from 'utils/config';
import { LabelPurchaseError } from 'types';

/**
 * Id of the container at the top of the label purchase flow that flow-level
 * notices portal into. The next design renders it around its status notices;
 * the current design renders it above the items in the left column.
 */
export const STATUS_NOTICES_CONTAINER_ID = 'label-purchase-status-notices';

/**
 * Errors describing a problem with the store rather than with this particular
 * purchase.
 *
 * These are not answered by changing the package, the rate or the payment
 * method, so showing them beneath the purchase button puts the explanation
 * next to controls that cannot resolve it - and, below the fold, often out of
 * sight entirely. They belong at the top of the flow instead, above the items
 * (WOOSHIP-2373).
 */
const getFlowLevelErrorCodes = (): string[] => {
	const { ORIGIN_ADDRESS_LIMIT_REACHED } = getConnectServerErrorCodes();

	return [ ORIGIN_ADDRESS_LIMIT_REACHED ].filter( ( code ): code is string =>
		Boolean( code )
	);
};

/**
 * Whether an error should be rendered at the top of the label purchase flow
 * rather than inline beneath the purchase button.
 *
 * @param error Error currently being displayed, if any.
 */
export const isFlowLevelError = (
	error?: LabelPurchaseError | null
): boolean =>
	Boolean( error?.code && getFlowLevelErrorCodes().includes( error.code ) );
