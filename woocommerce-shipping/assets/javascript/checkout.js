/**
 * Checkout JS
 */
( function () {
	const { __ } = wp.i18n;

	// The payload is base64 so the checkout block's entity decoding cannot cut it short. Markup from
	// a page cache may still hold raw JSON, so that is accepted too. Returns the decoded address
	// object, or null when the payload is not usable. wp_json_encode() emits pure ASCII, so atob()
	// alone decodes it.
	function decodeSuggestedAddress( value ) {
		if ( ! value ) {
			return null;
		}

		try {
			return JSON.parse( atob( value ) );
		} catch {}

		try {
			return JSON.parse( value );
		} catch {
			return null;
		}
	}

	const controlSelector =
		'a[data-suggested_address], button[data-suggested_address]';

	// The sanitizer on the block checkout strips class and role from server markup, but leaves
	// what the page adds at runtime alone. Restoring them here brings back the theme's own
	// button styling and announces the control as a button again.
	function decorateControl( control ) {
		control.classList.add(
			'button',
			'wp-element-button',
			'wcshipping_apply_suggested_address'
		);

		if ( ! control.getAttribute( 'role' ) ) {
			control.setAttribute( 'role', 'button' );
		}
	}

	// An in-place re-render hands the observer the anchor itself as an added node, not a
	// container around it, so the root has to be matched as well as searched.
	function decorateControlsIn( root ) {
		if ( root.matches && root.matches( controlSelector ) ) {
			decorateControl( root );
		}

		if ( ! root.querySelectorAll ) {
			return;
		}

		root.querySelectorAll( controlSelector ).forEach( decorateControl );
	}

	// Exported for the unit tests. This must run before the settings guard below, so the
	// helpers stay reachable without a checkout page.
	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = { decodeSuggestedAddress, decorateControlsIn };
	}

	// We need our localized data to be able to run this script.
	if (
		typeof wcShippingSettings === 'undefined' ||
		! wcShippingSettings?.checkout
	) {
		return;
	}

	const wcCheckoutScope = document.querySelector( '.woocommerce-checkout' );

	// Handle classic checkout.
	function handleClassicCheckout( suggestedAddressObject ) {
		const isShipToDifferentAddressChecked = document.getElementById(
			'ship-to-different-address-checkbox'
		)?.checked;

		// Loop through suggested address object and apply the values to the corresponding inputs.
		Object.entries( suggestedAddressObject ).forEach( function ( [
			key,
			value,
		] ) {
			const input = document.querySelector(
				isShipToDifferentAddressChecked
					? '[id="shipping_' + key + '"]'
					: '[id$="' + key + '"]'
			);

			if ( input ) {
				input.value = value;

				// If the target is a select2 field, trigger the change event.
				if ( input.classList.contains( 'select2-hidden-accessible' ) ) {
					const event = new Event( 'change', { bubbles: true } );
					input.dispatchEvent( event );
				}
			}
		} );
	}

	// Fire custom event for applying the suggested address.
	function fireApplySuggestedAddressEvent( suggestedAddressJSON ) {
		const useShippingAsBilling = window.wp.data
			.select( window.wc.wcBlocksData.CHECKOUT_STORE_KEY )
			.getUseShippingAsBilling();
		const event = new CustomEvent( 'wcShippingApplySuggestedAddress', {
			detail: {
				suggestedAddress: suggestedAddressJSON,
				useShippingAsBilling,
				storeApiIdentifier:
					wcShippingSettings.checkout.store_api_identifier,
			},
		} );

		wcCheckoutScope.dispatchEvent( event );
	}

	function applySuggestedAddress( control ) {
		// A second activation while one is in flight would send a second cart update and
		// overwrite the label it needs to restore.
		if ( control.dataset.wcshippingApplying ) {
			return;
		}

		const suggestedAddressObject = decodeSuggestedAddress(
			control.getAttribute( 'data-suggested_address' )
		);

		if ( ! suggestedAddressObject ) {
			return;
		}

		// Only now that the payload decoded: indicate the address is being applied.
		const originalLabel = control.textContent;
		control.textContent = __( 'Applying…', 'woocommerce-shipping' );
		control.dataset.wcshippingApplying = '1';

		// Put the label back when the apply fails, so the shopper can retry.
		const restoreLabel = function () {
			delete control.dataset.wcshippingApplying;
			control.textContent = originalLabel;
			wcCheckoutScope.removeEventListener(
				'wcShippingApplySuggestedAddressFailed',
				restoreLabel
			);
		};
		wcCheckoutScope.addEventListener(
			'wcShippingApplySuggestedAddressFailed',
			restoreLabel
		);

		if (
			! [ '1', 1 ].includes(
				wcShippingSettings.checkout.is_blocks_checkout
			)
		) {
			// Synchronous: the fields are filled by the time it returns, so the label
			// goes straight back rather than sticking at Applying.
			handleClassicCheckout( suggestedAddressObject );
			restoreLabel();
		} else {
			fireApplySuggestedAddressEvent(
				JSON.stringify( suggestedAddressObject )
			);
		}
	}

	// Handle clicking the suggested address.
	wcCheckoutScope.addEventListener( 'click', function ( e ) {
		const control = e.target.closest( controlSelector );

		if ( ! control ) {
			return;
		}

		e.preventDefault();

		applySuggestedAddress( control );
	} );

	// A link activates on Enter only; the button this control replaces also activated on Space.
	wcCheckoutScope.addEventListener( 'keydown', function ( e ) {
		if ( e.key !== ' ' && e.key !== 'Spacebar' ) {
			return;
		}

		const control = e.target.closest( controlSelector );

		if ( ! control ) {
			return;
		}

		e.preventDefault();

		applySuggestedAddress( control );
	} );

	decorateControlsIn( wcCheckoutScope );

	// Notices render and re-render through the checkout's notice slot, so decorate as they appear.
	new MutationObserver( function ( mutations ) {
		mutations.forEach( function ( mutation ) {
			mutation.addedNodes.forEach( decorateControlsIn );
		} );
	} ).observe( wcCheckoutScope, { childList: true, subtree: true } );
} )();
