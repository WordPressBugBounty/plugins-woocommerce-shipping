import { mapValues, sortBy, snakeCase } from 'lodash';
import { useCallback, useState } from '@wordpress/element';
import { dispatch, select, useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import {
	Carrier,
	CustomPackage,
	Package,
	Rate,
	RateWithParent,
	RecordValues,
	RequestPackage,
	WPErrorRESTResponse,
} from 'types';
import { getAccountSettings, getCurrentOrder, setAccountSettings } from 'utils';
import { labelPurchaseStore } from 'data/label-purchase';
import { CUSTOM_BOX_ID_PREFIX, PACKAGE_TYPES } from '../packages';
import type { usePackageState } from './packages';
import { useHazmatState } from './hazmat';
import { useCustomsState } from './customs';
import { useShipmentState } from './shipment';
import { RATES_FETCH_FAILED } from 'data/label-purchase/action-types';
import { LABEL_RATE_TYPE } from 'data/constants';

interface UseRatesStateProps {
	currentShipmentId: string;
	currentPackageTab: string;
	getPackageForRequest: ReturnType<
		typeof usePackageState
	>[ 'getPackageForRequest' ];
	applyHazmatToPackage: ReturnType<
		typeof useHazmatState
	>[ 'applyHazmatToPackage' ];
	totalWeight: number;
	customs: ReturnType< typeof useCustomsState >;
	getShipmentOrigin: ReturnType<
		typeof useShipmentState
	>[ 'getShipmentOrigin' ];
}

/**
 * This regexp is intended to catch field errors in the format of "%1$s must be greater than %2$d."
 *
 * @see maybeReformatInvalidParamError
 * @see rest_validate_value_from_schema() in wp-includes/rest-api.php
 */
const restInvalidParamErrorMessageRegexp = /^([^\s]+) (.+)$/;

/**
 * Mapping of section name as extracted using `restInvalidParamErrorMessageRegexp` to a human-readable name.
 */
const ratesEndpointArgToSectionNameMap: Record< string, string > = {
	origin: __( 'Origin address', 'woocommerce-shipping' ),
	destination: __( 'Destination address', 'woocommerce-shipping' ),
};

/**
 * Mapping of field name as extracted using `restInvalidParamErrorMessageRegexp` to a human-readable name.
 */
const ratesEndpointArgToFieldDescriptionMap: Record< string, string > = {
	'packages[0][length]': __( 'Package length', 'woocommerce-shipping' ),
	'packages[0][width]': __( 'Package width', 'woocommerce-shipping' ),
	'packages[0][height]': __( 'Package height', 'woocommerce-shipping' ),
	'packages[0][weight]': __( 'Package weight', 'woocommerce-shipping' ),
};

const maybePrependSectionName = (
	errorMessage: string,
	sectionName?: string
) => {
	if ( sectionName ) {
		return sprintf(
			// translators: %1$s The name of the form section containing the erroneous form field, %2$s is the error message.
			__( '%1$s: %2$s', 'woocommerce-shipping' ),
			sectionName,
			errorMessage
		);
	}

	return errorMessage;
};

/**
 * Parses REST endpoint errors with the code `rest_invalid_param` matching `restInvalidParamErrorMessageRegexp`.
 *
 * When detected, these will be reformatted to use human-readable field names, as defined in
 * `ratesEndpointArgToFieldDescriptionMap`.
 *
 * @param payload
 */
const maybeReformatInvalidParamError = ( payload: WPErrorRESTResponse ) => {
	if ( payload.code !== 'rest_invalid_param' ) {
		return null;
	}

	return Object.entries( payload.data.params )
		.map( ( [ erroneousSection, paramErrorMessage ] ) => {
			const sectionName =
				ratesEndpointArgToSectionNameMap[ erroneousSection ] ?? '';

			const regexpMatch = paramErrorMessage.match(
				restInvalidParamErrorMessageRegexp
			);

			if ( regexpMatch === null ) {
				return maybePrependSectionName(
					paramErrorMessage,
					sectionName
				);
			}

			const [ , fieldName, fieldError ] = regexpMatch;
			const mappedFieldName =
				ratesEndpointArgToFieldDescriptionMap[ fieldName ] ?? fieldName;

			return maybePrependSectionName(
				sprintf(
					// translators: %1$s The name of the form field that has an error (origin address or destination), %2$s is the error message, e.g. "must be greater than 0".
					__( '%1$s %2$s.', 'woocommerce-shipping' ),
					mappedFieldName,
					fieldError
				),
				sectionName
			);
		} )
		.join( '\n' );
};

export function useRatesState( {
	currentShipmentId,
	getPackageForRequest,
	applyHazmatToPackage,
	totalWeight,
	customs: { maybeApplyCustomsToPackage },
	getShipmentOrigin,
}: UseRatesStateProps ) {
	const accountSettings = getAccountSettings();
	const currentShipmentRates =
		select( labelPurchaseStore ).getSelectedRates();
	const [ selectedRates, selectRates ] = useState<
		Record<
			string,
			| {
					rate: Rate;
					parent: null | Rate;
			  }
			| null
			| undefined
		>
	>(
		currentShipmentRates ?? {
			0: null,
		}
	);

	const [ isFetching, setIsFetching ] = useState( false );
	const [ errors, setErrors ] = useState<
		Record<
			string | 'endpoint',
			| boolean
			| null
			| Record< string | 'rates' | 'message', string | string[] >
		>
	>( {} );

	const availableRates = useSelect(
		( selector ) => {
			return selector( labelPurchaseStore ).getRatesForShipment(
				currentShipmentId
			);
		},
		[ currentShipmentId ]
	);
	const selectRate = useCallback(
		( rate: Rate, parent?: Rate ) => {
			setAccountSettings( {
				...accountSettings,
				userMeta: {
					...accountSettings.userMeta,
					last_carrier_id: rate.carrierId,
					last_service_id: rate.serviceId,
				},
			} );
			return selectRates( ( prev ) => ( {
				...prev,
				[ currentShipmentId ]: {
					rate,
					parent: parent ?? null,
				},
			} ) );
		},
		[ accountSettings, currentShipmentId ]
	);

	const getSelectedRate = useCallback(
		() => selectedRates[ currentShipmentId ],
		[ currentShipmentId, selectedRates ]
	);

	/**
	 * Remove the currently selected shipment rate.
	 *
	 * This could be useful e.g. after a label has been refunded, and we want
	 * to remove the current selection.
	 */
	const removeSelectedRate = useCallback( () => {
		if ( selectedRates[ currentShipmentId ] ) {
			selectRates( {
				...selectedRates,
				[ currentShipmentId ]: null,
			} );
		}
	}, [ currentShipmentId, selectedRates ] );

	const preselectRateBasedOnLastSelections = useCallback( () => {
		if ( ! accountSettings.purchaseSettings.use_last_service ) {
			return;
		}
		const { last_carrier_id, last_service_id } = accountSettings.userMeta;
		const rates =
			select( labelPurchaseStore ).getRatesForShipment(
				currentShipmentId
			);

		if ( rates?.[ last_carrier_id ] ) {
			const ratesForService = rates[ last_carrier_id ];
			const selectableRate = ratesForService.find(
				( rate ) => rate.serviceId === last_service_id
			);

			if ( selectableRate ) {
				// Move the preselected rate to the first index
				const updatedRates = [
					selectableRate,
					...ratesForService.filter(
						( rate ) => rate !== selectableRate
					),
				];
				rates[ last_carrier_id ] = updatedRates;

				selectRate( selectableRate );
			}
		}
		return rates;
	}, [ currentShipmentId, selectRate, accountSettings ] );

	const fetchRates = useCallback(
		async (
			pkg: ( Package | CustomPackage ) & {
				isLetter?: boolean;
			}
		) => {
			setIsFetching( true );
			setErrors( { ...errors, endpoint: null } );
			selectRates( {
				0: null,
			} );

			const {
				type,
				isLetter,
				id = CUSTOM_BOX_ID_PREFIX,
				length,
				width,
				height,
			} = pkg;

			const dimensions = mapValues(
				{ length, width, height },
				parseFloat
			);
			const requestPackage: RequestPackage = {
				id: currentShipmentId,
				box_id: id,
				...dimensions,
				weight: totalWeight,
				is_letter: type
					? type === PACKAGE_TYPES.ENVELOPE
					: isLetter ?? false,
			};

			// @ts-ignore TODO: Convert getRates to TypeScript
			const { payload, type: responseType } = await dispatch(
				labelPurchaseStore
			).getRates( {
				packages: [
					maybeApplyCustomsToPackage(
						applyHazmatToPackage( requestPackage )
					),
				],
				orderId: getCurrentOrder().id,
				origin: getShipmentOrigin(),
			} );

			if ( responseType === RATES_FETCH_FAILED ) {
				setErrors( ( prev ) => ( {
					...prev,
					endpoint: {
						rates:
							maybeReformatInvalidParamError( payload ) ??
							payload?.message ??
							__(
								'There was an issue getting rates for this package, please try again.',
								'woocommerce-shipping'
							),
					},
				} ) );
			}

			const endpointErrors: {
				message: string;
			}[] = payload?.[ currentShipmentId ]?.default?.errors ?? [];

			if ( endpointErrors.length ) {
				setErrors( ( prev ) => ( {
					...prev,
					endpoint: {
						rates: [
							// Remove duplicate errors by using a Set as Sets can only contain unique values.
							...new Set(
								endpointErrors.map( ( { message } ) => message )
							),
						],
					},
				} ) );
			}

			setIsFetching( false );

			preselectRateBasedOnLastSelections();
		},
		[
			errors,
			currentShipmentId,
			totalWeight,
			maybeApplyCustomsToPackage,
			applyHazmatToPackage,
			getShipmentOrigin,
			preselectRateBasedOnLastSelections,
		]
	);

	/**
	 * Updates the rates based on the current package data
	 */
	const updateRates = useCallback( () => {
		// Not updating if still fetching and to prevent a double fetch at render, or if totalWeight is 0.
		if (
			isFetching ||
			typeof availableRates === 'undefined' ||
			totalWeight === 0 ||
			! Number.isFinite( parseFloat( `${ totalWeight }` ) ) // If any error occurs, totalWeight will be a string, null or undefined, so we need to convert it to a number.
		) {
			return;
		}

		const pkg = getPackageForRequest();

		/**
		 * Excluding the boxWeight and name fields from the check boxWeight is
		 * not a mandatory field since it can be 0, and we always use totalWeight
		 * name is not a mandatory field since it's only used for custom packages
		 */
		if ( ! pkg ) {
			return;
		}
		// eslint-disable-next-line no-unused-vars
		const { name, boxWeight, isUserDefined, ...mandatoryFields } = pkg;

		// Max weight is not a mandatory field since it can be 0, and if it's 0 it won't affect isAnyFieldEmpty
		if ( 'maxWeight' in mandatoryFields ) {
			delete mandatoryFields.maxWeight;
		}

		const isAnyFieldEmpty = Object.values< string | boolean >(
			mandatoryFields
		).some( ( field ) => ! field && typeof field !== 'boolean' );
		if ( ! isAnyFieldEmpty ) {
			fetchRates( pkg );
		}
	}, [
		fetchRates,
		availableRates,
		isFetching,
		getPackageForRequest,
		totalWeight,
	] );

	/**
	 * Sort Rates when filter dropdown is used.
	 * @param rates
	 * @return Sorted rates
	 */
	const sortRates = useCallback(
		( rates: Rate[], sortingBy: string ) => {
			let sortedRates = sortBy( rates, sortingBy );

			// Always put MediaMail at the bottom of the list.
			const mediaMailRate = sortedRates.find(
				( rate ) => rate && rate.serviceId === 'MediaMail'
			);
			if ( mediaMailRate ) {
				const filteredRates = sortedRates.filter(
					( rate ) => rate && rate.serviceId !== 'MediaMail'
				);
				sortedRates = [ ...filteredRates, mediaMailRate ];
			}
			if ( accountSettings.purchaseSettings.use_last_service ) {
				const last_service_id =
					accountSettings.userMeta.last_service_id;
				const selectableRate = sortedRates.find(
					( rate ) => rate.serviceId === last_service_id
				);

				if ( selectableRate ) {
					sortedRates = [
						selectableRate,
						...sortedRates.filter(
							( rate ) => rate !== selectableRate
						),
					];
				}
			}

			return sortedRates;
		},
		[
			accountSettings.purchaseSettings.use_last_service,
			accountSettings.userMeta.last_service_id,
		]
	);

	/**
	 * Reselect the rate and its parent.
	 * This is useful when we've refetched rates and we want to select the rate with the same serviceId and price.
	 *
	 * @param {RateWithParent} selectedRate - The rate that was previously selected, including its parent rate if applicable.
	 * @return {RateWithParent | false} The rate and its parent rate if found, or false if not found.
	 */
	const matchAndSelectRate = useCallback(
		( selectedRate: RateWithParent ): RateWithParent | false => {
			const allRatesForType = select(
				labelPurchaseStore
			).getRatesForShipment(
				currentShipmentId,
				snakeCase(
					selectedRate.rate.type ?? LABEL_RATE_TYPE.DEFAULT
				) as RecordValues< typeof LABEL_RATE_TYPE >
			);

			const foundRate = allRatesForType?.[
				selectedRate.rate.carrierId as Carrier
			]?.find(
				( rate ) =>
					rate.serviceId === selectedRate.rate.serviceId &&
					rate.rate === selectedRate.rate.rate
			);

			if ( ! foundRate ) {
				return false;
			}

			// Default parent rate is undefined.
			let parentRate = null;

			// If the rate is not the default rate, we need to find its parent rate.
			if (
				selectedRate.parent &&
				snakeCase( selectedRate.rate.type ) !== LABEL_RATE_TYPE.DEFAULT
			) {
				const allDefaultRates = select(
					labelPurchaseStore
				).getRatesForShipment(
					currentShipmentId,
					snakeCase(
						selectedRate.rate.type ?? LABEL_RATE_TYPE.DEFAULT
					) as RecordValues< typeof LABEL_RATE_TYPE >
				);
				parentRate = allDefaultRates?.[
					foundRate.carrierId as Carrier
				]?.find(
					( rate ) =>
						rate.serviceId === selectedRate.parent?.serviceId
				);

				// If the parent rate is not found, we don't reselect the rate.
				if ( ! parentRate ) {
					return false;
				}
			}

			selectRate( foundRate, parentRate ?? undefined );
			return {
				rate: foundRate,
				parent: parentRate,
			};
		},
		[ selectRate, currentShipmentId ]
	);

	return {
		selectedRates,
		selectRates,
		selectRate,
		getSelectedRate,
		removeSelectedRate,
		isFetching,
		updateRates,
		fetchRates,
		sortRates,
		errors,
		setErrors,
		matchAndSelectRate,
		availableRates,
		preselectRateBasedOnLastSelections,
	};
}
