import { useCallback, useRef } from '@wordpress/element';
import { useState } from 'react';

interface UseTotalWeightProps {
	currentShipmentId: string;
	shipmentWeight: number;
}

export const useTotalWeight = ( {
	currentShipmentId,
	shipmentWeight,
}: UseTotalWeightProps ) => {
	const [ totalWeight, setTotalWeight ] = useState<
		Record< string, number >
	>( {
		[ currentShipmentId ]: shipmentWeight || 0,
	} );

	const setShipmentTotalWeight = useCallback(
		( weight: number ) => {
			setTotalWeight( ( prev ) => ( {
				...prev,
				[ currentShipmentId ]: weight,
			} ) );
		},
		[ currentShipmentId ]
	);

	const getShipmentTotalWeight = useCallback(
		(): number => totalWeight[ currentShipmentId ],
		[ currentShipmentId, totalWeight ]
	);

	// Last computed (items + package) weight applied per shipment, so a remount does not override a manual entry.
	const appliedComputedWeight = useRef< Record< string, number > >( {} );

	const applyComputedTotalWeight = useCallback(
		( weight: number ) => {
			if (
				appliedComputedWeight.current[ currentShipmentId ] === weight
			) {
				return;
			}
			appliedComputedWeight.current[ currentShipmentId ] = weight;
			setShipmentTotalWeight( weight );
		},
		[ currentShipmentId, setShipmentTotalWeight ]
	);

	return {
		getShipmentTotalWeight,
		setShipmentTotalWeight,
		applyComputedTotalWeight,
	};
};
