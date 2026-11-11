import { Button, Flex } from '@wordpress/components';
import { arrowLeft } from '@wordpress/icons';
import { __, sprintf } from '@wordpress/i18n';

// Names the modal dialog, which hides the Modal's own header.
export const MODAL_TITLE_ID = 'label-purchase-modal-title';

export const ModalHeader = ( { closeModal, orderId } ) => (
	<Flex className="label-purchase-modal__header">
		<Button
			icon={ arrowLeft }
			onClick={ closeModal }
			aria-label={ __(
				'Close purchase label modal',
				'woocommerce-shipping'
			) }
			title={ __( 'Close', 'woocommerce-shipping' ) }
		/>
		<h2 id={ MODAL_TITLE_ID }>
			{ __( 'Create shipping label', 'woocommerce-shipping' ) }
		</h2>
		<span>
			{ sprintf(
				/* translators: %d: order ID */
				__( 'Order %d', 'woocommerce-shipping' ),
				orderId
			) }
		</span>
	</Flex>
);
