import {version} from 'node:process';

import {afterAll, expect, test} from 'vitest';

import {MaskedEmail, getSession} from '../src/index.ts';

// The static identifier ensures easy cleanup in case of test failures
// then it will clean up addresses from previous runs
// Adding a version number to avoid potential race conditions in GitHub CI.
// This is particularly relevant when a faster run, say node@20, tidies up
// email addresses from the node@18 run causing errors in that run.
const globalPrefix = `19e9c3096d-${version}`;

afterAll(async () => {
	const allEmails = await MaskedEmail.getAllEmails();

	for (const me of allEmails) {
		if (me.description.startsWith(globalPrefix)) {
			// eslint-disable-next-line no-await-in-loop
			await me.permanentlyDelete();
		}
	}
});

test(
	'MaskedEmail - creating and finding',
	async () => {
		const me1Date = new Date().toISOString();
		const me1 = await MaskedEmail.create({
			description: `${globalPrefix} ${me1Date}`,
		});

		expect(me1).toMatchObject({
			url: undefined,
			forDomain: '',
			description: `${globalPrefix} ${me1Date}`,
			state: 'enabled',
		});

		const me1ById = await MaskedEmail.findById(me1.id);
		const me1ByEmail = await MaskedEmail.findByEmail(me1.email);

		// @ts-expect-error MaskedEmail#details are normally private.
		expect(me1.details).toStrictEqual(me1ById.details);
		// @ts-expect-error MaskedEmail#details are normally private.
		expect(me1.details).toStrictEqual(me1ByEmail.details);

		await me1.permanentlyDelete();
		await expect(async () => {
			await me1.update({
				state: 'enabled',
			});
		}).rejects.toThrow();

		await expect(async () => {
			await MaskedEmail.findById(me1.id);
		}).rejects.toThrow();
		await expect(async () => {
			await MaskedEmail.findByEmail(me1.email);
		}).rejects.toThrow();
	},
	{
		timeout: 10e3,
	},
);

test('Creating with all undefined', async () => {
	const me = await MaskedEmail.create({
		description: globalPrefix,
		emailPrefix: undefined,
		forDomain: undefined,
		state: undefined,
	});

	await me.permanentlyDelete();
});

test('Creating with all set', async () => {
	const me = await MaskedEmail.create({
		description: globalPrefix,
		emailPrefix: 'abc',
		forDomain: 'domain',
		state: 'disabled',
	});

	expect(me.email).toMatch(/^abc/);
	expect(me.forDomain).toBe('domain');
	expect(me.state).toBe('disabled');

	await me.permanentlyDelete();
});

test(
	'MaskedEmail - updating',
	async () => {
		const descriptionBefore = `${globalPrefix} - before - ${new Date().toISOString()}`;
		const descriptionAfter = `${globalPrefix} - after - ${new Date().toISOString()}`;

		const me1 = await MaskedEmail.create({
			description: descriptionBefore,
			forDomain: 'www.google.com',
			state: 'enabled',
		});

		await me1.update({
			description: descriptionAfter,
		});

		const me2 = await MaskedEmail.findById(me1.id);
		// @ts-expect-error MaskedEmail#details are normally private.
		expect(me1.details).toStrictEqual(me2.details);
		expect(me2.description).toBe(descriptionAfter);

		await me1.disable();
		const me3 = await MaskedEmail.findById(me1.id);
		// @ts-expect-error MaskedEmail#details are normally private.
		expect(me1.details).toStrictEqual(me3.details);
		expect(me3.state).toBe('disabled');

		await me1.update({
			forDomain: 'www.github.com',
		});
		const me4 = await MaskedEmail.findById(me1.id);
		// @ts-expect-error MaskedEmail#details are normally private.
		expect(me1.details).toStrictEqual(me4.details);
		expect(me4.forDomain).toBe('www.github.com');

		await me1.enable();
		const me5 = await MaskedEmail.findById(me1.id);
		// @ts-expect-error MaskedEmail#details are normally private.
		expect(me1.details).toStrictEqual(me5.details);
		expect(me5.state).toBe('enabled');

		await me1.delete();
		const me6 = await MaskedEmail.findById(me1.id);
		// @ts-expect-error MaskedEmail#details are normally private.
		expect(me1.details).toStrictEqual(me6.details);
		expect(me6.state).toBe('deleted');
	},
	{
		timeout: 10e3,
	},
);

test('getSession cache', async () => {
	const session1 = await getSession();
	const session2 = await getSession();

	expect(session1).toBe(session2);
});
