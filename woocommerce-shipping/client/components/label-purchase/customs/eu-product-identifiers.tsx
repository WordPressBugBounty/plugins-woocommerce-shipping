import { useEffect, useState, JSX } from 'react';
import { useFormContext } from '@woocommerce/components';
import type { InputProps } from '@woocommerce/components/build-types/form';
import {
	__experimentalHeading as Heading,
	__experimentalText as Text,
	BaseControl,
	__experimentalSpacer as Spacer,
	CheckboxControl,
	Flex,
	Spinner,
	TextControl,
} from '@wordpress/components';
import { usePrevious } from '@wordpress/compose';
import { __, sprintf } from '@wordpress/i18n';
import { useLabelPurchaseContext } from 'context/label-purchase';
import { CustomsItem, CustomsState } from 'types';

/**
 * The customs form's field binder: value, change handler and error text for a field of an item.
 */
export type GetCustomsFieldProps = (
	key: keyof CustomsItem,
	productId: number
) => Omit< InputProps< CustomsState, string >, 'onBlur' >;

interface EUProductIdentifiersProps {
	getProps: GetCustomsFieldProps;
	disabled: boolean;
}

const textControlProps = {
	hideLabelFromVision: true,
	__next40pxDefaultSize: true,
	__nextHasNoMarginBottom: true,
};

/**
 * EU product identifiers (M-PID, NS-PID, S-PID) for each customs item, shown when the
 * shipment is imported into the EU. Renders inside the customs `Form`.
 */
export const EUProductIdentifiers = ( {
	getProps,
	disabled,
}: EUProductIdentifiersProps ): JSX.Element => {
	const {
		customs: { isEUProductIdRequired, isCustomsRequirementsLoading },
	} = useLabelPurchaseContext();
	const {
		values: { items },
		setValue,
	} = useFormContext< CustomsState >();

	const showEUProductIds = isEUProductIdRequired();

	// Form validates only on mount and on value changes, so re-run it when the requirement arrives.
	const previousShowEUProductIds = usePrevious( showEUProductIds );
	useEffect( () => {
		if (
			previousShowEUProductIds !== undefined &&
			previousShowEUProductIds !== showEUProductIds
		) {
			// Setting the unchanged items re-runs validation with the new requirement.
			setValue( 'items', items );
		}
	}, [ previousShowEUProductIds, showEUProductIds, setValue, items ] );

	// Fast answers never flash a spinner.
	const isRequirementLoading = isCustomsRequirementsLoading();
	const [ showSpinner, setShowSpinner ] = useState( false );
	useEffect( () => {
		if ( ! isRequirementLoading ) {
			setShowSpinner( false );
			return;
		}
		const timer = setTimeout( () => setShowSpinner( true ), 300 );
		return () => clearTimeout( timer );
	}, [ isRequirementLoading ] );

	const setNoStandardizedId = (
		productId: CustomsItem[ 'id' ],
		checked: boolean
	) => {
		setValue(
			'items',
			items.map( ( item ) =>
				// The GTIN stays in state, so unticking brings it back.
				item.id === productId
					? { ...item, noStandardizedId: checked }
					: item
			)
		);
	};

	return (
		<>
			{ showSpinner && (
				<>
					<Spacer margin={ 8 } />
					<Spinner />
				</>
			) }
			{ showEUProductIds && (
				<>
					<Spacer margin={ 8 } />
					<Flex direction="column" gap={ 2 }>
						<Heading level={ 4 }>
							{ __(
								'EU product identifiers',
								'woocommerce-shipping'
							) }
						</Heading>
						<Text variant="muted">
							{ __(
								'Required for shipments into the EU. SKU and GTIN / EAN are prefilled from the product’s Inventory tab.',
								'woocommerce-shipping'
							) }
						</Text>
					</Flex>
					<Spacer margin={ 4 } />
					<div
						className="customs-eu-product-ids"
						role="group"
						aria-label={ __(
							'EU product identifiers',
							'woocommerce-shipping'
						) }
					>
						<div
							className="customs-eu-product-ids__header"
							aria-hidden="true"
						>
							<BaseControl.VisualLabel>
								{ __( 'Product', 'woocommerce-shipping' ) }
							</BaseControl.VisualLabel>
							<BaseControl.VisualLabel>
								{ __( 'SKU *', 'woocommerce-shipping' ) }
							</BaseControl.VisualLabel>
							<BaseControl.VisualLabel>
								{ __(
									'Manufacturer part number *',
									'woocommerce-shipping'
								) }
							</BaseControl.VisualLabel>
							<BaseControl.VisualLabel>
								{ __( 'GTIN / EAN *', 'woocommerce-shipping' ) }
							</BaseControl.VisualLabel>
						</div>
						{ items.map( ( item ) => {
							const productName =
								( item as { name?: string } ).name ??
								item.description;
							return (
								<div
									className="customs-eu-product-ids__row"
									key={ item.id }
								>
									<div className="customs-eu-product-ids__product">
										<Text title={ productName }>
											{ productName }
										</Text>
									</div>
									<TextControl
										label={ sprintf(
											// translators: %s is the product name.
											__(
												'SKU for %s',
												'woocommerce-shipping'
											),
											productName
										) }
										{ ...textControlProps }
										{ ...getProps(
											'code',
											Number( item.id )
										) }
										disabled={ disabled }
										required={ true }
									/>
									<TextControl
										label={ sprintf(
											// translators: %s is the product name.
											__(
												'Manufacturer part number for %s',
												'woocommerce-shipping'
											),
											productName
										) }
										{ ...textControlProps }
										{ ...getProps(
											'manufacturerProductId',
											Number( item.id )
										) }
										disabled={ disabled }
										required={ true }
									/>
									<Flex
										direction="column"
										className="customs-eu-product-ids__gtin"
									>
										<TextControl
											label={ sprintf(
												// translators: %s is the product name.
												__(
													'GTIN / EAN for %s',
													'woocommerce-shipping'
												),
												productName
											) }
											{ ...textControlProps }
											{ ...getProps(
												'standardizedProductId',
												Number( item.id )
											) }
											// The "no barcode" code replaces the GTIN.
											{ ...( item.noStandardizedId && {
												value: '',
											} ) }
											disabled={
												disabled ||
												Boolean( item.noStandardizedId )
											}
											required={ ! item.noStandardizedId }
										/>
										<CheckboxControl
											label={ __(
												'No barcode',
												'woocommerce-shipping'
											) }
											checked={ Boolean(
												item.noStandardizedId
											) }
											onChange={ ( checked ) =>
												setNoStandardizedId(
													item.id,
													checked
												)
											}
											disabled={ disabled }
											__nextHasNoMarginBottom={ true }
										/>
									</Flex>
								</div>
							);
						} ) }
					</div>
				</>
			) }
		</>
	);
};
