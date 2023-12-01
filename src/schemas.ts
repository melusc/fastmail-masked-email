import {z} from 'zod';

export const sessionResponseSchema = z.object({
	state: z.string(),
	apiUrl: z.string(),
	capabilities: z.object({
		'urn:ietf:params:jmap:core': z.object({
			maxConcurrentUpload: z.number(),
			maxConcurrentRequests: z.number(),
			maxSizeRequest: z.number(),
			maxObjectsInGet: z.number(),
			maxCallsInRequest: z.number(),
			maxSizeUpload: z.number(),
			maxObjectsInSet: z.number(),
			collationAlgorithms: z.array(z.string()),
		}),
		'https://www.fastmail.com/dev/maskedemail': z.record(z.unknown()),
	}),
	accounts: z.record(
		z.object({
			name: z.string(),
			isPersonal: z.boolean(),
			accountCapabilities: z.object({
				'urn:ietf:params:jmap:core': z.record(z.unknown()),
				'https://www.fastmail.com/dev/maskedemail': z.record(z.unknown()),
			}),
			isReadOnly: z.boolean(),
		}),
	),
	eventSourceUrl: z.string(),
	downloadUrl: z.string(),
	uploadUrl: z.string(),
	username: z.string(),
	primaryAccounts: z.record(z.string()),
});

export type Session = {
	apiToken: string;
	apiUrl: string;
	accountId: string;
	capabilities: string[];
};

export const maskedEmailStateSchema = z.enum([
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

export const optionsSchema = z
	.strictObject({
		/** The description to set fpr the masked email */
		description: z.string().optional(),
		/** The domain to be associated with the masked email */
		forDomain: z.string().optional(),
		/**
		 * The state to set for the masked email
		 * @defaultValue 'enabled'
		 * @see {@link MaskedEmailState} for valid values
		 * */
		state: maskedEmailStateSchema.default('enabled'),
	})
	.refine(options => Object.keys(options).length > 0, {
		message:
			'options must contain at least one of `description`, `forDomain`, `state`',
	});

export type Options = z.input<typeof optionsSchema>;

export const createOptionsSchema = optionsSchema.and(
	z.object({
		/** If supplied, the server-assigned email will start with the given prefix. */
		emailPrefix: z.string().optional(),
	}),
);

export type CreateOptions = z.input<typeof createOptionsSchema>;
