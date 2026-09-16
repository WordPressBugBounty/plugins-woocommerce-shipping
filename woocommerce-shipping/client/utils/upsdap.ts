import { LabelPurchaseError, Rate } from 'types';

export const getUPSDAPTosApprovedVersionsFromError = (
	error: LabelPurchaseError | null
): string[] => error?.data?.acceptedVersions ?? [];

/**
 * Service ID the Connect Server uses for the UPS Ground Saver service.
 */
export const UPSDAP_GROUND_SAVER_SERVICE_ID = 'UPSGroundsaverGreaterThan1lb';

/**
 * A selected rate in either of the two shapes that reach the client: the
 * camel-cased form used in-session, and the Connect Server's snake_case form as
 * persisted in order meta.
 */
type GroundSaverRateShape = Partial<
	Pick< Rate, 'carrierId' | 'serviceId' >
> & {
	carrier_id?: string;
	service_id?: string;
};

/**
 * UPS Ground Saver packages travel through the UPS network and are handed to
 * USPS for the final mile in some cases, so the label shows both carriers.
 * Merchants must still hand the parcel to UPS: dropping it off at USPS leaves
 * the postage unpaid and the shipment untracked.
 */
export const isUPSGroundSaverRate = (
	rate?: GroundSaverRateShape | null
): boolean => {
	/**
	 * Rates fetched during the session are camel-cased, but the selected rate
	 * persisted in order meta keeps the Connect Server's snake_case keys and is
	 * seeded into state verbatim by the label-purchase reducer's default state.
	 * Both shapes therefore reach this helper - camel-case before a reload,
	 * snake_case after one.
	 */
	const carrierId = rate?.carrierId ?? rate?.carrier_id;
	const serviceId = rate?.serviceId ?? rate?.service_id;

	return (
		carrierId === 'upsdap' && serviceId === UPSDAP_GROUND_SAVER_SERVICE_ID
	);
};
