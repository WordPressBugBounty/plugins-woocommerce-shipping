export interface ConnectServerErrorCodes {
	MISSING_UPSDAP_TOS_ACCEPTANCE: string;
	ORIGIN_ADDRESS_LIMIT_REACHED: string;
}

export interface Constants {
	WCSHIPPING_PLUGIN_FILE: string;
	WCSHIPPING_PLUGIN_DIR: string;
	WCSHIPPING_RELATIVE_PLUGIN_DIR: string;
	WC_PLUGIN_RELATIVE_DIR: string;
	/**
	 * Connect Server error codes the API clients surface verbatim. Declared in
	 * `Automattic\WCShipping\Connect\ConnectServerErrorCodes` and handed over
	 * in `WCShipping_Config` so they are not duplicated here.
	 */
	CONNECT_SERVER_ERROR_CODES: ConnectServerErrorCodes;
}
