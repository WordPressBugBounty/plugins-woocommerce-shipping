import { Button, Dropdown, MenuGroup, MenuItem } from '@wordpress/components';
import { Icon, chevronDown } from '@wordpress/icons';
import type { ReactNode } from 'react';

export interface ApplyOption {
	label: string;
	value: string;
	/** Optional leading visual (e.g. a carrier logo) shown left of the label. */
	icon?: ReactNode;
}

interface ApplyDropdownProps {
	options: ApplyOption[];
	/** Toolbar-style toggle: "Package: <value>". Omit for a compact cell. */
	label?: string;
	value: string;
	onSelect: ( value: string ) => void;
	/** Accessible name for the toggle when there's no visible `label`. */
	ariaLabel?: string;
	/** Shown in the compact toggle when nothing is selected yet. */
	placeholder?: string;
}

/**
 * Shared "Apply to all" / per-row dropdown. Built on `Dropdown` +
 * `MenuGroup` + `MenuItem` so options can carry a leading icon (carrier
 * logo, etc.) — something `SelectControl` can't render. Toolbar controls
 * pass `label`; table cells use the compact toggle that just
 * shows the selected option (icon + label).
 */
export const ApplyDropdown = ( {
	options,
	label,
	value,
	onSelect,
	ariaLabel,
	placeholder,
}: ApplyDropdownProps ): ReactNode => {
	const selectedOption = options.find( ( option ) => option.value === value );
	const displayLabel = selectedOption?.label ?? placeholder ?? value;
	const isToolbarStyle = label !== undefined;

	return (
		<Dropdown
			renderToggle={ ( { isOpen, onToggle } ) => (
				<Button
					className={
						isToolbarStyle
							? 'bulk-purchase-modal__apply-button'
							: 'bulk-purchase-modal__cell-dropdown-toggle'
					}
					onClick={ onToggle }
					aria-expanded={ isOpen }
					label={ ariaLabel }
				>
					{ isToolbarStyle ? (
						<>
							{ label !== undefined && (
								<span className="bulk-purchase-modal__apply-label">
									{ label }:
								</span>
							) }
							<span className="bulk-purchase-modal__apply-value">
								{ displayLabel }
							</span>
						</>
					) : (
						<span className="bulk-purchase-modal__cell-dropdown-current">
							{ selectedOption?.icon && (
								<span className="bulk-purchase-modal__cell-dropdown-icon">
									{ selectedOption.icon }
								</span>
							) }
							<span className="bulk-purchase-modal__cell-dropdown-text">
								{ displayLabel }
							</span>
						</span>
					) }
					<Icon icon={ chevronDown } size={ 16 } />
				</Button>
			) }
			renderContent={ ( { onClose } ) => (
				<MenuGroup>
					{ options.map( ( option ) => (
						<MenuItem
							key={ option.value }
							isSelected={ option.value === value }
							onClick={ () => {
								onSelect( option.value );
								onClose();
							} }
						>
							<span className="bulk-purchase-modal__cell-dropdown-option">
								{ option.icon && (
									<span className="bulk-purchase-modal__cell-dropdown-icon">
										{ option.icon }
									</span>
								) }
								<span className="bulk-purchase-modal__cell-dropdown-text">
									{ option.label }
								</span>
							</span>
						</MenuItem>
					) ) }
				</MenuGroup>
			) }
		/>
	);
};
