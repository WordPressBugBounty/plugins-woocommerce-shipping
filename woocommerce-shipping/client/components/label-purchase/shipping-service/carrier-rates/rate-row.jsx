import {
	__experimentalText as Text,
	Flex,
	FlexBlock,
	FlexItem,
} from '@wordpress/components';
import { dateI18n } from '@wordpress/date';
import { __, _n, sprintf } from '@wordpress/i18n';
import { withBoundary } from 'components/HOC';
import { CarrierIcon } from 'components/carrier-icon';
import { createInterpolateElement } from '@wordpress/element';
import { useLabelPurchaseContext } from 'context/label-purchase';
import { RowExtras } from './row-extras';
import clsx from 'clsx';

export const RateRow = withBoundary(
	( {
		rate,
		selected,
		setSelected,
		signatureRequiredRate,
		adultSignatureRequiredRate,
		carbonNeutralRate,
		additionalHandlingRate,
		saturdayDeliveryRate,
	} ) => {
		const {
			rateId,
			carrierId,
			title,
			tracking,
			insurance,
			freePickup,
			deliveryDateGuaranteed,
			deliveryDate,
			deliveryDays,
		} = rate;
		const {
			storeCurrency: { formatAmount },
			rates: { getSelectedRateOptions, selectRateOption },
		} = useLabelPurchaseContext();
		const extrasText = [
			tracking && __( 'tracking', 'woocommerce-shipping' ),
			insurance > 0 &&
				sprintf(
					// translators: %s: insurance amount
					__( 'insurance (up to %s)', 'woocommerce-shipping' ),
					formatAmount( insurance )
				),
			freePickup && __( 'free pickup', 'woocommerce-shipping' ),
		].filter( Boolean );
		const extrasProps = {
			extrasText,
			signatureRequiredRate,
			adultSignatureRequiredRate,
			carbonNeutralRate,
			additionalHandlingRate,
			saturdayDeliveryRate,
			formatAmount,
			setSelected,
			selected,
			rate,
			selectedRateOptions: getSelectedRateOptions(),
			selectRateOption,
		};

		const isSelected =
			selected?.rate?.rateId === rateId ||
			selected?.parent?.rateId === rateId;

		let deliveryDateMessage;
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

		const rateCaveat =
			rate.serviceId === 'MediaMail'
				? createInterpolateElement(
						__(
							'Books and <a>other media</a> only',
							'woocommerce-shipping'
						),
						{
							a: (
								// eslint-disable-next-line jsx-a11y/anchor-has-content
								<a
									target="__blank"
									href="https://pe.usps.com/text/DMM300/273.htm#a_3_0"
								/>
							),
						}
				  )
				: '';

		return (
			<>
				<input
					type="radio"
					name="shipping-rate"
					id={ rateId }
					onChange={ setSelected( rate ) }
				/>
				<Flex
					direction="row"
					align="flex-start"
					gap={ 4 }
					as="label"
					htmlFor={ rateId }
					className={ clsx(
						[ isSelected && 'selected' ],
						[ rateCaveat && 'has-rate-caveat' ]
					) }
				>
					<CarrierIcon
						carrier={ carrierId }
						positionY="top"
						size="xLarge"
					/>

					<FlexBlock>
						<Flex direction="column" gap={ 2 }>
							<Text size={ 14 } weight={ 400 }>
								{ title }
							</Text>
							{ rateCaveat && (
								<Text className="rate-caveat">
									{ rateCaveat }
								</Text>
							) }
							{ ! isSelected && (
								<Text className="rate-extras">
									{ sprintf(
										// translators: %s: list of extras
										__(
											'includes %s',
											'woocommerce-shipping'
										),
										extrasText.join( ', ' )
									) }
								</Text>
							) }

							{ isSelected && <RowExtras { ...extrasProps } /> }
						</Flex>
					</FlexBlock>
					<FlexItem>
						<Flex
							direction="column"
							justify="flex-start"
							align="flex-end"
							gap={ 1 }
						>
							<data value={ rate.rate } aria-label="rate-price">
								{ formatAmount( rate.rate ) }
							</data>

							{ deliveryDateMessage && (
								<time>{ deliveryDateMessage }</time>
							) }
						</Flex>
					</FlexItem>
				</Flex>
			</>
		);
	}
)( 'RateRow' );
