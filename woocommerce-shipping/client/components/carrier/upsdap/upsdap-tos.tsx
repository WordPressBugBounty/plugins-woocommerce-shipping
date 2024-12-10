import { createInterpolateElement, useState } from '@wordpress/element';
import {
	__experimentalSpacer as Spacer,
	Button,
	CheckboxControl,
	Flex,
	Modal,
	Notice,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { addressToString, recordEvent } from 'utils';
import { UPSDAP_TOS_TYPES } from './constants';
import { LabelPurchaseError, OriginAddress } from 'types';
import { uniq } from 'lodash';

interface UPSDAPTosProps {
	close: () => void;
	confirm: ( confirm: boolean ) => void;
	shipmentOrigin: OriginAddress;
	error?: LabelPurchaseError | null;
	isConfirming?: boolean;
	setIsConfirming?: ( isConfirming: boolean ) => void;
}

export const UPSDAPTos = ( {
	close,
	confirm,
	shipmentOrigin,
	error,
	isConfirming = false,
	setIsConfirming = () => undefined,
}: UPSDAPTosProps ) => {
	const [ selectedItems, setSelectedItem ] = useState<
		( typeof UPSDAP_TOS_TYPES )[ keyof typeof UPSDAP_TOS_TYPES ][]
	>( [] );
	const toggleItem =
		(
			type: ( typeof UPSDAP_TOS_TYPES )[ keyof typeof UPSDAP_TOS_TYPES ]
		) =>
		( select: boolean ) => {
			if ( select ) {
				setSelectedItem( ( prevSelections ) => [
					...prevSelections,
					type,
				] );
			} else {
				setSelectedItem( ( prevSelections ) =>
					prevSelections.filter( ( item ) => item !== type )
				);
			}
		};

	const onConfirm = async () => {
		setIsConfirming( true );
		recordEvent( 'label_purchase_upsdap_tos_confirmed', {
			name: shipmentOrigin?.name ?? '',
			company: shipmentOrigin?.company ?? '',
			address1: shipmentOrigin?.address1 ?? '',
			address2: shipmentOrigin?.address2 ?? '',
			city: shipmentOrigin?.city ?? '',
			state: shipmentOrigin?.state ?? '',
			postcode: shipmentOrigin?.postcode ?? '',
			country: shipmentOrigin?.country ?? '',
			phone: shipmentOrigin?.phone ?? '',
			email: shipmentOrigin?.email ?? '',
		} );
		confirm( true );
	};

	const onClose = () => {
		recordEvent( 'label_purchase_upsdap_tos_closed', {
			name: shipmentOrigin?.name ?? '',
			company: shipmentOrigin?.company ?? '',
			address1: shipmentOrigin?.address1 ?? '',
			address2: shipmentOrigin?.address2 ?? '',
			city: shipmentOrigin?.city ?? '',
			state: shipmentOrigin?.state ?? '',
			postcode: shipmentOrigin?.postcode ?? '',
			country: shipmentOrigin?.country ?? '',
			phone: shipmentOrigin?.phone ?? '',
			email: shipmentOrigin?.email ?? '',
		} );
		close();
	};

	return (
		<Modal
			overlayClassName="wcshipping-ups-tos-overlay"
			className="wcshipping-ups-tos-modal"
			onRequestClose={ onClose }
			focusOnMount
			shouldCloseOnClickOutside={ false }
			shouldCloseOnEsc={ false }
			size="medium"
			contentLabel={ __(
				'UPS® Terms and Conditions',
				'woocommerce-shipping'
			) }
			title={ __( 'UPS® Terms and Conditions', 'woocommerce-shipping' ) }
		>
			<Flex direction="column" gap={ 4 } as="section">
				<Flex as="header" direction="column" gap={ 6 }>
					<Flex
						gap={ 0 }
						align="first baseline"
						direction={ 'column' }
					>
						<dt>
							{ __( 'Shipping from', 'woocommerce-shipping' ) }
						</dt>
						<dd>{ addressToString( shipmentOrigin ) }</dd>
					</Flex>
					<p>
						{ __(
							'To start shipping from this address with UPS®, we need you to agree to the following terms and conditions::',
							'woocommerce-shipping'
						) }
					</p>
				</Flex>
				<CheckboxControl
					// @ts-ignore
					label={ createInterpolateElement(
						__(
							'I agree to the <a>UPS® Terms of Service</a>.',
							'woocommerce-shipping'
						),
						{
							a: (
								<a
									href="https://www.ups.com/us/en/help-center/legal-terms-conditions/service.page"
									target="_blank"
									rel="noreferrer"
								>
									{ __(
										'UPS® Terms of Service',
										'woocommerce-shipping'
									) }
								</a>
							),
						}
					) }
					value={ UPSDAP_TOS_TYPES.LEGAL }
					checked={ selectedItems.includes( UPSDAP_TOS_TYPES.LEGAL ) }
					onChange={ toggleItem( UPSDAP_TOS_TYPES.LEGAL ) }
				/>
				<CheckboxControl
					// @ts-ignore
					label={ createInterpolateElement(
						__(
							'I will not ship any <a>Prohibited Items</a> that UPS® disallows, nor any regulated items without the necessary permissions.',
							'woocommerce-shipping'
						),
						{
							a: (
								<a
									href="https://www.ups.com/us/en/support/shipping-support/shipping-special-care-regulated-items/prohibited-items.page"
									target="_blank"
									rel="noreferrer"
								>
									{ __(
										'Prohibited Items',
										'woocommerce-shipping'
									) }
								</a>
							),
						}
					) }
					value={ UPSDAP_TOS_TYPES.PROHIBITED_ITEMS }
					checked={ selectedItems.includes(
						UPSDAP_TOS_TYPES.PROHIBITED_ITEMS
					) }
					onChange={ toggleItem( UPSDAP_TOS_TYPES.PROHIBITED_ITEMS ) }
				/>
				<CheckboxControl
					// @ts-ignore
					label={ createInterpolateElement(
						__(
							'I also agree to the <a>UPS® Technology Agreement</a>.',
							'woocommerce-shipping'
						),
						{
							a: (
								<a
									href="https://www.ups.com/assets/resources/webcontent/en_US/UTA.pdf"
									target="_blank"
									rel="noreferrer"
								>
									{ __(
										'UPS Technology Agreement',
										'woocommerce-shipping'
									) }
								</a>
							),
						}
					) }
					checked={ selectedItems.includes(
						UPSDAP_TOS_TYPES.TECHNOLOGY_AGREEMENT
					) }
					value={ UPSDAP_TOS_TYPES.TECHNOLOGY_AGREEMENT }
					onChange={ toggleItem(
						UPSDAP_TOS_TYPES.TECHNOLOGY_AGREEMENT
					) }
				/>
			</Flex>
			<Spacer marginTop={ 6 } marginBottom={ 0 } />
			<Flex justify="flex-end">
				<Button
					variant="primary"
					disabled={
						selectedItems.length <
							Object.keys( UPSDAP_TOS_TYPES ).length ||
						isConfirming
					}
					isBusy={ isConfirming }
					onClick={ onConfirm }
				>
					{ __( 'Confirm and continue', 'woocommerce-shipping' ) }
				</Button>
			</Flex>
			{ error && (
				<>
					<Spacer marginTop={ 4 } marginBottom={ 0 } />
					<Notice status="error" isDismissible={ false }>
						{ uniq( error.message ).map( ( m, index ) => (
							<p key={ index }>{ m }</p>
						) ) }
					</Notice>
				</>
			) }
		</Modal>
	);
};
