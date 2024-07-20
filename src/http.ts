/* eslint-disable n/no-unsupported-features/node-builtins */

import {
	array as zArray,
	literal as zLiteral,
	object as zObject,
	tuple as zTuple,
	type z,
} from 'zod';

import type {Session} from './schemas.js';

type HttpOptions<T extends z.ZodTypeAny> = {
	url: string;
	headers?: Record<string, string> | Headers;
	body?: unknown;
	schema: T;
	action: string;
};

const successStatusCodes: ReadonlySet<number> = new Set([200]);

export async function httpRequest<T extends z.ZodTypeAny>({
	url,
	headers,
	schema,
	action,
	body,
}: HttpOptions<T>): Promise<z.infer<T>> {
	headers = new Headers(headers);
	const requestOptions: RequestInit = {
		headers,
	};

	if (body) {
		requestOptions.body = JSON.stringify(body);
		requestOptions.method = 'POST';
		headers.set('Content-Type', 'application/json');
	}

	const response = await fetch(url, requestOptions);

	if (!successStatusCodes.has(response.status)) {
		const body = await response.text();

		const errorMessage = `${action} failed with status code ${response.status}: ${response.statusText}. ${body}`;
		throw new Error(errorMessage);
	}

	return schema.promise().parseAsync(response.json());
}

type ApiRequestOptions<T extends z.ZodTypeAny> = {
	schema: T;
	action: string;
	session: Session;
	method: string;
	body: unknown;
};

export async function apiRequest<T extends z.ZodTypeAny>({
	session,
	method,
	body,
	schema,
	action,
}: ApiRequestOptions<T>): Promise<z.infer<T>> {
	const {apiUrl, apiToken} = session;

	const methodId = Math.random().toString(36).slice(2);

	const responseBody = await httpRequest({
		url: apiUrl,
		headers: new Headers({authorization: `Bearer ${apiToken}`}),
		schema: zObject({
			methodResponses: zArray(
				zTuple([zLiteral(method), schema, zLiteral(methodId)]),
			),
		}),
		action,
		body: {
			using: session.capabilities,
			methodCalls: [[method, body, methodId]],
		},
	});

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return responseBody.methodResponses[0]![1];
}
