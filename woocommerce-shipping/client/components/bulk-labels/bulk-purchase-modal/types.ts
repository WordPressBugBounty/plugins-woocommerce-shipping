/**
 * Props for the BulkPurchaseModal component.
 *
 * Record-level types (`OrderShippingContextRecord`, `OrderSelectedPackage`,
 * `BulkPurchaseOrder`) live in the data package — see
 * `client/data/bulk-labels/`.
 */
export interface BulkPurchaseModalProps {
	orderIds: number[];
	onClose: () => void;
}
