/* eslint-disable no-lone-blocks */
import {expectType} from 'tsd';

import {MaskedEmail, getSession, type Session} from '../src/index.ts';

// I cannot get tsd to work,
// so opening this file in VSCode and seeing any errors there has to be enough

expectType<Session>(await getSession());
expectType<Session>(await getSession('apiToken'));
expectType<Session>(await getSession('apiToken', 'domain'));
expectType<Session>(await getSession(undefined, 'domain'));

declare const session: Session;

{
	// MaskedEmail.create without `session`

	await MaskedEmail.create();
	await MaskedEmail.create({});
	await MaskedEmail.create({
		description: 'Description',
		forDomain: 'domain',
		state: 'enabled',
		emailPrefix: 'prefix',
	});
	await MaskedEmail.create({
		description: undefined,
		forDomain: undefined,
		state: undefined,
		emailPrefix: undefined,
	});
	await MaskedEmail.create({
		state: 'disabled',
	});
	await MaskedEmail.create({
		state: 'deleted',
	});
	await MaskedEmail.create({
		state: 'pending',
	});

	expectType<MaskedEmail>(await MaskedEmail.create());
}

{
	// MaskedEmail.create with `session`

	await MaskedEmail.create(session);
	await MaskedEmail.create({}, session);
	await MaskedEmail.create({description: 'Abc'}, session);
}

{
	// MaskedEmail.findByEmail

	expectType<MaskedEmail>(await MaskedEmail.findByEmail('a@fastmail.com'));
	expectType<MaskedEmail>(
		await MaskedEmail.findByEmail('a@fastmail.com', session),
	);
}

{
	// MaskedEmail.findById

	expectType<MaskedEmail>(await MaskedEmail.findById('id'));
	expectType<MaskedEmail>(await MaskedEmail.findById('id', session));
}

{
	// MaskedEmail.getAllEmails

	expectType<MaskedEmail[]>(await MaskedEmail.getAllEmails());
	expectType<MaskedEmail[]>(await MaskedEmail.getAllEmails(['id']));
	expectType<MaskedEmail[]>(await MaskedEmail.getAllEmails(['id'], session));
	expectType<MaskedEmail[]>(await MaskedEmail.getAllEmails(undefined, session));
	expectType<MaskedEmail[]>(await MaskedEmail.getAllEmails(session));
}

{
	// MaskedEmail properties

	const me = await MaskedEmail.create();

	expectType<Date>(me.createdAt);
	expectType<string>(me.createdBy);
	expectType<string>(me.description);
	expectType<string>(me.email);
	expectType<string>(me.forDomain);
	expectType<string>(me.id);
	expectType<Date | undefined>(me.lastMessageAt);
	expectType<'enabled' | 'disabled' | 'deleted' | 'pending'>(me.state);
	expectType<string | undefined>(me.url);
}

{
	// MaskedEmail methods

	const me = await MaskedEmail.create();

	expectType<MaskedEmail>(await me.delete());
	expectType<MaskedEmail>(await me.disable());
	expectType<MaskedEmail>(await me.enable());
	expectType<void>(await me.permanentlyDelete());

	expectType<MaskedEmail>(await me.update({}));
	expectType<MaskedEmail>(
		await me.update({
			description: 'ABC',
			forDomain: 'domain',
			state: 'enabled',
		}),
	);
	expectType<MaskedEmail>(
		await me.update({
			description: undefined,
			forDomain: undefined,
			state: undefined,
		}),
	);
}
