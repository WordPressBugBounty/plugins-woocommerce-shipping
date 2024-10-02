import { useCallback, useEffect, useState } from '@wordpress/element';
import { dispatch, select as selectData, useSelect } from '@wordpress/data';
import {
	getCurrentOrderShipments,
	getFirstSelectableOriginAddress,
} from 'utils';
import { LabelShipmentIdMap, OriginAddress, ShipmentItem } from 'types';
import { addressStore } from 'data/address';
import { labelPurchaseStore } from 'data/label-purchase';
import { invert } from 'lodash';

export function useShipmentState() {
	const [ currentShipmentId, setCurrentShipmentId ] = useState( '0' );
	const [ shipments, updateShipments ] = useState<
		Record< string, ShipmentItem[] >
	>( getCurrentOrderShipments() );
	const [ selections, setSelection ] = useState<
		Record< string, ShipmentItem[] >
	>( {
		0: [],
	} );

	const [ shipmentOrigins, setShipmentOrigins ] = useState<
		Record< string, OriginAddress | undefined >
	>( {
		0: getFirstSelectableOriginAddress(),
	} );

	const setShipmentOrigin = useCallback(
		( originId: string ) => {
			const origins = selectData( addressStore ).getOriginAddresses();
			const origin = origins.find( ( a ) => a.id === originId );

			if ( ! origin ) {
				return;
			}

			setShipmentOrigins( ( prevState ) => ( {
				...prevState,
				[ currentShipmentId ]: origin,
			} ) );
		},
		[ currentShipmentId ]
	);

	// The most recently purchased label, that has not been refunded.
	const activePurchasedLabel =
		selectData( labelPurchaseStore ).getPurchasedLabel( currentShipmentId );

	const purchasedLabelOrigin = useSelect(
		( select ) =>
			select( labelPurchaseStore ).getLabelOrigins( currentShipmentId ),
		[ currentShipmentId, activePurchasedLabel ]
	);

	const purchasedLabelDestination = useSelect(
		( select ) =>
			select( labelPurchaseStore ).getLabelDestinations(
				currentShipmentId
			),
		[ currentShipmentId, activePurchasedLabel ]
	);

	const orderDestination = useSelect(
		( select ) => select( addressStore ).getOrderDestination(),
		[ currentShipmentId, activePurchasedLabel ]
	);

	useEffect( () => {
		// Fetching the origin and destination addresses for the most recently purchased label doesn't check
		// if it has been refunded or not, so we check for "activePurchasedLabel" as well.
		if ( activePurchasedLabel && purchasedLabelOrigin ) {
			setShipmentOrigin( purchasedLabelOrigin.id );
		} else if ( ! shipmentOrigins[ currentShipmentId ] ) {
			setShipmentOrigin( getFirstSelectableOriginAddress().id );
		}
	}, [
		currentShipmentId,
		activePurchasedLabel,
		purchasedLabelOrigin,
		purchasedLabelDestination,
		shipments,
		setShipmentOrigin,
		orderDestination,
		shipmentOrigins,
	] );

	const [ labelShipmentIdsToUpdate, setLabelShipmentIdsToUpdate ] =
		useState< LabelShipmentIdMap >( {} );

	const getShipmentWeight = useCallback(
		() =>
			shipments[ currentShipmentId ].reduce(
				( acc, { weight, quantity } ) =>
					acc + Number( weight || 0 ) * Number( quantity ),
				0
			),
		[ shipments, currentShipmentId ]
	);

	const resetSelections = ( shipmentIds: string[] ) => {
		setSelection(
			shipmentIds.reduce(
				( acc, key ) => ( { ...acc, [ key ]: [] } ),
				{}
			)
		);
	};

	const getShipmentItems = useCallback(
		( shipmentId = currentShipmentId ) => shipments[ shipmentId ],
		[ shipments, currentShipmentId ]
	);

	const getShipmentOrigin = useCallback( () => {
		if ( activePurchasedLabel && purchasedLabelOrigin ) {
			return purchasedLabelOrigin;
		}

		return (
			shipmentOrigins[ currentShipmentId ] ??
			getFirstSelectableOriginAddress()
		);
	}, [
		activePurchasedLabel,
		currentShipmentId,
		purchasedLabelOrigin,
		shipmentOrigins,
	] );

	const getShipmentDestination = useCallback( () => {
		if ( activePurchasedLabel && purchasedLabelDestination ) {
			return purchasedLabelDestination;
		}

		return orderDestination;
	}, [ activePurchasedLabel, orderDestination, purchasedLabelDestination ] );

	const setShipments = (
		newShipments: Record< string, ShipmentItem[] >,
		updatedShipmentIds?: LabelShipmentIdMap
	) => {
		if ( updatedShipmentIds ) {
			setLabelShipmentIdsToUpdate( updatedShipmentIds );
			dispatch( labelPurchaseStore ).stageLabelsNewShipmentIds(
				updatedShipmentIds
			);
		}

		updateShipments( newShipments );
	};

	const revertLabelShipmentIdsToUpdate = () => {
		dispatch( labelPurchaseStore ).stageLabelsNewShipmentIds(
			invert( labelShipmentIdsToUpdate )
		);
		setLabelShipmentIdsToUpdate( {} );
	};

	return {
		shipments,
		setShipments,
		getShipmentWeight,
		resetSelections,
		selections,
		setSelection,
		currentShipmentId,
		setCurrentShipmentId,
		getShipmentItems,
		getShipmentOrigin,
		setShipmentOrigin,
		getShipmentDestination,
		revertLabelShipmentIdsToUpdate,
		labelShipmentIdsToUpdate,
	};
}
