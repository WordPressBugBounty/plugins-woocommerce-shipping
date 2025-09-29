import { __experimentalText as Text } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { DataViews } from '@wordpress/dataviews/wp';
import type { Field } from '@wordpress/dataviews/wp';
import { Badge } from '@woocommerce/components';
import { OrderItem, ShipmentItem } from 'types';
import { formatCurrency, getCurrencyObject } from '../utils';
import { getWeightUnit } from 'utils';

type OrderItemType = OrderItem | ShipmentItem;

export const ItemsList = ( {
	items,
}: {
	items: OrderItem[] | ShipmentItem[];
} ): JSX.Element => {
	const renderLineItemMetaData = ( item: OrderItemType, limit = 3 ) => {
		const itemAsAny = item as any; // eslint-disable-line @typescript-eslint/no-explicit-any
		if ( ! itemAsAny.meta_data || itemAsAny.meta_data.length === 0 ) {
			return null;
		}

		const metaData = itemAsAny.meta_data.slice( 0, limit );
		const remaining = itemAsAny.meta_data.length - limit;

		return (
			<>
				{ metaData.map(
					( meta: { key: string; label: string; value: string } ) => (
						<Badge
							count={ 0 }
							key={ meta.key }
							title={ meta.label }
						>
							{ meta.value as string }
						</Badge>
					)
				) }
				{ remaining > 0 && (
					<Badge
						count={ 0 }
						title={ itemAsAny.meta_data
							.slice( limit )
							.map(
								( meta: {
									key: string;
									label: string;
									value: string;
								} ) => `${ meta.label }: ${ meta.value }`
							)
							.join( ', ' ) }
					>
						+{ remaining }
					</Badge>
				) }
			</>
		);
	};

	const renderLineItemSummary = ( { item }: { item: OrderItemType } ) => {
		return (
			<div
				style={ {
					display: 'flex',
					alignItems: 'center',
					gap: 4,
				} }
			>
				{ ( item as any ).image && ( // eslint-disable-line @typescript-eslint/no-explicit-any
					<img
						src={ ( item as any ).image } // eslint-disable-line @typescript-eslint/no-explicit-any
						alt={ ( item as any ).name } // eslint-disable-line @typescript-eslint/no-explicit-any
						style={ {
							width: 32,
							height: 32,
							objectFit: 'contain',
							border: '1px solid #eee',
							borderRadius: 4,
							marginRight: 8,
						} }
					/>
				) }
				<div>
					<Text
						as="p"
						style={ {
							fontWeight: 400,
							display: 'flex',
							alignItems: 'center',
							gap: 4,
							flexWrap: 'wrap',
						} }
					>
						{ item.name }
						{ renderLineItemMetaData( item ) }
					</Text>
					<Text as="p">{ item.sku }</Text>
				</div>
			</div>
		);
	};

	return (
		<DataViews< OrderItemType >
			view={ {
				type: 'table',
				layout: {
					styles: {
						order_line_item_summary: {
							align: 'start',
							width: 'calc(100% - 210px)',
						},
						order_line_item_qty: {
							width: '50px',
							align: 'end',
						},
						order_line_item_weight: {
							width: '85px',
							align: 'end',
						},
						order_line_item_total: {
							width: '75px',
							align: 'end',
						},
					},
				},
				fields: [
					'order_line_item_summary',
					'order_line_item_qty',
					'order_line_item_weight',
					'order_line_item_total',
				],
			} }
			fields={
				[
					{
						id: 'order_line_item_summary',
						label: __( 'Items', 'woocommerce-shipping' ),
						render: renderLineItemSummary,
						enableSorting: false,
						enableHiding: false,
						filterBy: false,
					},
					{
						id: 'order_line_item_qty',
						label: __( 'Qty', 'woocommerce-shipping' ),
						type: 'text',
						enableSorting: false,
						enableHiding: false,
						getValue: ( { item }: { item: OrderItemType } ) => {
							return item.quantity;
						},
						filterBy: false,
					},
					{
						id: 'order_line_item_weight',
						label: __( 'Total Weight', 'woocommerce-shipping' ),
						type: 'text',
						enableSorting: false,
						enableHiding: false,
						render: ( { item }: { item: OrderItemType } ) => {
							const weight = item.weight
								? parseFloat( item.weight )
								: 0;
							const weightUnit = getWeightUnit();
							return `${ weight } ${ weightUnit }`;
						},
						filterBy: false,
					},
					{
						id: 'order_line_item_total',
						label: __( 'Total Value', 'woocommerce-shipping' ),
						type: 'text',
						enableSorting: false,
						enableHiding: false,
						getValue: ( { item }: { item: OrderItemType } ) => {
							const currency = getCurrencyObject();
							return formatCurrency(
								parseFloat( item.total ),
								currency.code
							);
						},
						filterBy: false,
					},
				] as Field< OrderItemType >[]
			}
			data={ items }
			isLoading={ false }
			onChangeView={ () => {} } // eslint-disable-line @typescript-eslint/no-empty-function
			search={ false }
			defaultLayouts={ {
				table: {},
			} }
			paginationInfo={ {
				totalItems: items.length,
				totalPages: 1,
			} }
			getItemId={ ( item: OrderItemType ) => String( item.id ) }
		>
			<DataViews.Layout />
		</DataViews>
	);
};
