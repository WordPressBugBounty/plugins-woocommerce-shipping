import * as Sentry from '@sentry/react';

export const initSentry = () => {
	Sentry.init( {
		dsn: 'https://971a8d22e72fade3cc3bc7ee7c0c2093@o248881.ingest.us.sentry.io/4506903329046528',
		integrations: [ Sentry.replayIntegration() ],
		environment: window.wcShippingSettings?.environment,
		release: 'wcshipping@' + window.wcShippingSettings?.version,
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,
	} );

	Sentry.setTag(
		'wc_version',
		window.wc?.wcSettings.WC_VERSION ?? 'unknown version'
	);
};
