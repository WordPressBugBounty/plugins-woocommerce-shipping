import { useCallback, useEffect, useState } from '@wordpress/element';
import { isEmpty } from 'lodash';
import {
	CustomsItem,
	CustomsState,
	RequestPackage,
	RequestPackageWithCustoms,
} from 'types';
import { select, useSelect } from '@wordpress/data';
import type { FormErrors } from '@woocommerce/components';
import { contentTypes } from '../customs/constants';
import {
	isCountryInEU,
	isCustomsRequired,
	isHSTariffNumberValid,
	sanitizeHSTariffNumber,
} from 'utils';
import { useShipmentState } from './shipment';
import { addressStore } from 'data/address';
import { labelPurchaseStore } from 'data/label-purchase';

const getInitialShipmentCustomsState = < T >( items: T ) => ( {
	items,
	contentsType: contentTypes[ 0 ].value,
	restrictionType: 'none',
	isReturnToSender: false,
	itn: '',
} );

export function useCustomsState(
	currentShipmentId: string,
	getCurrentShipmentItems: ReturnType<
		typeof useShipmentState
	>[ 'getCurrentShipment' ],
	getOrigin: ReturnType< typeof useShipmentState >[ 'getOrigin' ]
) {
	const origin = getOrigin() ?? select( addressStore ).getStoreOrigin();
	const destination = useSelect(
		( s ) => s( addressStore ).getDestination(),
		[ origin ]
	);

	const storedCustomsInformationForShipment = useSelect(
		( s ) =>
			s( labelPurchaseStore ).getCustomsInformation( currentShipmentId ),
		[ currentShipmentId ]
	);

	const isCustomsNeeded = useCallback(
		() => isCustomsRequired( origin, destination ),
		[ origin, destination ]
	);

	const [ errors, setErrors ] = useState<
		FormErrors< CustomsState > & {
			items: FormErrors< CustomsItem >[];
		}
	>( {
		items: getCurrentShipmentItems().map( () => ( {} ) ),
	} );

	const getCustomsItems = useCallback(
		(): CustomsItem[] =>
			getCurrentShipmentItems().map( ( props ) => ( {
				...props,
				description:
					props.meta?.customs_info?.description ?? props.name,
				hsTariffNumber:
					props.meta?.customs_info?.hs_tariff_number ?? '',
				originCountry:
					props.meta?.customs_info?.origin_country ?? origin.country,
			} ) ),
		[ getCurrentShipmentItems, origin ]
	);

	const [ state, setState ] = useState<
		Record< typeof currentShipmentId, CustomsState >
	>( {
		[ currentShipmentId ]:
			storedCustomsInformationForShipment ??
			getInitialShipmentCustomsState( getCustomsItems() ),
	} );

	/**
	 * Make sure on shipment change, the shipment has the correct customs information
	 * - If the shipment has no customs information, set it to the default
	 * - If the shipment has customs information, set it to the stored information
	 */
	useEffect( () => {
		const currentShipmentCustomsInfo =
			select( labelPurchaseStore ).getCustomsInformation(
				currentShipmentId
			) ?? getInitialShipmentCustomsState( getCustomsItems() );

		if ( isEmpty( state[ currentShipmentId ] ) ) {
			setState( ( prev ) => ( {
				...prev,
				[ currentShipmentId ]: currentShipmentCustomsInfo,
			} ) );
		}
	}, [ currentShipmentId, getCustomsItems, state ] );

	const getCustomsState = useCallback(
		() => state[ currentShipmentId ],
		[ state, currentShipmentId ]
	);
	const setCustomsState = useCallback(
		( newState: CustomsState ) => {
			setState( ( prev ) => ( {
				...prev,
				[ currentShipmentId ]: newState,
			} ) );
		},
		[ currentShipmentId ]
	);

	const maybeApplyCustomsToPackage = useCallback(
		< T = RequestPackage >(
			pkg: T
		): RequestPackageWithCustoms< T > | T => {
			if ( ! isCustomsNeeded() ) {
				return pkg;
			}
			const {
				contentsType: contents_type,
				contentsExplanation: contents_explanation,
				restrictionType: restriction_type,
				restrictionComments: restriction_comments,
				isReturnToSender,
				itn,
				items,
			} = getCustomsState();

			return {
				...pkg,
				contents_type,
				...( contents_type === 'other'
					? { contents_explanation }
					: {} ),
				restriction_type,
				...( restriction_type === 'other'
					? { restriction_comments }
					: {} ),
				non_delivery_option: isReturnToSender ? 'return' : 'abandon',
				itn,
				items: items.map(
					( {
						description,
						quantity,
						weight,
						hsTariffNumber,
						originCountry: origin_country,
						product_id,
						price,
					} ) => ( {
						description,
						quantity,
						weight: parseFloat( weight ),
						hs_tariff_number: sanitizeHSTariffNumber(
							hsTariffNumber ?? ''
						),
						origin_country,
						product_id,
						value: parseFloat( price ),
					} )
				),
			};
		},
		[ getCustomsState, isCustomsNeeded ]
	);

	const isHSTariffNumberRequired = useCallback( () => {
		const destinationAddress = select( addressStore ).getDestination();
		return destinationAddress
			? isCountryInEU( destinationAddress.country )
			: false;
	}, [] );

	const hasErrors = useCallback( () => {
		const { items, ...rest } = errors;

		if ( isHSTariffNumberRequired() ) {
			const { items: customItems } = getCustomsState();
			const hasInvalidHsTariff = customItems.some(
				( { hsTariffNumber } ) =>
					! isHSTariffNumberValid( hsTariffNumber )
			);
			if ( hasInvalidHsTariff ) {
				return true;
			}
		}
		return (
			Object.values( rest ).length ||
			items.some( ( i ) => Object.values( i ).length )
		);
	}, [ errors, getCustomsState, isHSTariffNumberRequired ] );

	return {
		getCustomsState,
		setCustomsState,
		maybeApplyCustomsToPackage,
		hasErrors,
		setErrors,
		isCustomsNeeded,
		isHSTariffNumberRequired,
	};
}
