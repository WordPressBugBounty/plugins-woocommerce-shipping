import { numberFormat } from '@woocommerce/number';
import {
	Flex,
	FlexBlock,
	__experimentalInputControl as InputControl,
	__experimentalInputControlSuffixWrapper as InputControlSuffixWrapper,
	SelectControl,
} from '@wordpress/components';
import _, { isNumber } from 'lodash';
import { __, sprintf } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';
import {
	getWeightUnit,
	convertWeightToUnit,
	WEIGHT_UNITS,
	minWeightThresholds,
} from 'utils';
import { useLabelPurchaseContext } from 'context/label-purchase';
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
		nextDesign,
	} = useLabelPurchaseContext();

	const shipmentWeight = getShipmentWeight();

	const fieldName = 'totalWeight';

	const [ weightUnit, setWeightUnit ] = useState< WeightUnit >( () => {
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

	const minValue = Math.max(
		minWeightThresholds[ weightUnit ] || 0,
		convertWeightToUnit( getShipmentWeight(), defaultUnit, weightUnit )
	);

	useEffect( () => {
		const totalWeight = shipmentWeight + Number( packageWeight );
		if ( totalWeight >= minValue ) {
			setShipmentTotalWeight( totalWeight );
		}
		// reset errors on initial render to avoid false positives on context switch
		if ( errors.totalWeight !== false ) {
			setErrors( () => ( {
				...errors,
				totalWeight: false,
			} ) );
		}

		// This effect should not run on `errors` change, so it's removed from the dependency array
		// This should not run on minValue change, so it's removed from the dependency array
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ packageWeight, shipmentWeight, setShipmentTotalWeight, setErrors ] );

	const props = {
		onChange: ( val: string | undefined ) => {
			const value = Number( val );
			if ( value < minWeightThresholds[ weightUnit ] ) {
				return;
			}

			const { ...newErrors } = errors;
			delete newErrors[ fieldName ];
			setErrors( newErrors );

			// Total weight should be set in default unit
			setShipmentTotalWeight(
				convertWeightToUnit( value, weightUnit, defaultUnit )
			);
		},
		value: nextDesign
			? undefined
			: formatNumber(
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
			const threshold = minWeightThresholds[ weightUnit ];
			if ( float < threshold ) {
				setErrors( {
					...errors,
					[ fieldName ]: {
						message: sprintf(
							// translators: %s: minimum weight, %s: weight unit
							__(
								'Weight must be greater than or equal to %1$s %2$s',
								'woocommerce-shipping'
							),
							threshold,
							weightUnit
						),
					},
				} );
				return;
			}

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

	const shipmentWeightInLbs = convertWeightToUnit(
		getShipmentTotalWeight(),
		defaultUnit,
		WEIGHT_UNITS.LBS
	);

	const [ weightLbs, setWeightLbs ] = useState(
		Math.floor( shipmentWeightInLbs )
	);
	const [ weightOz, setWeightOz ] = useState(
		Math.round( ( shipmentWeightInLbs - weightLbs ) * 16 )
	);

	const weightUnitOptions = Object.values( WEIGHT_UNITS ).map( ( unit ) => ( {
		label: unit,
		value: unit,
	} ) );

	useEffect( () => {
		if ( nextDesign ) {
			const totalWeightInLbs = weightLbs + weightOz / 16;
			if ( totalWeightInLbs >= minValue ) {
				setShipmentTotalWeight(
					convertWeightToUnit(
						totalWeightInLbs,
						WEIGHT_UNITS.LBS,
						defaultUnit
					)
				);
			}
		}
	}, [
		weightLbs,
		weightOz,
		defaultUnit,
		nextDesign,
		setShipmentTotalWeight,
		minValue,
	] );

	return (
		<FlexBlock>
			{ nextDesign ? (
				<Flex
					direction="row"
					justify="flex-start"
					align="flex-end"
					gap={ nextDesign ? 4 : 0 }
					style={ { maxWidth: 326 } }
				>
					<FlexBlock>
						<InputControl
							label={ __(
								'Total Shipment Weight',
								'woocommerce-shipping'
							) }
							suffix={
								<InputControlSuffixWrapper>
									{ WEIGHT_UNITS.LBS }
								</InputControlSuffixWrapper>
							}
							type="number"
							min={ 0 }
							step={ 1 }
							{ ..._.omit( props, 'value', 'onChange' ) }
							value={ weightLbs.toString() }
							onChange={ ( val ) => {
								setWeightLbs( Number( val ) );
							} }
							__next40pxDefaultSize={ true }
						/>
					</FlexBlock>
					<FlexBlock>
						<InputControl
							label={ null }
							type="number"
							suffix={
								<InputControlSuffixWrapper>
									{ WEIGHT_UNITS.OZ }
								</InputControlSuffixWrapper>
							}
							min={ 0 }
							step={ 1 }
							max={ 15 }
							{ ..._.omit( props, 'value', 'onChange' ) }
							value={ weightOz.toString() }
							onChange={ ( val ) => {
								setWeightOz( Number( val ) );
							} }
							__next40pxDefaultSize={ true }
						/>
					</FlexBlock>
				</Flex>
			) : (
				<Flex gap={ 3 } align="flex-start">
					<InputControl
						label={ __(
							'Total shipment weight (with package)',
							'woocommerce-shipping'
						) }
						type="number"
						disabled={ isFetching }
						step={ [ 'g', 'oz' ].includes( weightUnit ) ? 1 : 0.1 }
						min={ minValue }
						{ ...props }
						__next40pxDefaultSize={ true }
					/>
					<SelectControl
						label={
							// should get hidden by css
							__( 'Unit', 'woocommerce-shipping' )
						}
						className="package-total-weight-unit"
						value={ weightUnit }
						options={ weightUnitOptions }
						disabled={ isFetching }
						onChange={ onUnitChange }
						// Opting into the new styles for margin bottom
						__nextHasNoMarginBottom={ true }
						// Opting into the new styles for height
						__next40pxDefaultSize={ true }
					/>
				</Flex>
			) }
		</FlexBlock>
	);
};
