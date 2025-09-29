import {
	Animate,
	Card,
	CardBody,
	Flex,
	Notice,
	__experimentalText as Text,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { ShippingRates } from 'components/label-purchase/shipping-service';
import { useLabelPurchaseContext } from 'context/label-purchase';
import { labelPurchaseStore } from 'data/label-purchase';
import { isEmpty } from 'lodash';
import { hasUPSPackages } from 'utils';
import { useCollapsibleCard } from '../internal/useCollapsibleCard';
import { Badge } from 'components/wp';
import { NoRatesAvailableV2 } from '../internal/no-rates-available-v2';

export const ShippingRatesCard = () => {
	const {
		shipment: { currentShipmentId },
		rates: { isFetching },
		packages: { isCustomPackageTab, isPackageSpecified },
		hazmat: { getShipmentHazmat },
	} = useLabelPurchaseContext();
	const availableRates = useSelect(
		( select ) =>
			select( labelPurchaseStore ).getRatesForShipment(
				currentShipmentId
			),
		[ currentShipmentId ]
	);
	const { CardHeader, isOpen } = useCollapsibleCard( true );
	return (
		<Card>
			<CardHeader iconSize={ 'small' } isBorderless>
				<Flex direction={ 'row' } align="space-between">
					<Text as="span" weight={ 500 } size={ 15 }>
						{ __( 'Shipping rates', 'woocommerce-shipping' ) }
					</Text>
					{ ! isOpen && ! isPackageSpecified() && (
						<Badge intent="warning">
							{ __(
								'Missing package info',
								'woocommerce-shipping'
							) }
						</Badge>
					) }
				</Flex>
			</CardHeader>
			{ isOpen && (
				<CardBody style={ { paddingTop: 0 } }>
					{ ! Boolean( availableRates ) && (
						<Animate type={ isFetching ? 'loading' : undefined }>
							{ ( { className } ) => (
								<NoRatesAvailableV2 className={ className } />
							) }
						</Animate>
					) }
					{ availableRates && isEmpty( availableRates ) && (
						<Animate type={ isFetching ? 'loading' : undefined }>
							{ ( { className } ) => (
								<Notice
									status="info"
									isDismissible={ false }
									className={ className }
								>
									<p>
										{ sprintf(
											// translators: %1$s: HAZMAT part, %2$s: package part
											__(
												'No shipping rates were found based on the combination of %1$s%2$s and the total shipment weight.',
												'woocommerce-shipping'
											),
											getShipmentHazmat().isHazmat
												? __(
														'the selected HAZMAT category, ',
														'woocommerce-shipping'
												  )
												: '',
											isCustomPackageTab()
												? __(
														'the package type, package dimensions',
														'woocommerce-shipping'
												  )
												: __(
														'the selected package',
														'woocommerce-shipping'
												  )
										) }
									</p>
									<p>
										{ sprintf(
											// translators: %1$s: HAZMAT part, %2$s: package part
											__(
												`We couldn't find a shipping service for the combination of %1$s%2$s and the total shipment weight. Please adjust your input and try again.`,
												'woocommerce-shipping'
											),
											getShipmentHazmat().isHazmat
												? __(
														'the selected HAZMAT category, ',
														'woocommerce-shipping'
												  )
												: '',
											isCustomPackageTab()
												? __(
														'selected package type, package dimensions',
														'woocommerce-shipping'
												  )
												: __(
														'the selected package',
														'woocommerce-shipping'
												  )
										) }
									</p>
								</Notice>
							) }
						</Animate>
					) }

					{ Boolean( availableRates ) &&
						! isEmpty( availableRates ) &&
						( isFetching ? (
							<Animate type="loading">
								{ ( { className } ) => (
									<ShippingRates
										availableRates={ availableRates }
										isFetching={ isFetching }
										className={ className }
									/>
								) }
							</Animate>
						) : (
							<ShippingRates
								availableRates={ availableRates }
								isFetching={ isFetching }
							/>
						) ) }

					{ isPackageSpecified() && hasUPSPackages() && (
						<>
							<p className="upsdap-trademark-notice upsdap-trademark-notice--desktop">
								{ __(
									'UPS, the UPS brandmark, UPS Ready®, and the color brown are trademarks of United Parcel Service of America, Inc. All Rights Reserved.',
									'woocommerce-shipping'
								) }
							</p>
						</>
					) }
				</CardBody>
			) }
		</Card>
	);
};
