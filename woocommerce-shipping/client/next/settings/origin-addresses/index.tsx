/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import {
	store as coreStore,
	privateApis as coreDataPrivateApis,
} from '@wordpress/core-data';
import { store as noticesStore } from '@wordpress/notices';
import { pencil, plus } from '@wordpress/icons';
import {
	__experimentalHeading as Heading,
	Card,
	__experimentalVStack as VStack,
	__experimentalHStack as HStack,
	CardBody,
	CardHeader,
	__experimentalText as Text,
	CardFooter,
	Button,
} from '@wordpress/components';
import { DataViews } from '@wordpress/dataviews/wp';

/**
 * Internal dependencies
 */
import { getItemId, getAddressDetail, getAddressTitle } from './utils';
import { useConfigLoader, unlock } from 'next/utils';
import { ADDRESS_ENTITY } from 'next/data';
import { OriginAddressModal } from './origin-address-modal';
import { Badge } from 'components/wp';

import './style.scss';

const { useEntityRecordsWithPermissions } = unlock( coreDataPrivateApis );

export const OriginAddresses = () => {
	const [ isModalOpen, setIsModalOpen ] = useState( false );
	const [ selectedAddressId, setSelectedAddressId ] = useState< string >();

	// Ensure config and address store are loaded when this screen mounts
	// (e.g. when navigating from "Buy a shipping label" without the filter having run).
	useConfigLoader();

	// @ts-ignore invalidateResolution
	const { deleteEntityRecord, invalidateResolution } =
		useDispatch( coreStore );
	const { createSuccessNotice, createErrorNotice } =
		useDispatch( noticesStore );
	const { records: addresses, isResolving } = useEntityRecordsWithPermissions(
		ADDRESS_ENTITY.kind,
		ADDRESS_ENTITY.name
	);

	const { canUser } = useSelect( coreStore, [] );

	const canCreateRecord = canUser( 'create', {
		kind: ADDRESS_ENTITY.kind,
		name: ADDRESS_ENTITY.name,
	} );

	const handleEdit = ( id: string ) => {
		setSelectedAddressId( id );
		setIsModalOpen( true );
	};

	const handleAdd = () => {
		setIsModalOpen( true );
	};

	const handleModalClose = async () => {
		setIsModalOpen( false );
		setSelectedAddressId( undefined );
	};

	const handleModalComplete = async () => {
		await handleModalClose();

		if ( selectedAddressId ) {
			createSuccessNotice(
				__( 'Address updated', 'woocommerce-shipping' ),
				{ type: 'snackbar' }
			);
		} else {
			createSuccessNotice(
				__( 'Address added', 'woocommerce-shipping' ),
				{ type: 'snackbar' }
			);
		}

		invalidateResolution( 'getEntityRecords', [
			ADDRESS_ENTITY.kind,
			ADDRESS_ENTITY.name,
			{},
		] );
	};

	const handleDelete = async ( id: string ) => {
		try {
			await deleteEntityRecord(
				ADDRESS_ENTITY.kind,
				ADDRESS_ENTITY.name,
				id,
				{
					throwOnError: true,
				}
			);
			createSuccessNotice(
				__( 'Address deleted', 'woocommerce-shipping' ),
				{ type: 'snackbar' }
			);
		} catch {
			createErrorNotice(
				__( 'Error deleting address', 'woocommerce-shipping' ),
				{ type: 'snackbar' }
			);
		}
	};

	return (
		<Card>
			{ isModalOpen && (
				<OriginAddressModal
					onClose={ handleModalClose }
					onComplete={ handleModalComplete }
					addressId={ selectedAddressId }
				/>
			) }
			<CardHeader isBorderless>
				<VStack>
					<Heading level={ 4 } weight={ 'normal' }>
						{ __( 'Ship-from location', 'woocommerce-shipping' ) }
					</Heading>
					<Text variant="muted">
						{ __(
							'This address is used to calculate shipping rates and delivery times.',
							'woocommerce-shipping'
						) }
					</Text>
				</VStack>
			</CardHeader>
			<CardBody>
				<DataViews
					isLoading={ isResolving }
					data={ addresses }
					getItemId={ getItemId }
					defaultLayouts={ { list: {} } }
					fields={ [
						{
							id: 'title',
							getValue: ( args ) => (
								<HStack spacing={ 2 } alignment="left">
									<Text weight={ 500 }>
										{ getAddressTitle( args ) }
									</Text>
									{ args.item.default_address && (
										<Badge>
											{ __(
												'Default Origin',
												'woocommerce-shipping'
											) }
										</Badge>
									) }
									{ args.item.default_return_address && (
										<Badge>
											{ __(
												'Default Return',
												'woocommerce-shipping'
											) }
										</Badge>
									) }
								</HStack>
							),
						},
						{
							id: 'detail',
							getValue: getAddressDetail,
						},
					] }
					onChangeView={ () => null }
					paginationInfo={ {
						totalItems: addresses.length,
						totalPages: 1,
					} }
					actions={ [
						{
							id: 'edit',
							isPrimary: true,
							icon: pencil,
							label: __( 'Edit', 'woocommerce-shipping' ),
							isEligible: () => !! canCreateRecord,
							callback: ( [ item ] ) => handleEdit( item.id ),
						},
						{
							id: 'delete',
							label: __( 'Delete', 'woocommerce-shipping' ),
							isEligible: ( item ) =>
								! item.default_address && !! canCreateRecord,
							callback: ( [ item ] ) => handleDelete( item.id ),
						},
					] }
					onChangeSelection={ ( items ) => {
						handleEdit( items[ 0 ] );
					} }
					view={ {
						fields: [ 'detail' ],
						type: 'list',
						titleField: 'title',
					} }
				>
					<DataViews.Layout />
				</DataViews>
				<CardFooter isBorderless size="small">
					<Button
						variant="tertiary"
						icon={ plus }
						disabled={ ! canCreateRecord }
						onClick={ handleAdd }
					>
						{ __( 'Add another', 'woocommerce-shipping' ) }
					</Button>
				</CardFooter>
			</CardBody>
		</Card>
	);
};
