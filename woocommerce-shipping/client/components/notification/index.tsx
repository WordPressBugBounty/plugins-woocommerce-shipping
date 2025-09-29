import { Flex, Icon, __experimentalText as Text } from '@wordpress/components';
import { error, info, published } from '@wordpress/icons';
import WarningIcon from 'components/icons/warning-icon';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

function contextBasedIcon( type: NotificationType = 'info' ) {
	switch ( type ) {
		case 'info':
			return info;
		case 'success':
			return published;
		case 'warning':
			return WarningIcon;
		case 'error':
			return error;
		default:
			return null;
	}
}

const iconColorMap: Record< NotificationType, string > = {
	info: '#A77F30',
	success: '#2E7D32',
	warning: '#A77F30',
	error: '#8C0B0B',
};

const backgroundColorMap: Record< NotificationType, string > = {
	info: '#F0B8490A',
	success: '#E8F5E9',
	warning: '#F0B8490A',
	error: '#CC18180A',
};

const borderColorMap: Record< NotificationType, string > = {
	info: '#0000001A',
	success: '#A5D6A7',
	warning: '#0000001A',
	error: '#0000001A',
};

interface NotificationProps {
	type?: NotificationType;
	title?: string;
	children: React.ReactNode;
	className?: string;
}

const Notification = ( {
	type = 'info',
	title,
	children,
	className,
	...props
}: NotificationProps & React.ComponentPropsWithoutRef< 'div' > ) => {
	const icon = contextBasedIcon( type );
	return (
		<Flex
			direction="column"
			gap={ 2 }
			style={ {
				background: backgroundColorMap[ type ],
				border: `1px solid ${ borderColorMap[ type ] }`,
				borderRadius: 'var(--radius-l, 8px)',
				fontSize: '13px',
				marginBottom: '8px',
				padding: '16px',
			} }
			{ ...props }
		>
			<Flex
				direction="row"
				justify="flex-start"
				align="flex-start"
				gap={ 2 }
			>
				{ icon && (
					<Icon
						icon={ icon }
						size={ 24 }
						fill={ iconColorMap[ type ] }
						style={ {
							marginTop: '-3px',
						} }
					/>
				) }
				<Flex
					direction="column"
					gap={ 4 }
					style={ { lineHeight: 1.4 } }
				>
					{ title ? <Text weight={ 500 }>{ title }</Text> : null }
					{ children }
				</Flex>
			</Flex>
		</Flex>
	);
};

export default Notification;
