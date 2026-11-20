// Who is signed in. The refresh token is kept in secure storage; the user and
// the short-lived access token in memory (the user is also cached so the app
// opens straight to Today while offline).
import { create } from 'zustand';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { prefs, secure } from './storage';
import type { User } from './api/types';
import type { AuthPayload } from './api/client';

const RT = 'ks.refresh';
const USER = 'ks.user';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface SessionState {
	status: Status;
	user: User | null;
	accessToken: string | null;
	expiresAt: number;
	restore(): Promise<void>;
	signIn(p: AuthPayload): Promise<void>;
	setUser(u: User): void;
	/** remote=true also tells the server (Account → Sign out). */
	signOut(remote?: boolean): Promise<void>;
	refreshToken(): Promise<string | null>;
}

const listeners = new Set<(u: User | null) => void>();
/** Called on sign-in and sign-out (progress queue, push token, purchases). */
export function onSessionChange(f: (u: User | null) => void) {
	listeners.add(f);
	return () => listeners.delete(f);
}

export const useSession = create<SessionState>((set, get) => ({
	status: 'loading',
	user: null,
	accessToken: null,
	expiresAt: 0,
	async restore() {
		const token = await secure.get(RT);
		const user = prefs.getJSON<User>(USER);
		if (token && user) {
			set({ status: 'signedIn', user });
			listeners.forEach((f) => f(user));
		} else set({ status: 'signedOut', user: null });
	},
	async signIn(p) {
		const was = get().user?.id;
		await secure.set(RT, p.refreshToken);
		prefs.setJSON(USER, p.user);
		set({ status: 'signedIn', user: p.user, accessToken: p.accessToken, expiresAt: Date.now() + p.expiresIn * 1000 });
		if (was !== p.user.id) listeners.forEach((f) => f(p.user));
	},
	setUser(u) {
		prefs.setJSON(USER, u);
		set({ user: u });
	},
	async signOut(remote = true) {
		if (remote && get().status === 'signedIn') {
			const { gql } = await import('./api/client');
			await gql(`mutation SignOut { signOut }`).catch(() => {});
		}
		await secure.set(RT, null);
		prefs.set(USER, null);
		set({ status: 'signedOut', user: null, accessToken: null, expiresAt: 0 });
		listeners.forEach((f) => f(null));
	},
	refreshToken: () => secure.get(RT)
}));

/** Shown on Account → Devices: "Kushi Study app · Pixel 8". */
export function deviceLabel(): string {
	const model = Device.modelName ?? (Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android phone' : 'browser');
	return `Kushi Study app · ${model}`.slice(0, 80);
}
