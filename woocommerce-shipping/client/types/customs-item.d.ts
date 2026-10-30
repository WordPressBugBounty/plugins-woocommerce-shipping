import { OrderItem } from './order-item';

export interface CustomsItem extends Omit< OrderItem, 'name' | 'id' > {
	id: string | number;
	description: string;
	hsTariffNumber: string;
	originCountry: string;
	// EU product identifiers. Optional: customs information stored before they were added lacks them.
	code?: string;
	manufacturerProductId?: string;
	standardizedProductId?: string;
	noStandardizedId?: boolean;
}
