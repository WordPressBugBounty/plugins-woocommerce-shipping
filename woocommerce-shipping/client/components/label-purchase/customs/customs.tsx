import React, { JSX } from 'react';
import {
	__experimentalHeading as Heading,
	Flex,
	Notice,
} from '@wordpress/components';
import { isEmpty, map } from 'lodash';
import { __ } from '@wordpress/i18n';
import { Form } from '@woocommerce/components';
import { useSelect } from '@wordpress/data';
import { CustomsState } from 'types';
import { useLabelPurchaseContext } from 'context/label-purchase';
import { CustomsForm } from './customs-form';
import {
	createLocalErrors,
	validateContentTypes,
	validateItems,
	validateITN,
	validateRestrictionType,
} from './validators';
import { addressStore } from 'data/address';
import { getCountryName, isUspsCustomsPolicyRoute } from 'utils';

export const Customs = (): JSX.Element => {
	const {
		customs: { getCustomsState, setCustomsState, setErrors },
		essentialDetails: { setCustomsCompleted },
		shipment: { getShipmentOrigin },
	} = useLabelPurchaseContext();

	const destination = useSelect(
		( select ) => select( addressStore ).getOrderDestination(),
		[]
	);
	const origin = getShipmentOrigin();
	const { country } = destination;

	const destinationContext = {
		country,
		countryName: getCountryName()( country ),
		originCountry: origin?.country,
	};

	const initialValues = getCustomsState();

	return (
		<Flex className="label-purchase-customs" direction="column">
			<Heading level={ 3 }>
				{ __( 'Customs', 'woocommerce-shipping' ) }
			</Heading>
			{ isUspsCustomsPolicyRoute( origin, destination ) && (
				<Notice status="info" isDismissible={ false }>
					{ __(
						'USPS customs requirements for U.S. territories, Freely Associated States, and military addresses vary by shipment direction, contents, weight, and service. If you select USPS, customs information will be ignored only when USPS does not require it.',
						'woocommerce-shipping'
					) }
				</Notice>
			) }
			{ initialValues && (
				<Form< CustomsState >
					// Update the form if length of items changes as a result of shipment split
					key={ map( initialValues.items, 'id' ).join( '--' ) }
					onSubmit={ ( values ) => {
						setCustomsState( values );
					} }
					initialValues={ initialValues }
					validate={ ( values ) => {
						const errors = [
							{
								values,
								errors: createLocalErrors( values.items ),
							},
						]
							.map( validateContentTypes )
							.map( validateRestrictionType )
							.map( validateITN( destinationContext ) )
							.map(
								validateItems( destinationContext )
							)[ 0 ].errors;

						/**
						 * If there is no error, `errors.items` will still have 1 item that's an empty obj. For example: errors.items[0] = {}
						 * If there are errors, `errors.items` will have 1+ items that's an array of error messages, and `errors` can
						 * contain other keys. For example:
						 *
						 *   errors = {
						 *     items[0] = {
						 *         "weight": "This field is required",
						 *         "price": "This field is required"
						 *       },
						 *     itn: "error message",
						 *     contentExplanation: "error message"
						 *   }
						 *
						 * Every time validation runs, check again and mark the customs essential details as done if and only if there is no error.
						 */
						if (
							errors?.items[ 0 ] &&
							Object.keys( errors ).length <= 1 &&
							errors?.items.every( isEmpty )
						) {
							setCustomsCompleted( true );
						} else {
							setCustomsCompleted( false );
						}

						setErrors( errors );
						return errors;
					} }
					onChange={ ( _, values ) => {
						setCustomsState( values );
					} }
				>
					<CustomsForm />
				</Form>
			) }
		</Flex>
	);
};
