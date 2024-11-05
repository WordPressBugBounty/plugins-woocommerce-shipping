import { WeightUnit } from 'types';
import { WEIGHT_UNITS } from './constants';

export const convertWeightToUnit = (
	weight: number,
	oldUnit: WeightUnit,
	newUnit: WeightUnit
) => {
	if ( oldUnit === newUnit ) {
		return weight;
	}

	// Conversion factors to grams
	const toGrams: Record< WeightUnit, number > = {
		[ WEIGHT_UNITS.OZ ]: 28.3495,
		[ WEIGHT_UNITS.LBS ]: 453.592,
		[ WEIGHT_UNITS.KG ]: 1000,
		[ WEIGHT_UNITS.G ]: 1,
	};

	// Convert to grams then to target unit
	return ( weight * toGrams[ oldUnit ] ) / toGrams[ newUnit ];
};
