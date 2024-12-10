import {
	WCShippingAnalyticsConfig,
	WCShippingConfig,
	WCShippingConfigAccountSettings,
} from 'types';

export const getConfig = (): WCShippingConfig =>
	( window.WCShipping_Config || {} ) as WCShippingConfig;

export const getWeightUnit = () => {
	return getConfig().shippingLabelData.storeOptions.weight_unit;
};

export const getCurrencySymbol = () => {
	return getConfig().shippingLabelData.storeOptions.currency_symbol;
};

export const getDimensionsUnit = () => {
	return getConfig().shippingLabelData.storeOptions.dimension_unit;
};

export const getAccountSettings = ( { accountSettings } = getConfig() ) =>
	accountSettings;

export const setAccountSettings = (
	newSettings: WCShippingConfigAccountSettings
) => {
	getConfig().accountSettings = newSettings;
};

export const getLastOrderCompleted = ( { accountSettings } = getConfig() ) =>
	accountSettings.userMeta.last_order_completed;

export const getSelectedRates = () =>
	getConfig().shippingLabelData.storedData.selected_rates;

export const getSelectedHazmat = () =>
	getConfig().shippingLabelData.storedData.selected_hazmat;

export const getCustomsInformation = () =>
	getConfig().shippingLabelData.storedData.customs_information;

export const getPluginRelativeDirectory = ( forWooCommerce = false ) =>
	forWooCommerce
		? getConfig().constants.WC_PLUGIN_RELATIVE_DIR
		: getConfig().constants.WCSHIPPING_RELATIVE_PLUGIN_DIR;

export const getCarrierStrategies = ( { carrier_strategies } = getConfig() ) =>
	carrier_strategies;

export const shouldAutomaticallyOpenPrintDialog = ( config = getConfig() ) =>
	getAccountSettings( config ).purchaseSettings
		.automatically_open_print_dialog;

// Only set on Analytics page
export const getAnalyticsConfig = () =>
	window.WCShipping_Config as WCShippingAnalyticsConfig;
