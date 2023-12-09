import type {z} from 'zod';
import {
	array as zArray,
	boolean as zBoolean,
	enum as zEnum,
	number as zNumber,
	object as zObject,
	record as zRecord,
	strictObject as zStrictObject,
	string as zString,
	unknown as zUnknown,
} from 'zod';

export const sessionResponseSchema = zObject({
	state: zString(),
	apiUrl: zString(),
	capabilities: zObject({
		'urn:ietf:params:jmap:core': zObject({
			maxConcurrentUpload: zNumber(),
			maxConcurrentRequests: zNumber(),
			maxSizeRequest: zNumber(),
			maxObjectsInGet: zNumber(),
			maxCallsInRequest: zNumber(),
			maxSizeUpload: zNumber(),
			maxObjectsInSet: zNumber(),
			collationAlgorithms: zArray(zString()),
		}),
		'https://www.fastmail.com/dev/maskedemail': zRecord(zUnknown()),
	}),
	accounts: zRecord(
		zObject({
			name: zString(),
			isPersonal: zBoolean(),
			accountCapabilities: zObject({
				'urn:ietf:params:jmap:core': zRecord(zUnknown()),
				'https://www.fastmail.com/dev/maskedemail': zRecord(zUnknown()),
			}),
			isReadOnly: zBoolean(),
		}),
	),
	eventSourceUrl: zString(),
	downloadUrl: zString(),
	uploadUrl: zString(),
	username: zString(),
	primaryAccounts: zRecord(zString()),
});

export type Session = {
	apiToken: string;
	apiUrl: string;
	accountId: string;
	capabilities: string[];
};

export const maskedEmailStateSchema = zEnum([
	'enabled',
	'disabled',
	'pending',
	'deleted',
]);

/**
 * Represents the state of a masked email address.
 *
 * The state of a masked email address can be one of the following:
 * - enabled
 *   - The address is active and receiving mail normally.
 * - disabled
 *   - The address is active, but mail is sent straight to trash.
 * - deleted
 *   - The address is inactive; any mail sent to the address is bounced.
 * - pending
 *   - The initial state. Once set to anything else, it cannot be set back to pending.
 *   - If a message is received by an address in the "pending" state, it will automatically be converted to "enabled".
 *   - Pending email addresses are automatically deleted 24h after creation.

 * @see {@link https://www.fastmail.com/developer/maskedemail/}
 */
export type MaskedEmailState = z.infer<typeof maskedEmailStateSchema>;

export const optionsSchema = zStrictObject({
	/** The description to set fpr the masked email */
	description: zString().optional(),
	/** The domain to be associated with the masked email */
	forDomain: zString().optional(),
	/**
	 * The state to set for the masked email
	 * @defaultValue 'enabled'
	 * @see {@link MaskedEmailState} for valid values
	 * */
	state: maskedEmailStateSchema.default('enabled'),
}).refine(options => Object.keys(options).length > 0, {
	message:
		'options must contain at least one of `description`, `forDomain`, `state`',
});

export type Options = z.input<typeof optionsSchema>;

export const createOptionsSchema = optionsSchema.and(
	zObject({
		/** If supplied, the server-assigned email will start with the given prefix. */
		emailPrefix: zString().optional(),
	}),
);

export type CreateOptions = z.input<typeof createOptionsSchema>;
