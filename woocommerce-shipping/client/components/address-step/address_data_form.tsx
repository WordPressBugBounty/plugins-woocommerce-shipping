import { useCallback, useEffect, useState, useMemo } from '@wordpress/element';
import {
	__experimentalSpacer as Spacer,
	__experimentalText as Text,
	__experimentalInputControl as InputControl,
	Button,
	Flex,
	Notice,
	SelectControl,
	CheckboxControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import {
	DataForm,
	DataFormControlProps,
	DeepPartial,
	Field,
	Form,
	FormField,
} from '@wordpress/dataviews/wp';
import { AddressContextProvider } from './context';
import { getCountryNames, getStateNames, isMailAndPhoneRequired } from 'utils';
import { ADDRESS_TYPES } from 'data/constants';
import {
	CamelCaseType,
	Destination,
	LocationResponse,
	AddressTypes,
} from 'types';
import { FormErrors } from '@woocommerce/components';
import _ from 'lodash';

interface AddressDataFormProps< T = Destination > {
	type: AddressTypes;
	initialValue: T;
	onSubmit: ( formData: T ) => Promise< void >;
	onCancel?: () => void;
	isUpdating: boolean;
	isVerified: boolean;
	validationErrors: Record< string, string >;
	showUPSDAPTOSWarning: boolean;
	validateAddressSection: ( values: T ) => FormErrors< T >;
	isSubmitButtonDisabled: ( {
		isDirty,
		isValidForm,
	}: {
		isDirty: boolean;
		isValidForm: boolean;
	} ) => boolean;
	originCountry?: string;
	onSaveWithoutValidation?: ( values: T ) => Promise< void >;
}

function FieldInput< T = Destination >( {
	data,
	field,
	onChange,
	hideLabelFromVision,
}: DataFormControlProps< T > ): React.ReactNode {
	// Map address to address1 for backwards compatibility
	const fieldValue =
		field.id === 'address'
			? data[ 'address1' as keyof T ] || data[ 'address' as keyof T ]
			: data[ field.id as keyof T ];

	const handleChange = ( value: string | undefined ) => {
		onChange( { [ field.id ]: value } as DeepPartial< T > );
	};

	return (
		<InputControl
			value={ fieldValue as string }
			label={ field.label }
			onChange={ handleChange }
			placeholder={ field.placeholder }
			hideLabelFromVision={ hideLabelFromVision }
			__next40pxDefaultSize
		/>
	);
}

function FieldSelect< T = Destination >( {
	data,
	field,
	onChange,
	options,
	hideLabelFromVision,
}: DataFormControlProps< T > & {
	options: { label: string; value: string }[];
} ): React.ReactNode {
	const fieldValue = data[ field.id as keyof T ];
	const handleChange = ( value: string | undefined ) => {
		onChange( { [ field.id ]: value } as DeepPartial< T > );
	};
	return (
		<SelectControl
			value={ fieldValue as string }
			options={ options }
			label={ field.label }
			hideLabelFromVision={ hideLabelFromVision }
			onChange={ handleChange }
			__next40pxDefaultSize
			__nextHasNoMarginBottom
		/>
	);
}

function FieldCheckbox< T = Destination >( {
	data,
	field,
	onChange,
}: DataFormControlProps< T > & {
	validationErrors?: Record< string, string >;
} ): React.ReactNode {
	const fieldValue = data[ field.id as keyof T ];
	const handleChange = ( value: boolean ) => {
		onChange( { [ field.id ]: value } as DeepPartial< T > );
	};
	return (
		<CheckboxControl
			label={ field.label }
			checked={ fieldValue as boolean }
			onChange={ handleChange }
		/>
	);
}

export function AddressDataForm<
	T extends CamelCaseType< LocationResponse >,
>( {
	type,
	initialValue,
	onSubmit,
	onCancel,
	isUpdating,
	isVerified,
	validationErrors,
	showUPSDAPTOSWarning,
	validateAddressSection,
	isSubmitButtonDisabled,
	originCountry,
}: AddressDataFormProps< T > ) {
	// State for DataForm
	const [ formData, setFormData ] = useState< T >( initialValue );
	const [ dataFormIsDirty, setDataFormIsDirty ] = useState( false );
	const [ formValidationErrors, setFormValidationErrors ] = useState<
		FormErrors< T >
	>( {} );

	// Handle form submission for DataForm
	const handleDataFormSubmit = async () => {
		await onSubmit( formData );
	};

	const allValidationErrors = {
		...validationErrors,
		...formValidationErrors,
	};
	const dataFormIsValid = Object.keys( formValidationErrors ).length === 0;

	// Get country and state options
	const countryNames = useMemo(
		() => getCountryNames( type, formData.country ),
		[ type, formData.country ]
	);
	const stateNames = useMemo(
		() => ( formData.country ? getStateNames( formData.country ) : [] ),
		[ formData.country ]
	);

	// Check if phone and email are required
	const isPhoneAndEmailRequired = useMemo(
		() =>
			isMailAndPhoneRequired( {
				type,
				originCountry,
				destinationCountry: formData.country,
			} ),
		[ type, originCountry, formData.country ]
	);

	const fields: Field< T >[] = useMemo(
		() => [
			{
				id: 'name',
				type: 'text',
				label:
					type === ADDRESS_TYPES.DESTINATION
						? __( 'Recipient Name', 'woocommerce-shipping' )
						: __( 'Name', 'woocommerce-shipping' ),
			},
			{
				id: 'company',
				type: 'text',
				label: __( 'Company', 'woocommerce-shipping' ),
				isVisible: () => type === ADDRESS_TYPES.ORIGIN,
			},
			{
				id: 'address',
				type: 'text',
				placeholder: __( 'Address', 'woocommerce-shipping' ),
				label:
					type === ADDRESS_TYPES.DESTINATION
						? __( 'Shipping Address', 'woocommerce-shipping' )
						: __( 'Address', 'woocommerce-shipping' ),
			},
			{
				id: 'address2',
				type: 'text',
				placeholder: __(
					'Apartment, suite, etc.',
					'woocommerce-shipping'
				),
				isVisible: () => type === ADDRESS_TYPES.DESTINATION,
				Edit: ( props ) => (
					<FieldInput< T > { ...props } hideLabelFromVision />
				),
			},
			{
				id: 'city',
				type: 'text',
				placeholder: __( 'City', 'woocommerce-shipping' ),
				Edit: ( props ) => (
					<FieldInput< T > { ...props } hideLabelFromVision />
				),
			},
			{
				id: 'state',
				type: 'text',
				label: __( 'State', 'woocommerce-shipping' ),
				placeholder: __( 'State', 'woocommerce-shipping' ),
				Edit: ( props ) =>
					stateNames.length > 0 ? (
						<FieldSelect< T >
							{ ...props }
							options={ stateNames }
							hideLabelFromVision
						/>
					) : (
						<FieldInput< T > { ...props } hideLabelFromVision />
					),
			},
			{
				id: 'postcode',
				type: 'text',
				placeholder: __( 'Postal Code', 'woocommerce-shipping' ),
				Edit: ( props ) => (
					<FieldInput< T > { ...props } hideLabelFromVision />
				),
			},
			{
				id: 'country',
				type: 'text',
				label: __( 'Country', 'woocommerce-shipping' ),
				Edit: ( props ) => (
					<FieldSelect< T >
						{ ...props }
						options={ countryNames }
						hideLabelFromVision
					/>
				),
			},
			{
				id: 'email',
				type: 'text',
				label: isPhoneAndEmailRequired
					? __( 'Email', 'woocommerce-shipping' )
					: __( 'Email (optional)', 'woocommerce-shipping' ),
				Edit: ( props ) => <FieldInput< T > { ...props } />,
			},
			{
				id: 'phone',
				type: 'text',
				label: __( 'Phone', 'woocommerce-shipping' ),
				Edit: ( props ) => <FieldInput< T > { ...props } />,
			},
			// Add Save as default checkbox only for origin addresses
			{
				id: 'defaultAddress',
				type: 'boolean',
				label: __(
					'Save as default origin address',
					'woocommerce-shipping'
				),
				isVisible: () => type === ADDRESS_TYPES.ORIGIN,
				Edit: ( props ) => <FieldCheckbox< T > { ...props } />,
			},
			{
				id: 'defaultReturnAddress',
				type: 'boolean',
				label: __(
					'Save as default return address',
					'woocommerce-shipping'
				),
				isVisible: () => type === ADDRESS_TYPES.ORIGIN,
				Edit: ( props ) => <FieldCheckbox< T > { ...props } />,
			},
		],
		[ countryNames, stateNames, isPhoneAndEmailRequired, type ]
	);

	const form: Form = {
		fields: [
			'name',
			'company',
			{
				id: 'emailPhoneRow',
				layout: {
					type: 'row',
				},
				children: [ 'email', 'phone' ],
			},
			'address',
			'address2',
			{
				id: 'cityStateRow',
				layout: {
					type: 'row',
				},
				children: [ 'city', 'state' ],
			} as FormField,
			{
				id: 'postcodeCountryRow',
				layout: {
					type: 'row',
				},
				children: [ 'postcode', 'country' ],
			} as FormField,
			'defaultAddress',
			'defaultReturnAddress',
		].filter( Boolean ) as FormField[],
	};

	const handleChange = useCallback(
		( value: DeepPartial< T > ) => {
			setFormData( ( prev ) => ( {
				...prev,
				...value,
			} ) );
		},
		[ setFormData ]
	);

	// Check if form is dirty or has validation errors on formData change
	useEffect( () => {
		setDataFormIsDirty( ! _.isEqual( initialValue, formData ) );

		// Validate the form
		const errors = validateAddressSection( formData );
		setFormValidationErrors( errors );
		// eslint-disable-next-line react-hooks/exhaustive-deps -- we want this to only run when formData changes
	}, [ formData, validateAddressSection ] );

	return (
		<>
			{ showUPSDAPTOSWarning && (
				<>
					<Notice status="warning" isDismissible={ false }>
						<Text>
							{ __(
								'You have accepted the UPS® Terms of Service for this address. If you update the address, the acceptance will be revoked, and you will need to accept the Terms of Service again before purchasing additional UPS® labels.',
								'woocommerce-shipping'
							) }
						</Text>
					</Notice>
					<Spacer marginBottom={ 3 } />
				</>
			) }
			{ ! isVerified && (
				<Spacer marginBottom={ 3 }>
					<Notice status="warning" isDismissible={ false }>
						{ __(
							"This address hasn't been validated. We recommend validating to help ensure successful delivery.",
							'woocommerce-shipping'
						) }
					</Notice>
				</Spacer>
			) }
			{ Object.keys( allValidationErrors ).length > 0 && (
				<Spacer marginBottom={ 3 }>
					<Notice status="error" isDismissible={ false }>
						<Text>
							{ __(
								'Please fix the errors below to continue.',
								'woocommerce-shipping'
							) }
						</Text>
						<ul
							style={ {
								margin: 0,
								paddingInlineStart: 0,
								listStylePosition: 'inside',
							} }
						>
							{ [
								...new Set(
									Object.values( allValidationErrors ).filter(
										( msg ): msg is string =>
											typeof msg === 'string'
									)
								),
							].map( ( message ) => (
								<li key={ message }>{ message }</li>
							) ) }
						</ul>
					</Notice>
				</Spacer>
			) }
			<AddressContextProvider
				initialValue={ {
					isUpdating,
					validationErrors,
				} }
			>
				<Spacer marginBottom={ 6 }>
					<DataForm< T >
						data={ formData }
						fields={ fields }
						onChange={ handleChange }
						form={ form }
					/>
				</Spacer>
			</AddressContextProvider>
			<Flex justify="flex-end" align={ 'center' } as="footer">
				<Button
					onClick={ onCancel }
					isBusy={ isUpdating }
					variant="tertiary"
				>
					{ __( 'Cancel', 'woocommerce-shipping' ) }
				</Button>
				<Button
					onClick={ handleDataFormSubmit }
					variant="primary"
					disabled={ isSubmitButtonDisabled( {
						isDirty: dataFormIsDirty,
						isValidForm: dataFormIsValid,
					} ) }
					isBusy={ isUpdating }
				>
					{ __( 'Validate and save', 'woocommerce-shipping' ) }
				</Button>
			</Flex>
		</>
	);
}
