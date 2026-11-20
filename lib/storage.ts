// Small saved values. Secrets (the refresh token) go to the Keychain / Keystore
// through expo-secure-store; everything else to expo-sqlite's synchronous
// key-value store, which is instant to read at start-up. On web (dev previews)
// both fall back to localStorage.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';

const web = Platform.OS === 'web';

export const secure = {
	async get(key: string): Promise<string | null> {
		if (web) return safe(() => localStorage.getItem(key));
		try {
			return await SecureStore.getItemAsync(key);
		} catch {
			return null;
		}
	},
	async set(key: string, value: string | null) {
		if (web) return void safe(() => (value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value)));
		try {
			if (value == null) await SecureStore.deleteItemAsync(key);
			else await SecureStore.setItemAsync(key, value);
		} catch {
			/* not remembered; the session still works until the app closes */
		}
	}
};

export const prefs = {
	get(key: string): string | null {
		if (web) return safe(() => localStorage.getItem(key));
		try {
			return Storage.getItemSync(key);
		} catch {
			return null;
		}
	},
	set(key: string, value: string | null) {
		if (web) return void safe(() => (value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value)));
		try {
			if (value == null) Storage.removeItemSync(key);
			else Storage.setItemSync(key, value);
		} catch {
			/* ignore */
		}
	},
	getJSON<T>(key: string): T | null {
		const v = prefs.get(key);
		if (!v) return null;
		try {
			return JSON.parse(v) as T;
		} catch {
			return null;
		}
	},
	setJSON(key: string, value: unknown) {
		prefs.set(key, value == null ? null : JSON.stringify(value));
	}
};

function safe<T>(f: () => T): T | null {
	try {
		return f();
	} catch {
		return null;
	}
}
