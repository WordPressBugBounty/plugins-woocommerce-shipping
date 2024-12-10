import { Rate } from './rate';

/**
 * Represents a rate with its addon-less variant.
 *
 * E.g. if the `rate` key is a rate that requires a signature,
 * `parent` will be its counterpart that doesn't require a signature.
 */
export interface RateWithParent {
    rate: Rate;
    parent: Rate | null;
}
