import { createElement, useEffect, useState } from '@wordpress/element';
import { createRoot } from 'react-dom/client';
import { __, sprintf } from '@wordpress/i18n';
import { BulkLabelsBanner } from 'components/bulk-labels';
import { BulkPurchaseModal } from 'components/bulk-labels/bulk-purchase-modal';
import {
	getBulkLabelsMaxOrders,
	registerOrdersShippingContextEntity,
} from 'data/bulk-labels';
import { initSentry } from 'utils';

initSentry();
registerOrdersShippingContextEntity();

const CONTAINER_ID = 'wcshipping-bulk-labels-banner-root';
const BULK_ACTION_VALUE = 'wcshipping_create_shipping_labels';

let root: ReturnType< typeof createRoot > | null = null;

/**
 * Read order IDs from the WP orders form's selected row checkboxes. Used
 * when the merchant triggers the modal via the native bulk-action dropdown.
 */
const getCheckedOrderIdsFromForm = (): number[] => {
	const checkboxes = document.querySelectorAll< HTMLInputElement >(
		'#the-list input[type="checkbox"][name="id[]"]:checked,' +
			' #the-list input[type="checkbox"][name="post[]"]:checked'
	);

	return Array.from( checkboxes )
		.map( ( cb ) => Number( cb.value ) )
		.filter( ( id ) => Number.isFinite( id ) && id > 0 );
};

/**
 * Whether the orders form's bulk-action <select> currently targets the
 * "Fulfill with labels" action. WP renders both a top and bottom dropdown,
 * so we read the one whose Apply button was clicked.
 */
const formTargetsBulkLabelsAction = (
	form: HTMLFormElement,
	submitter: HTMLElement | null
): boolean => {
	const which =
		submitter?.closest( '.tablenav.bottom' ) !== null ? 'bottom' : 'top';
	const select = form.querySelector< HTMLSelectElement >(
		which === 'top' ? 'select[name="action"]' : 'select[name="action2"]'
	);
	return select?.value === BULK_ACTION_VALUE;
};

/**
 * Wrapper component that owns the modal open/close state. Kept inline in
 * the entrypoint so the banner stays presentational and the modal lifecycle
 * lives next to the form-submit interception.
 */
const BulkLabelsApp = () => {
	const [ modalOrderIds, setModalOrderIds ] = useState< number[] | null >(
		null
	);

	useEffect( () => {
		const form = document.querySelector< HTMLFormElement >(
			'#wpbody-content form#posts-filter, #wpbody-content form#wc-orders-filter'
		);
		if ( ! form ) {
			return;
		}

		const onSubmit = ( event: SubmitEvent ) => {
			const submitter =
				event.submitter instanceof HTMLElement ? event.submitter : null;
			if ( ! formTargetsBulkLabelsAction( form, submitter ) ) {
				return;
			}

			// Always swallow the submit when our action is selected —
			// otherwise the form posts to WP's bulk handler and the page
			// reloads with no feedback (even for the zero-rows case).
			event.preventDefault();

			const ids = getCheckedOrderIdsFromForm();
			if ( ids.length === 0 ) {
				return;
			}

			// Match the batch endpoint contract — refuse the bulk-action
			// submit when the merchant has more than the allowed number of
			// orders selected, rather than letting the modal open and 400
			// on the shipping-context fetch.
			if ( ids.length > getBulkLabelsMaxOrders() ) {
				// eslint-disable-next-line no-alert
				window.alert(
					sprintf(
						/* translators: %d: maximum number of orders that can be processed at once */
						__(
							'You can process up to %d orders at a time. Please reduce your selection and try again.',
							'woocommerce-shipping'
						),
						getBulkLabelsMaxOrders()
					)
				);
				return;
			}

			setModalOrderIds( ids );
		};

		form.addEventListener( 'submit', onSubmit );
		return () => {
			form.removeEventListener( 'submit', onSubmit );
		};
	}, [] );

	return (
		<>
			<BulkLabelsBanner onCreateLabels={ setModalOrderIds } />
			{ modalOrderIds !== null && (
				<BulkPurchaseModal
					orderIds={ modalOrderIds }
					onClose={ () => setModalOrderIds( null ) }
				/>
			) }
		</>
	);
};

const mount = () => {
	if ( document.getElementById( CONTAINER_ID ) ) {
		return;
	}

	// Insert the banner container above the bulk actions tablenav.
	const tablenav = document.querySelector< HTMLElement >( '.tablenav.top' );
	if ( ! tablenav ) {
		return;
	}

	const container = document.createElement( 'div' );
	container.id = CONTAINER_ID;
	tablenav.parentNode?.insertBefore( container, tablenav );

	root ??= createRoot( container );
	root.render( createElement( BulkLabelsApp ) );
};

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', mount );
} else {
	mount();
}
