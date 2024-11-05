import { numberFormat } from '@woocommerce/number';
import {
	Flex,
	FlexBlock,
	__experimentalInputControl as InputControl,
	SelectControl,
} from '@wordpress/components';
import { isNumber } from 'lodash';
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';
import { getWeightUnit, convertWeightToUnit, WEIGHT_UNITS } from 'utils';
import { useLabelPurchaseContext } from './context';
import { WeightUnit } from 'types';

const formatNumber = ( val: string | number ) =>
	numberFormat(
		{
			precision: 2,
			thousandSeparator: '',
		},
		Number( val )
	);
export const TotalWeight = ( { packageWeight = 0 } ) => {
	const defaultUnit = getWeightUnit();
	const {
		weight: {
			getShipmentWeight,
			getShipmentTotalWeight,
			setShipmentTotalWeight,
		},
		rates: { isFetching, errors, setErrors },
	} = useLabelPurchaseContext();

	useEffect( () => {
		setShipmentTotalWeight( getShipmentWeight() + Number( packageWeight ) );
		// reset errors on initial render to avoid false positives on context switch
		if ( errors.totalWeight !== false ) {
			setErrors( () => ( {
				...errors,
				totalWeight: false,
			} ) );
		}

		// This effect should not run on `errors` change, so it's removed from the dependency array
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		packageWeight,
		getShipmentWeight,
		setShipmentTotalWeight,
		setErrors,
	] );

	const fieldName = 'totalWeight';

	const [ weightUnit, setWeightUnit ] = useState( () => {
		const weight = getShipmentWeight();
		if ( weight === 0 ) {
			return defaultUnit;
		}

		const isMetric =
			defaultUnit === WEIGHT_UNITS.KG || defaultUnit === WEIGHT_UNITS.G;
		const smallerUnit = isMetric ? WEIGHT_UNITS.G : WEIGHT_UNITS.OZ;
		const largerUnit = isMetric ? WEIGHT_UNITS.KG : WEIGHT_UNITS.LBS;
		const threshold = isMetric ? 1000 : 16;

		const smallerValue = convertWeightToUnit(
			weight,
			defaultUnit,
			smallerUnit
		);
		return smallerValue < threshold ? smallerUnit : largerUnit;
	} );

	const props = {
		onChange: ( val: string | undefined ) => {
			const { ...newErrors } = errors;
			delete newErrors[ fieldName ];
			setErrors( newErrors );
			// Total weight should be set in default unit
			setShipmentTotalWeight(
				convertWeightToUnit( Number( val ), weightUnit, defaultUnit )
			);
		},
		value: formatNumber(
			convertWeightToUnit(
				getShipmentTotalWeight(),
				defaultUnit,
				weightUnit
			)
		),
		className: errors[ fieldName ]
			? 'package-total-weight has-error'
			: 'package-total-weight',
		onValidate: ( value: string ) => {
			const float = parseFloat( value );
			setErrors( {
				...errors,
				[ fieldName ]: ! isNumber( float ) || float <= 0,
			} );
		},
		help:
			errors[ fieldName ] &&
			typeof errors[ fieldName ] === 'object' &&
			'message' in errors[ fieldName ]
				? errors[ fieldName ].message
				: '',
	};

	const onUnitChange = ( newUnit: WeightUnit ) => {
		setWeightUnit( newUnit );
	};

	const weightUnitOptions = Object.values( WEIGHT_UNITS ).map( ( unit ) => ( {
		label: unit,
		value: unit,
	} ) );

	return (
		<FlexBlock>
			<Flex gap={ 3 } align="flex-end">
				<InputControl
					label={ __(
						'Total shipment weight (with package)',
						'woocommerce-shipping'
					) }
					type="number"
					disabled={ isFetching }
					step={ [ 'g', 'oz' ].includes( weightUnit ) ? 1 : 0.1 }
					min={ formatNumber(
						convertWeightToUnit(
							getShipmentWeight(),
							defaultUnit,
							weightUnit
						)
					) }
					{ ...props }
				/>
				<SelectControl
					className="package-total-weight-unit"
					value={ weightUnit }
					options={ weightUnitOptions }
					disabled={ isFetching }
					onChange={ onUnitChange }
					__nextHasNoMarginBottom
				/>
			</Flex>
		</FlexBlock>
	);
};
