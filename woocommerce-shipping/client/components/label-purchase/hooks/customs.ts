import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
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
	getShipmentItems: ReturnType<
		typeof useShipmentState
	>[ 'getShipmentItems' ],
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
		items: getShipmentItems().map( () => ( {} ) ),
	} );

	const getCustomsItems = useCallback(
		( shipmentId = currentShipmentId ) =>
			getShipmentItems( shipmentId )?.map( ( props ) => ( {
				...props,
				description:
					props.meta?.customs_info?.description ?? props.name,
				hsTariffNumber:
					props.meta?.customs_info?.hs_tariff_number ?? '',
				originCountry:
					props.meta?.customs_info?.origin_country ?? origin.country,
			} ) ),
		[ getShipmentItems, currentShipmentId, origin.country ]
	);

	const [ state, setState ] = useState<
		Record< typeof currentShipmentId, CustomsState >
	>( {
		[ currentShipmentId ]:
			storedCustomsInformationForShipment ??
			getInitialShipmentCustomsState( getCustomsItems() ),
	} );

	const previousStateRef = useRef( state );
	/**
	 * Make sure on shipment change, the shipment has the correct customs information
	 * - If the shipment has no customs information, set it to the default
	 * - If the shipment has customs information, set it to the stored information
	 */
	useEffect( () => {
		const allTheCustomItems = (
			previousStateRef.current
				? Object.values( previousStateRef.current )
				: Object.values( state )
		)
			.map( ( { items } ) => items )
			.flat();

		const currentShipmentCustomsInfo =
			select( labelPurchaseStore ).getCustomsInformation(
				currentShipmentId
			) ??
			getInitialShipmentCustomsState(
				getCustomsItems().map(
					( item ) =>
						allTheCustomItems.find(
							( i ) => i.product_id === item.product_id
						) ?? item
				)
			);

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

	/**
	 * Update the customs state based on the shipment items.
	 * This is to be called when the shipment items change.
	 */
	const updateCustomsItems = () => {
		previousStateRef.current = state; // Store previous state reference for comparison

		// Flatten the customs items from all shipments to avoid redundant iterations
		const allCustomItems = Object.values( state ).flatMap(
			( { items } ) => items
		);

		// Reduce over the state and update the customs items for each shipment
		const newState = Object.entries( state ).reduce(
			( acc, [ shipmentId, customsState ] ) => {
				// Get the customs items for the current shipmentId
				const customsItems = getCustomsItems( shipmentId );

				// If no customs items, return the accumulator as-is (shipment not eligible for customs)
				if ( ! customsItems ) {
					return acc;
				}

				// Map over the customs items and merge with existing items if found
				const updatedItems = customsItems.map( ( customsItem ) => {
					// Try to find the customs item in the current shipment or across all shipments
					const existingItem =
						customsState.items.find(
							( item ) =>
								item.product_id === customsItem.product_id
						) ??
						allCustomItems.find(
							( item ) =>
								item.product_id === customsItem.product_id
						);

					// Merge customs item with existing data (if any), otherwise use new customs item
					return {
						...customsItem,
						...( existingItem ?? {} ), // Retain existing values if present
					};
				} );

				// Return updated state for this shipment
				return {
					...acc,
					[ shipmentId ]: {
						...customsState,
						items: updatedItems,
					},
				};
			},
			{} as typeof state
		);

		// Update the state with the new customs data
		setState( newState );
	};

	return {
		getCustomsState,
		setCustomsState,
		maybeApplyCustomsToPackage,
		hasErrors,
		setErrors,
		isCustomsNeeded,
		isHSTariffNumberRequired,
		updateCustomsItems,
	};
}
