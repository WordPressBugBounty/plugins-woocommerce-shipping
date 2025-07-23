import {
	CUSTOM_BOX_ID_PREFIX,
	CUSTOM_PACKAGE_TYPES,
} from './packages/constants';
import { CustomPackage } from 'types';

export const mainModalContentSelector =
	'.label-purchase-modal > .components-modal__content';

export const defaultCustomPackageData: CustomPackage & { isLetter: boolean } = {
	name: '',
	length: '',
	width: '',
	height: '',
	boxWeight: 0,
	id: CUSTOM_BOX_ID_PREFIX,
	type: CUSTOM_PACKAGE_TYPES.BOX,
	isLetter: false,
	dimensions: '10 x 10 x 10',
	isUserDefined: true,
};

export const settingsPageUrl =
	'admin.php?page=wc-settings&tab=shipping&section=woocommerce-shipping-settings';

export const TIME_TO_WAIT_TO_CHECK_PURCHASED_LABEL_STATUS_MS = 10000;

// Maximum number of retries for checking label status (30 retries * 10 seconds = 5 minutes)
export const MAX_LABEL_STATUS_RETRIES = 30;

// Timeout duration for label purchase process (5 minutes)
export const LABEL_PURCHASE_TIMEOUT_MS = 5 * 60 * 1000;
