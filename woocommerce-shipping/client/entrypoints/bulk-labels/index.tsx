import { createElement } from '@wordpress/element';
import { createRoot } from 'react-dom/client';
import { BulkLabelsBanner } from 'components/bulk-labels';
import { initSentry } from 'utils';

initSentry();

const CONTAINER_ID = 'wcshipping-bulk-labels-banner-root';

let root: ReturnType< typeof createRoot > | null = null;

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
	root.render( createElement( BulkLabelsBanner ) );
};

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', mount );
} else {
	mount();
}
