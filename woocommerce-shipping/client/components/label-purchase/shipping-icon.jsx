import { Icon } from '@wordpress/components';

export const ShippingIcon = () => (
	<Icon
		size={ 36 }
		icon={ () => (
			<svg
				height="36"
				width="36"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
			>
				<g>
					<path d="M18 8h-2V7c0-1.105-.895-2-2-2H4c-1.105 0-2 .895-2 2v10h2c0 1.657 1.343 3 3 3s3-1.343 3-3h4c0 1.657 1.343 3 3 3s3-1.343 3-3h2v-5l-4-4zM7 18.5c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zM4 14V7h10v7H4zm13 4.5c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5z"></path>
				</g>
			</svg>
		) }
	></Icon>
);
