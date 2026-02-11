/**
 * ScanForm Entry Point.
 * Handles mounting the ScanForm modal when the button is clicked.
 */

import { createElement } from '@wordpress/element';
import { createRoot } from 'react-dom/client';
import { ScanFormModal } from 'components/scan-form-modal';
import { initSentry } from 'utils';

initSentry();

let modalRoot = null;
let modalContainer = null;

/**
 * Unmount the ScanForm modal.
 */
const unmountModal = () => {
	if ( modalRoot ) {
		modalRoot.unmount();
		modalRoot = null;
	}

	if ( modalContainer?.parentNode ) {
		modalContainer.parentNode.removeChild( modalContainer );
		modalContainer = null;
	}
};

/**
 * Mount the ScanForm modal.
 */
const mountModal = () => {
	// Create container if it doesn't exist.
	if ( ! modalContainer ) {
		modalContainer = document.createElement( 'div' );
		modalContainer.id = 'wcs-scanform-modal-root';
		document.body.appendChild( modalContainer );
	}

	// Create root if it doesn't exist.
	modalRoot ??= createRoot( modalContainer );

	// Render the modal.
	modalRoot.render(
		createElement( ScanFormModal, {
			onClose: unmountModal,
		} )
	);
};

/**
 * Initialize button click handler.
 */
const initScanFormButton = () => {
	const button = document.getElementById( 'wc-shipping-scanform-trigger' );
	if ( ! button ) return;

	button.removeEventListener( 'click', mountModal );
	button.addEventListener( 'click', mountModal );
};

/**
 * Auto-open the ScanForm modal when navigated with ?open_scanform=1.
 */
const maybeAutoOpenModal = () => {
	const params = new URLSearchParams( window.location.search );
	if ( params.get( 'open_scanform' ) === '1' ) {
		// Remove the param from URL to prevent re-opening on refresh.
		params.delete( 'open_scanform' );
		const newUrl =
			window.location.pathname +
			( params.toString() ? '?' + params.toString() : '' );
		window.history.replaceState( {}, '', newUrl );

		// Auto-open the modal.
		mountModal();
	}
};

// Initialize when DOM is ready.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', () => {
		initScanFormButton();
		maybeAutoOpenModal();
	} );
} else {
	initScanFormButton();
	maybeAutoOpenModal();
}
