// Talks to the Kushi Study API (study_server, SPEC §6–7) directly with a Bearer
// access token. The refresh token lives in the Keychain/Keystore; access tokens
// last 15 minutes and are refreshed before they run out, or once after an
// UNAUTHENTICATED error. Concurrent requests share one refresh.
import { Client, cacheExchange, fetchExchange } from 'urql';
import { useSession } from '../session';
import type { User } from './types';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://study.api.kushi.ng/graphql';
export const WEB_URL = 'https://study.kushi.ng';

export class GqlError extends Error {
	code: string;
	constructor(message: string, code = 'INTERNAL') {
		super(message);
		this.code = code;
	}
}

const REFRESH = `mutation Refresh($t: String!) { refresh(refreshToken: $t) { accessToken refreshToken expiresIn user { id email name school isTeacher staffRole department { id slug name courseCount } level { code name } } } }`;

export interface AuthPayload {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
	user: User;
}

let refreshing: Promise<boolean> | null = null;

/** Gets a fresh access token with the saved refresh token. False = signed out. */
export function refreshSession(): Promise<boolean> {
	refreshing ??= (async () => {
		const s = useSession.getState();
		const token = await s.refreshToken();
		if (!token) return false;
		try {
			const res = await fetch(API_URL, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ query: REFRESH, variables: { t: token } })
			});
			const body = await res.json();
			const p: AuthPayload | undefined = body?.data?.refresh;
			if (p) {
				await s.signIn(p);
				return true;
			}
			const code = body?.errors?.[0]?.extensions?.code;
			// Revoked, expired or signed out on another device.
			if (code === 'UNAUTHENTICATED') await s.signOut(false);
			return false;
		} catch {
			// Offline: keep the session, try again later.
			return false;
		} finally {
			setTimeout(() => (refreshing = null), 0);
		}
	})();
	return refreshing;
}

async function headers(): Promise<Record<string, string>> {
	const s = useSession.getState();
	if (s.status !== 'signedIn') return {};
	if (!s.accessToken || Date.now() > s.expiresAt - 30_000) await refreshSession();
	const t = useSession.getState().accessToken;
	return t ? { authorization: `Bearer ${t}` } : {};
}

/** fetch() for urql and gql(): adds the token, refreshes once on UNAUTHENTICATED. */
export async function authedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	const go = async () => fetch(input, { ...init, headers: { ...(init?.headers as Record<string, string>), ...(await headers()) } });
	const res = await go();
	if (useSession.getState().status !== 'signedIn') return res;
	const copy = res.clone();
	try {
		const body = await copy.json();
		if (body?.errors?.some((e: { extensions?: { code?: string } }) => e.extensions?.code === 'UNAUTHENTICATED')) {
			if (await refreshSession()) return go();
		}
	} catch {
		/* not JSON */
	}
	return res;
}

export async function gql<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
	let res: Response;
	try {
		res = await authedFetch(API_URL, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ query, variables })
		});
	} catch {
		throw new GqlError("You're offline. We'll try again when you're back.", 'NETWORK');
	}
	let body: any;
	try {
		body = await res.json();
	} catch {
		throw new GqlError('We could not reach Kushi Study right now.', res.status >= 500 ? 'NETWORK' : 'INTERNAL');
	}
	if (body.errors?.length) throw new GqlError(body.errors[0].message, body.errors[0].extensions?.code);
	return body.data as T;
}

export const client = new Client({
	url: API_URL,
	exchanges: [cacheExchange, fetchExchange],
	fetch: authedFetch as typeof fetch,
	requestPolicy: 'cache-and-network',
	preferGetMethod: false
});

/** Plain message from a urql/GqlError, without the "[GraphQL] " prefix. */
export function errorText(e: unknown): string {
	if (!e) return '';
	const anyE = e as { graphQLErrors?: { message: string }[]; networkError?: unknown; message?: string };
	if (anyE.graphQLErrors?.length) return anyE.graphQLErrors[0].message;
	if (anyE.networkError) return "You're offline. Pull down to try again.";
	return (anyE.message ?? String(e)).replace('[GraphQL] ', '');
}
export function errorCode(e: unknown): string | undefined {
	const anyE = e as { graphQLErrors?: { extensions?: { code?: string } }[]; code?: string };
	return anyE?.graphQLErrors?.[0]?.extensions?.code ?? anyE?.code;
}
