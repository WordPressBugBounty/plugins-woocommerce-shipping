import { pickBy } from 'lodash';
import { CustomsItem } from 'types';
import { NO_STANDARDIZED_PRODUCT_ID } from './constants';

export type EUProductIdFields = Pick<
	CustomsItem,
	| 'code'
	| 'manufacturerProductId'
	| 'standardizedProductId'
	| 'noStandardizedId'
>;

/**
 * The EU product identifiers of a customs item, as sent with the rates request.
 * Empty identifiers are omitted: EU validation rejects empty values, and the
 * server would otherwise overwrite the identifiers stored on the product.
 */
export const getEUProductIdPayload = ( {
	code,
	manufacturerProductId,
	standardizedProductId,
	noStandardizedId,
}: EUProductIdFields ): Partial<
	Record<
		'code' | 'manufacturer_product_id' | 'standardized_product_id',
		string
	>
> =>
	pickBy(
		{
			code: ( code ?? '' ).trim(),
			manufacturer_product_id: ( manufacturerProductId ?? '' ).trim(),
			standardized_product_id: noStandardizedId
				? NO_STANDARDIZED_PRODUCT_ID
				: ( standardizedProductId ?? '' ).trim(),
		},
		Boolean
	);
