/**
 * Checkout JS
 *
 * @package Automattic/WCShipping
 */

const { __ } = wp.i18n;

( function () {

	// We need our localized data to be able to run this script.
	if ( ! wcshipping_checkout ) {
		return;
	}

	// Handle classic checkout.
	function handleClassicCheckout( suggestedAddressJSON ) {
		const suggestedAddressObject = JSON.parse( suggestedAddressJSON );

		// Loop through suggested address object and apply the values to the corresponding inputs.
		Object.entries( suggestedAddressObject ).forEach(
			function ( [ key, value ] ) {
				const isShipToDifferentAddressChecked = document.getElementById( 'ship-to-different-address-checkbox' ).checked;
				const input                           = document.querySelector( isShipToDifferentAddressChecked ? '[id="shipping_' + key + '"]' : '[id$="' + key + '"]' );

				if ( input ) {
					input.value = value;

					// If the target is a select2 field, trigger the change event.
					if ( input.classList.contains( 'select2-hidden-accessible' ) ) {
						const event = new Event( 'change', { bubbles: true } );
						input.dispatchEvent( event );
					}
				}
			}
		);
	}

	// Fire custom event for applying the suggested address.
	function fireApplySuggestedAddressEvent( suggestedAddressJSON ) {
		const useShippingAsBilling = window.wp.data.select( window.wc.wcBlocksData.CHECKOUT_STORE_KEY ).getUseShippingAsBilling();
		const event                = new CustomEvent( 'wcShippingApplySuggestedAddress', {
			detail: {
				suggestedAddress: suggestedAddressJSON,
				useShippingAsBilling: useShippingAsBilling,
				storeApiIdentifier: wcshipping_checkout.store_api_identifier,
			}
		} );

		window.dispatchEvent( event );
	}

	// Handle clicking the suggested address.
	document.addEventListener(
		'click',
		function ( e ) {

			if ( ! e.target.classList.contains( 'wcshipping_apply_suggested_address' ) ) {
				return;
			}

			e.preventDefault();

			const button               = e.target;
			const suggestedAddressJSON = button.getAttribute( 'data-suggested_address' );

			if ( ! suggestedAddressJSON ) {
				return;
			}

			// Change the button text to indicate that the address is being applied.
			button.innerHTML = __( 'Applying...', 'woocommerce-shipping' );

			if ( '1' !== wcshipping_checkout.is_blocks_checkout ) {
				handleClassicCheckout( suggestedAddressJSON );
			} else {
				fireApplySuggestedAddressEvent( suggestedAddressJSON );
			}
		}
	);
} )();