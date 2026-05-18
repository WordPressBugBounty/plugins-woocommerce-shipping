import { Button, Dropdown, MenuGroup, MenuItem } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { Icon, chevronDown } from '@wordpress/icons';
import type { ReactNode } from 'react';

export type FilterMode = 'all' | 'ready' | 'needs_fix';

interface ToolbarProps {
	selectedCount: number;
	totalCount: number;
	readyCount: number;
	needsFixCount: number;
	filter: FilterMode;
	onFilterChange: ( mode: FilterMode ) => void;
}

interface ApplyDropdownProps {
	emoji: string;
	label: string;
	defaultValue: string;
	options: string[];
}

/**
 * Visual-only apply-to-all dropdown — clicking an option updates the
 * displayed value via local state so the toolbar feels alive in
 * screenshots. The real apply-to-all wiring (broadcasting the choice
 * to every row, persisting it, etc.) lands with WOOSHIP-2133.
 */
const ApplyDropdown = ( {
	emoji,
	label,
	defaultValue,
	options,
}: ApplyDropdownProps ): ReactNode => {
	const [ value, setValue ] = useState( defaultValue );

	return (
		<Dropdown
			renderToggle={ ( { isOpen, onToggle } ) => (
				<Button
					className="bulk-purchase-modal__apply-button"
					onClick={ onToggle }
					aria-expanded={ isOpen }
				>
					<span className="bulk-purchase-modal__apply-emoji">
						{ emoji }
					</span>
					<span className="bulk-purchase-modal__apply-label">
						{ label }:
					</span>
					<span className="bulk-purchase-modal__apply-value">
						{ value }
					</span>
					<Icon icon={ chevronDown } size={ 16 } />
				</Button>
			) }
			renderContent={ ( { onClose } ) => (
				<MenuGroup>
					{ options.map( ( option ) => (
						<MenuItem
							key={ option }
							onClick={ () => {
								setValue( option );
								onClose();
							} }
						>
							{ option }
						</MenuItem>
					) ) }
				</MenuGroup>
			) }
		/>
	);
};

export const Toolbar = ( {
	selectedCount,
	totalCount,
	readyCount,
	needsFixCount,
	filter,
	onFilterChange,
}: ToolbarProps ) => {
	return (
		<div className="bulk-purchase-modal__toolbar">
			<div className="bulk-purchase-modal__toolbar-left">
				<div className="bulk-purchase-modal__toolbar-summary">
					<strong>
						{ sprintf(
							/* translators: 1: number selected, 2: total count */
							__(
								'%1$d of %2$d selected',
								'woocommerce-shipping'
							),
							selectedCount,
							totalCount
						) }
					</strong>
					<span className="bulk-purchase-modal__toolbar-divider">
						·
					</span>
					<span>
						{ __( 'Apply to all:', 'woocommerce-shipping' ) }
					</span>
				</div>
				<div className="bulk-purchase-modal__toolbar-controls">
					<ApplyDropdown
						emoji="📦"
						label={ __( 'Package', 'woocommerce-shipping' ) }
						defaultValue="QWER 8×9×10"
						options={ [
							'QWER 8×9×10',
							'Medium box 12×9×6',
							'Padded mailer 10×7',
						] }
					/>
					<ApplyDropdown
						emoji="🚚"
						label={ __( 'Service', 'woocommerce-shipping' ) }
						defaultValue="Cheapest available"
						options={ [
							'Cheapest available',
							'USPS Priority Mail',
							'USPS Ground Advantage',
						] }
					/>
					<ApplyDropdown
						emoji="📅"
						label={ __( 'Ship date', 'woocommerce-shipping' ) }
						defaultValue="Today"
						options={ [ 'Today', 'Tomorrow', 'Pick a date…' ] }
					/>
					<ApplyDropdown
						emoji="✍️"
						label={ __( 'Signature', 'woocommerce-shipping' ) }
						defaultValue="Not required"
						options={ [
							'Not required',
							'Signature required',
							'Adult signature required',
						] }
					/>
				</div>
			</div>
			<div
				className="bulk-purchase-modal__toolbar-tabs"
				aria-label={ __( 'Filter orders', 'woocommerce-shipping' ) }
			>
				<button
					type="button"
					aria-pressed={ filter === 'all' }
					className={ `bulk-purchase-modal__tab ${
						filter === 'all'
							? 'bulk-purchase-modal__tab--active'
							: ''
					}` }
					onClick={ () => onFilterChange( 'all' ) }
				>
					{ sprintf(
						/* translators: %d: total order count */
						__( 'All %d', 'woocommerce-shipping' ),
						totalCount
					) }
				</button>
				<button
					type="button"
					aria-pressed={ filter === 'ready' }
					className={ `bulk-purchase-modal__tab ${
						filter === 'ready'
							? 'bulk-purchase-modal__tab--active'
							: ''
					}` }
					onClick={ () => onFilterChange( 'ready' ) }
				>
					{ sprintf(
						/* translators: %d: number of ready orders */
						__( 'Ready %d', 'woocommerce-shipping' ),
						readyCount
					) }
				</button>
				<button
					type="button"
					aria-pressed={ filter === 'needs_fix' }
					className={ `bulk-purchase-modal__tab ${
						filter === 'needs_fix'
							? 'bulk-purchase-modal__tab--active'
							: ''
					}` }
					onClick={ () => onFilterChange( 'needs_fix' ) }
				>
					{ sprintf(
						/* translators: %d: number of orders needing fix */
						__( 'Needs fix %d', 'woocommerce-shipping' ),
						needsFixCount
					) }
				</button>
			</div>
		</div>
	);
};
