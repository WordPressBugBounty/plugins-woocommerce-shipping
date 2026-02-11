/**
 * ScanForm Onboarding Notice - Frontend Interactions
 *
 * Handles "Try it now" and "Got it" button actions for the ScanForm onboarding notice.
 *
 * @package WCShipping
 */

( function () {
	'use strict';

	// Wait for DOM to be ready.
	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}

	function init() {
		// "Try it now" button - triggers ScanForm modal.
		document.addEventListener( 'click', function ( e ) {
			if ( e.target.closest( '.wcshipping-scanform-try-now' ) ) {
				e.preventDefault();

				const scanFormButton = document.getElementById(
					'wc-shipping-scanform-trigger'
				);

				if ( scanFormButton ) {
					// On orders list page - trigger the modal directly.
					scanFormButton.click();
				} else if ( wcShippingScanFormOnboarding.orders_list_url ) {
					// On individual order page - open orders list in new tab with auto-open param.
					window.open( wcShippingScanFormOnboarding.orders_list_url, '_blank' );
				}
			}
		} );

		// "Got it" button - dismisses notice.
		document.addEventListener( 'click', function ( e ) {
			if ( e.target.closest( '.wcshipping-scanform-got-it' ) ) {
				e.preventDefault();

				// Find the parent notice.
				const notice = e.target.closest( '.notice' );

				// Dismiss the notice.
				dismissNotice( notice );
			}
		} );

		// Notice dismiss button (X) - dismisses notice.
		document.addEventListener( 'click', function ( e ) {
			if ( e.target.closest( '.wcshipping-scanform-onboarding-notice .notice-dismiss' ) ) {
				dismissNotice();
			}
		} );
	}

	/**
	 * Dismisses the onboarding notice via AJAX
	 *
	 * @param {HTMLElement|null} notice The notice element to dismiss.
	 */
	function dismissNotice( notice = null ) {
		// Prepare form data.
		const formData = new FormData();
		formData.append( 'action', 'wcshipping_dismiss_scanform_onboarding' );
		formData.append( 'nonce', wcShippingScanFormOnboarding.nonce );

		// Send AJAX request.
		fetch( ajaxurl, {
			method: 'POST',
			body: formData,
		} )
			.then( function ( response ) {
				return response.json();
			} )
			.then( function ( data ) {
				if ( data.success && notice ) {
					// Fade out and remove the notice.
					notice.style.transition = 'opacity 300ms';
					notice.style.opacity = '0';

					setTimeout( function () {
						notice.remove();
					}, 300 );
				}
			} )
			.catch( function ( error ) {
				// Log error but don't show to user.
				console.error( 'Error dismissing notice:', error );
			} );
	}
} )();
