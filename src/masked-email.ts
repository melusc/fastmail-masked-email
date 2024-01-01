import type {z} from 'zod';
import {
	array as zArray,
	null as zNull,
	object as zObject,
	record as zRecord,
	string as zString,
	unknown as zUnknown,
} from 'zod';

import {MASKED_EMAIL_CALLS} from './constants.js';
import {apiRequest} from './http.js';
import {
	createOptionsSchema,
	maskedEmailStateSchema,
	optionsSchema,
	type CreateOptions,
	type MaskedEmailState,
	type Options,
	type Session,
} from './schemas.js';
import {getSession} from './session.js';

const maskedEmailReducedDetailsSchema = zObject({
	createdBy: zString(),
	createdAt: zString(),
	id: zString(),
	url: zString().or(zNull().transform(() => undefined)),
	lastMessageAt: zString().or(zNull().transform(() => undefined)),
	email: zString().regex(/^[^@]+@[^@]+\.[^@]+$/),
});
const maskedEmailDetailsSchema = maskedEmailReducedDetailsSchema.and(
	zObject({
		forDomain: zString(),
		description: zString(),
		state: maskedEmailStateSchema,
	}),
);

type MaskedEmailDetails = z.infer<typeof maskedEmailDetailsSchema>;

export class MaskedEmail {
	static create(
		options?: CreateOptions,
		session?: Session,
	): Promise<MaskedEmail>;
	static create(session: Session): Promise<MaskedEmail>;
	static async create(
		options_: CreateOptions | Session = {},
		session_?: Session,
	): Promise<MaskedEmail> {
		let options: z.output<typeof createOptionsSchema>;
		let session: Session;

		if ('apiToken' in options_) {
			session = options_;
			options = createOptionsSchema.parse(options_);
		} else {
			options = createOptionsSchema.parse(options_);
			session = session_ ?? (await getSession());
		}

		const {accountId} = session;
		const requestId = Math.random().toString(36).slice(2);

		const details = await apiRequest({
			session,
			method: MASKED_EMAIL_CALLS.set,
			body: {
				accountId,
				create: {
					[requestId]: options,
				},
			},
			schema: zObject({
				created: zObject({
					[requestId]: maskedEmailReducedDetailsSchema,
				}),
			}).transform(o => ({
				...o.created[requestId]!,
				forDomain: options.forDomain ?? '',
				description: options.description ?? '',
				state: options.state,
			})),
			action: 'MaskedEmail.create',
		});

		return new MaskedEmail(details, session);
	}

	static async findById(id: string, session?: Session): Promise<MaskedEmail> {
		const emails = await this.getAllEmails([id], session);
		if (emails.length === 0) {
			throw new Error(`Email with id "${id}" was not found`);
		}

		return emails[0]!;
	}

	static async findByEmail(
		emailAddress: string,
		session?: Session,
	): Promise<MaskedEmail> {
		const allEmails = await this.getAllEmails(undefined, session);

		for (const me of allEmails) {
			if (me.email === emailAddress) {
				return me;
			}
		}

		throw new Error(`No masked email found using address "${emailAddress}".`);
	}

	static getAllEmails(session: Session): Promise<MaskedEmail[]>;
	static getAllEmails(
		ids?: string[],
		session?: Session,
	): Promise<MaskedEmail[]>;
	static async getAllEmails(
		ids?: string[] | Session,
		session_?: Session,
	): Promise<MaskedEmail[]> {
		let session: Session;

		if (ids && 'apiToken' in ids) {
			session = ids;
			ids = undefined;
		}

		session ??= session_ ?? (await getSession());

		if (ids?.length === 0) {
			ids = undefined;
		}

		const {accountId} = session;

		return apiRequest({
			session,
			method: MASKED_EMAIL_CALLS.get,
			body: {accountId, ids},
			schema: zObject({
				accountId: zString(),
				list: zArray(maskedEmailDetailsSchema),
			}).transform(o =>
				o.list.map(details => new MaskedEmail(details, session)),
			),
			action: 'MaskedEmail.getAllEmails',
		});
	}

	private constructor(
		private readonly details: MaskedEmailDetails,
		private readonly session: Session,
	) {}

	get email(): string {
		return this.details.email;
	}

	get id(): string {
		return this.details.id;
	}

	get createdAt(): Date {
		return new Date(this.details.createdAt);
	}

	get createdBy(): string {
		return this.details.createdBy;
	}

	get lastMessageAt(): Date | undefined {
		return this.details.lastMessageAt
			? new Date(this.details.lastMessageAt)
			: undefined;
	}

	get url(): string | undefined {
		return this.details.url;
	}

	get forDomain(): string {
		return this.details.forDomain ?? '';
	}

	get description(): string {
		return this.details.description;
	}

	get state(): MaskedEmailState {
		return this.details.state;
	}

	async update(options: Options): Promise<this> {
		options = optionsSchema.parse(options);

		const {accountId} = this.session;

		const response = await apiRequest({
			session: this.session,
			method: MASKED_EMAIL_CALLS.set,
			body: {
				accountId,
				update: {
					[this.id]: options,
				},
			},
			schema: zObject({
				updated: zUnknown(),
				notUpdated: zRecord(
					zObject({
						description: zString(),
						type: zString(),
					}),
				).optional(),
			}),
			action: 'MaskedEmail.update',
		});

		if (response.notUpdated && this.id in response.notUpdated) {
			const {type} = response.notUpdated[this.id]!;
			throw new Error('Could not update ' + this.id + ' (' + type + ').');
		}

		this.details.forDomain = options.forDomain ?? this.details.forDomain;
		this.details.description = options.description ?? this.details.description;
		this.details.state = options.state ?? this.details.state;

		return this;
	}

	async delete(): Promise<this> {
		return this.update({
			state: 'deleted',
		});
	}

	async disable(): Promise<this> {
		return this.update({
			state: 'disabled',
		});
	}

	async enable(): Promise<this> {
		return this.update({
			state: 'enabled',
		});
	}

	async permanentlyDelete(): Promise<void> {
		const {accountId} = this.session;

		const response = await apiRequest({
			session: this.session,
			method: MASKED_EMAIL_CALLS.set,
			body: {
				accountId,
				destroy: [this.id],
			},
			action: 'MaskedEmail#permanentlyDelete',
			schema: zObject({
				destroyed: zArray(zString()),
				notDestroyed: zRecord(
					zObject({
						type: zString(),
						description: zString(),
						subType: zString(),
					}),
				).optional(),
			}),
		});

		if (response.notDestroyed) {
			const reason = response.notDestroyed[this.id]!;
			throw new Error(
				`${reason.type}(${reason.subType}): ${reason.description}`,
			);
		}
	}
}
