import { useCallback, useState } from '@wordpress/element';
import { dispatch, select as selectData } from '@wordpress/data';
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

	const getCurrentShipment = useCallback(
		() => shipments[ currentShipmentId ],
		[ shipments, currentShipmentId ]
	);

	const setOrigin = useCallback(
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

	const getOrigin = () =>
		shipmentOrigins[ currentShipmentId ] ??
		getFirstSelectableOriginAddress();

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
		getCurrentShipment,
		getOrigin,
		setOrigin,
		revertLabelShipmentIdsToUpdate,
		labelShipmentIdsToUpdate,
	};
}
