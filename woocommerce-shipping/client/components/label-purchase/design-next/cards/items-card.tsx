import {
	__experimentalText as Text,
	__experimentalSpacer as Spacer,
	Card,
	CardBody,
	CardDivider,
	Flex,
	Notice,
} from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import { mainModalContentSelector } from 'components/label-purchase/constants';
import { ITEMS_SECTION } from 'components/label-purchase/essential-details/constants';
import { StaticHeader } from 'components/label-purchase/split-shipment/header';
import { SelectableItems } from 'components/label-purchase/split-shipment/selectable-items';
import { useLabelPurchaseContext } from 'context/label-purchase';
import { useEffect, useRef } from 'react';
import { ShipmentItem, ShipmentSubItem } from 'types';
import {
	getSelectablesCount,
	getSubItems,
	getWeightUnit,
	hasSubItems,
} from 'utils';
import { ItemsList } from '../internal/items-list';
import { useCollapsibleCard } from '../internal/useCollapsibleCard';
import { formatCurrency, getCurrencyObject } from '../utils';

const getItemsSummary = ( items: ( ShipmentItem | ShipmentSubItem )[] ) => {
	const totalItems = items.reduce( ( total, item ) => {
		return total + item.quantity;
	}, 0 );

	const itemsPart = sprintf(
		/* translators: %d: number of items */
		_n( '%d item', '%d items', totalItems, 'woocommerce-shipping' ),
		totalItems
	);

	const totalWeight = items.reduce( ( total, item ) => {
		const itemWeight = item.weight ? parseFloat( item.weight ) : 0;
		return total + itemWeight;
	}, 0 );

	const weightUnit = getWeightUnit();

	const weightPart =
		totalWeight > 0 ? `, ${ totalWeight } ${ weightUnit }` : '';

	return `${ itemsPart }${ weightPart }`;
};

const ItemsCard = ( {
	items,
}: {
	items: ( ShipmentItem | ShipmentSubItem )[];
} ) => {
	const { CardHeader, isOpen } = useCollapsibleCard( true );
	const {
		shipment: {
			shipments,
			selections,
			setSelection,
			currentShipmentId,
			hasVariations,
		},
		essentialDetails: { focusArea: essentialDetailsFocusArea },
		labels: { isCurrentTabPurchasingExtraLabel, hasPurchasedLabel },
	} = useLabelPurchaseContext();

	const addSelectionForShipment =
		( index: string | number ) =>
		( selection: ShipmentItem[] | ShipmentSubItem[] ) => {
			setSelection( { ...selections, [ index ]: selection } );
		};

	const selectAll = ( index: number | string ) => ( add: boolean ) => {
		if ( add ) {
			setSelection( {
				...selections,
				[ index ]: shipments[ index ]
					.map( ( item: ShipmentItem | ShipmentSubItem ) =>
						hasSubItems( item ) ? getSubItems( item ) : item
					)
					.flat() as ShipmentItem[],
			} );
		} else {
			setSelection( {
				[ currentShipmentId ]: [],
			} );
		}
	};

	/**
	 * Manages auto-scrolling behavior when users click on options in the Essential Details checklist.
	 * When the items section link is clicked, smoothly scrolls the modal to bring the items section
	 * into view, adjusting for header height (72px) and shipment tabs (68px) when multiple shipments exist.
	 * Triggered by the Essential Details component updating essentialDetailsFocusArea to ITEMS_SECTION.
	 */
	const itemsRef = useRef< HTMLDivElement >( null );
	useEffect( () => {
		if ( essentialDetailsFocusArea === ITEMS_SECTION && itemsRef.current ) {
			if ( ! itemsRef.current ) {
				return;
			}
			const modalContent = document.querySelector(
				mainModalContentSelector
			);
			const header = modalContent?.querySelector( '.items-header' );
			const headerHeight = header
				? header.getBoundingClientRect().height
				: 0;
			const tabs = modalContent?.querySelector( '.shipment-tabs' );
			const tabsHeight =
				Object.keys( shipments ).length > 1 && tabs
					? tabs.getBoundingClientRect().height
					: 0;
			modalContent?.scrollTo( {
				left: 0,
				top: itemsRef.current.offsetTop - ( headerHeight + tabsHeight ),
				behavior: 'smooth',
			} );
		}
	}, [ essentialDetailsFocusArea, shipments ] );

	const orderWeight = items.reduce( ( total, item ) => {
		const itemWeight = item.weight ? parseFloat( item.weight ) : 0;
		return total + itemWeight;
	}, 0 );

	return (
		<Card>
			<CardHeader iconSize={ 'small' } isBorderless>
				<Flex direction={ 'row' } align="space-between">
					<Text as="span" weight={ 500 } size={ 15 }>
						{ __( 'Items', 'woocommerce-shipping' ) }
					</Text>
					{ ! isOpen && (
						<Text as="span" weight={ 400 } size={ 13 }>
							{ getItemsSummary( items ) }
						</Text>
					) }
				</Flex>
			</CardHeader>
			{ isOpen && (
				<CardBody style={ { paddingTop: 0 } }>
					{ isCurrentTabPurchasingExtraLabel() ? (
						<Flex
							className="label-purchase__additional-label"
							direction="column"
							expanded={ true }
						>
							<Notice status="info" isDismissible={ false }>
								<strong>
									{ __(
										'Select the items you want to include in the new shipment.',
										'woocommerce-shipping'
									) }
								</strong>{ ' ' }
								{ __(
									'The following lists shows all the items in the current order. You can select multiple items from the list.',
									'woocommerce-shipping'
								) }
							</Notice>
							<Flex className="selectable-items__header">
								<StaticHeader
									hasVariations={ hasVariations }
									selectAll={ selectAll( currentShipmentId ) }
									hasMultipleShipments={ false }
									selections={
										selections[ currentShipmentId ]
									}
									selectablesCount={ getSelectablesCount(
										shipments[ currentShipmentId ]
									) }
								/>
							</Flex>
							<SelectableItems
								isSplit={ false }
								select={ addSelectionForShipment(
									currentShipmentId
								) }
								selections={
									selections[ currentShipmentId ] || []
								}
								orderItems={ items as ShipmentItem[] }
								selectAll={ selectAll( currentShipmentId ) }
								shipmentIndex={ parseInt(
									currentShipmentId,
									10
								) }
								isDisabled={ hasPurchasedLabel(
									true,
									true,
									currentShipmentId
								) }
							/>
						</Flex>
					) : (
						<>
							<ItemsList items={ items } />
							<Spacer paddingX={ 6 } paddingY={ 4 }>
								<CardDivider
									style={ { marginBottom: '20px' } }
								/>
								<Flex justify="space-between" align="center">
									<Text size={ 13 } as="span" weight={ 400 }>
										{ __(
											'Order Total',
											'woocommerce-shipping'
										) }
									</Text>
									<Text size={ 13 } as="span" weight={ 400 }>
										{ formatCurrency(
											items.reduce( ( total, item ) => {
												return (
													total +
													parseFloat( item.total )
												);
											}, 0 ),
											getCurrencyObject().code
										) }
									</Text>
								</Flex>
							</Spacer>
							<Spacer paddingX={ 6 } paddingBottom={ 4 }>
								<CardDivider
									style={ { marginBottom: '20px' } }
								/>
								<Flex justify="space-between" align="center">
									<Text size={ 13 } as="span" weight={ 400 }>
										{ __(
											'In this shipment',
											'woocommerce-shipping'
										) }
									</Text>
									<Text size={ 13 } as="span" weight={ 400 }>
										{ sprintf(
											/** translators: %s: number of items */
											_n(
												'%s item',
												'%s items',
												items.length,
												'woocommerce-shipping'
											),
											items.length
										) }
									</Text>
									<Text size={ 13 } as="span" weight={ 400 }>
										{ `${ orderWeight.toString() } ${ getWeightUnit() }` }
									</Text>
									<Text size={ 13 } as="span" weight={ 400 }>
										{ formatCurrency(
											items.reduce( ( total, item ) => {
												return (
													total +
													parseFloat( item.total )
												);
											}, 0 ),
											getCurrencyObject().code
										) }
									</Text>
								</Flex>
							</Spacer>
						</>
					) }
				</CardBody>
			) }
		</Card>
	);
};

export default ItemsCard;
