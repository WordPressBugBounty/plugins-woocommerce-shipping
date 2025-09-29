import {
	__experimentalText as Text,
	__experimentalDivider as Divider,
	Flex,
	Icon,
} from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import { TAB_NAMES } from 'components/label-purchase/packages';
import { useLabelPurchaseContext } from 'context/label-purchase';
import { Destination, OriginAddress, Rate, RateWithParent } from 'types';
import { addressToString } from 'utils';
import { dateI18n } from '@wordpress/date';
import { Badge } from 'components/wp';
import subline from 'components/icons/subline-icon';

interface ShippingSummaryProps {
	destinationAddress: OriginAddress | Destination;
}

const RateExtraLine = ( {
	label,
	value,
	isSubLine = false,
}: {
	label: string;
	value: string | number | undefined;
	isSubLine?: boolean;
} ) => (
	<Flex direction={ 'row' } align="center" justify="space-between">
		<Flex direction={ 'row' } align="center" justify="flex-start" gap={ 1 }>
			{ isSubLine && <Icon icon={ subline } size={ 16 } color="#666" /> }
			<Text>{ label }</Text>
		</Flex>
		<Text variant="muted">{ value ?? '-' }</Text>
	</Flex>
);

const SummaryItem = ( {
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
} ) => (
	<Flex direction={ 'column' } align="flex-start" justify="center" gap={ 1 }>
		<Text variant="muted" size={ 11 } weight={ 500 } upperCase>
			{ label }
		</Text>
		{ children }
	</Flex>
);

export const ShippingSummary = ( {
	destinationAddress,
}: ShippingSummaryProps ) => {
	const {
		storeCurrency,
		packages: { currentPackageTab, getCustomPackage, getSelectedPackage },
		rates: { getSelectedRate, getSelectedRateOptions, availableRates },
		weight: { getShipmentTotalWeight },
	} = useLabelPurchaseContext();

	const selectedRate = getSelectedRate() as RateWithParent | null;
	const selectedRateOptions = getSelectedRateOptions();
	const selectedPackage = getSelectedPackage();
	const customPackage = getCustomPackage();

	const discount = selectedRate
		? selectedRate.rate.retailRate - selectedRate.rate.rate
		: 0;

	/* translators: Text explaining the rate discount. %s is the discount amount, e.g. "$1.00". */
	const rateDiscountText = __(
		"You're saving %s with carrier discounts",
		'woocommerce-shipping'
	);

	let deliveryDateMessage = '-';

	if ( availableRates && selectedRate ) {
		const { deliveryDateGuaranteed, deliveryDate, deliveryDays } =
			( availableRates![ selectedRate.rate.carrierId ].find(
				( rate ) => rate.rateId === selectedRate.rate.rateId
			) ?? {} ) as Rate & {
				deliveryDateGuaranteed?: boolean;
				deliveryDate?: Date;
				deliveryDays?: number;
			};

		if ( deliveryDateGuaranteed && deliveryDate ) {
			deliveryDateMessage = dateI18n( 'F d', deliveryDate );
		} else if ( deliveryDays ) {
			deliveryDateMessage = sprintf(
				// translators: %s: number of days
				_n(
					'%s business day',
					'%s business days',
					deliveryDays,
					'woocommerce-shipping'
				),
				deliveryDays
			);
		}
	}

	return (
		selectedRate &&
		( ( currentPackageTab === TAB_NAMES.CUSTOM_PACKAGE && customPackage ) ||
			( currentPackageTab === TAB_NAMES.CARRIER_PACKAGE &&
				selectedPackage ) ) && (
			<Flex direction={ 'column' } gap={ 4 }>
				<SummaryItem label={ __( 'Ship to', 'woocommerce-shipping' ) }>
					<Text>
						{ destinationAddress.name ??
							`${ destinationAddress.firstName } ${ destinationAddress.lastName }` }
					</Text>
					<Text display="flex">
						{ addressToString( destinationAddress ) }
					</Text>
				</SummaryItem>
				<SummaryItem label={ __( 'Package', 'woocommerce-shipping' ) }>
					<Text>
						{ currentPackageTab === TAB_NAMES.CUSTOM_PACKAGE &&
							`${ customPackage.width }″ × ${
								customPackage.length
							}″ × ${
								customPackage.height
							}″, ${ getShipmentTotalWeight() } lb` }
						{ currentPackageTab === TAB_NAMES.CARRIER_PACKAGE &&
							selectedPackage &&
							[
								`${ selectedPackage.width }″ × ${ selectedPackage.length }″ × ${ selectedPackage.height }″`,
								selectedPackage?.name,
								getShipmentTotalWeight() + ' lb',
							]
								.filter( Boolean )
								.join( ', ' ) }
					</Text>
				</SummaryItem>
				<SummaryItem label={ __( 'Rates', 'woocommerce-shipping' ) }>
					<Flex
						direction={ 'column' }
						gap={ 2 }
						align="stretch"
						justify="center"
						style={ { width: '100%' } }
					>
						<RateExtraLine
							label={
								selectedRate.rate.title +
								' (' +
								deliveryDateMessage +
								')'
							}
							value={
								selectedRate
									? storeCurrency.formatAmount(
											selectedRate.rate.rate
									  )
									: '-'
							}
						/>
						{ selectedRateOptions?.signature && (
							<RateExtraLine
								isSubLine
								label={
									selectedRateOptions.signature.value.toString() ===
									'adult'
										? __(
												'Adult Signature Required',
												'woocommerce-shipping'
										  )
										: __(
												'Signature Required',
												'woocommerce-shipping'
										  )
								}
								value={
									selectedRateOptions.signature.surcharge
										? storeCurrency.formatAmount(
												selectedRateOptions.signature.surcharge.toFixed(
													2
												)
										  )
										: '-'
								}
							/>
						) }
						{ selectedRateOptions?.carbon_neutral && (
							<RateExtraLine
								isSubLine
								label={ __(
									'Carbon Neutral',
									'woocommerce-shipping'
								) }
								value={
									selectedRateOptions.carbon_neutral
										? storeCurrency.formatAmount(
												selectedRateOptions
													.carbon_neutral.surcharge
										  )
										: '-'
								}
							/>
						) }
						{ selectedRateOptions?.additional_handling && (
							<RateExtraLine
								isSubLine
								label={ __(
									'Additional Handling',
									'woocommerce-shipping'
								) }
								value={
									selectedRateOptions.additional_handling
										? storeCurrency.formatAmount(
												selectedRateOptions
													.additional_handling
													.surcharge
										  )
										: '-'
								}
							/>
						) }
						{ selectedRateOptions?.saturday_delivery && (
							<RateExtraLine
								isSubLine
								label={ __(
									'Saturday Delivery',
									'woocommerce-shipping'
								) }
								value={
									selectedRateOptions.saturday_delivery
										? storeCurrency.formatAmount(
												selectedRateOptions
													.saturday_delivery.surcharge
										  )
										: '-'
								}
							/>
						) }
						<Divider style={ { borderColor: '#f0f0f0' } } />
						<Flex
							direction={ 'row' }
							align="center"
							justify="space-between"
						>
							<Text weight={ 500 }>Total</Text>
							<Text weight={ 500 }>
								{ selectedRate
									? storeCurrency.formatAmount(
											Object.values(
												selectedRateOptions ?? {}
											).reduce(
												( acc, option ) =>
													acc +
													( option.surcharge ?? 0 ),
												selectedRate.rate.rate
											)
									  )
									: '-' }
							</Text>
						</Flex>
					</Flex>
				</SummaryItem>
				{ Boolean( selectedRate ) && Boolean( discount ) && (
					<Flex
						direction={ 'row' }
						align="flex-start"
						justify="flex-start"
					>
						<Badge>
							{ sprintf(
								rateDiscountText,
								storeCurrency.formatAmount( discount )
							) }
						</Badge>
					</Flex>
				) }
				<Text variant="muted">
					{ __(
						'This order will be fulfilled after you purchase the shipping label.',
						'woocommerce-shipping'
					) }
				</Text>
			</Flex>
		)
	);
};
