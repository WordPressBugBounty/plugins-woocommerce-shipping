import { LabelPurchaseContext } from './context';
import { LabelPurchaseContextProviderProps } from './types';

export const LabelPurchaseContextProvider = ( {
	children,
	initialValue,
}: LabelPurchaseContextProviderProps ): React.JSX.Element => (
	<LabelPurchaseContext.Provider value={ initialValue }>
		{ children }
	</LabelPurchaseContext.Provider>
);
