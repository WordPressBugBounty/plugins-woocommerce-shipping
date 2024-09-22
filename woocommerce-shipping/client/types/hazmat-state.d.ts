export type HazmatState = Record<
	string | `shipment_${ shipmentId }`,
	{
		isHazmat: boolean;
		category: string;
	}
>;
