import {env} from 'node:process';

import {API_HOSTNAME, JMAP} from './constants.js';
import {httpRequest} from './http.js';
import {sessionResponseSchema, type Session} from './schemas.js';

const sessionCache = new Map<string, Map<string, Session>>();

export async function getSession(
	apiToken?: string,
	hostname?: string,
): Promise<Session> {
	hostname = hostname ?? env['JMAP_HOSTNAME'] ?? API_HOSTNAME;

	apiToken = apiToken ?? env['JMAP_TOKEN'];

	if (!apiToken) {
		throw new Error(
			'No api token provided and JMAP_TOKEN environment variable is not set. Please provide a token.',
		);
	}

	const cached = sessionCache.get(apiToken)?.get(hostname);

	if (cached) {
		return cached;
	}

	const authUrl = `https://${hostname}/jmap/session`;
	const headers = {
		Authorization: `Bearer ${apiToken}`,
	};

	const result = await httpRequest({
		url: authUrl,
		headers,
		schema: sessionResponseSchema,
		action: 'getSession',
	});

	const accountId = result.primaryAccounts[JMAP.CORE]!;
	const {apiUrl} = result;
	const session = {
		accountId,
		apiUrl,
		apiToken,
		capabilities: Object.keys(result.capabilities),
	};

	if (!sessionCache.has(apiToken)) {
		sessionCache.set(apiToken, new Map());
	}

	sessionCache.get(apiToken)!.set(hostname, session);
	return session;
}

export type {Session} from './schemas.js';
