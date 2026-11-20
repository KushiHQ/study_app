// Things that follow the signed-in student: push token, store purchases.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { gql } from './api/client';
import { onSessionChange } from './session';
import { purchases } from './purchases';
import { prefs } from './storage';

const PUSH_KEY = 'ks.pushToken';
let started = false;

Notifications.setNotificationHandler({
	handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false })
});

export function startServices() {
	if (started) return;
	started = true;
	onSessionChange(async (u) => {
		if (u) {
			purchases.logIn(u.id);
			const perm = await Notifications.getPermissionsAsync().catch(() => null);
			if (perm?.granted) registerPush();
		} else {
			purchases.logOut();
		}
	});
}

/** Asks for notification permission (once, at a moment that makes sense) and registers the token. */
export async function askForNotifications(): Promise<boolean> {
	if (Platform.OS === 'web') return false;
	try {
		let p = await Notifications.getPermissionsAsync();
		if (!p.granted && p.canAskAgain) p = await Notifications.requestPermissionsAsync();
		if (p.granted) await registerPush();
		return p.granted;
	} catch {
		return false;
	}
}

async function registerPush() {
	if (Platform.OS === 'web' || !Device.isDevice) return;
	const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
	if (!projectId) return; // not an EAS build yet
	try {
		if (Platform.OS === 'android') {
			await Notifications.setNotificationChannelAsync('default', { name: 'Study reminders', importance: Notifications.AndroidImportance.DEFAULT });
		}
		const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
		await gql(`mutation Push($t: String!, $p: String!) { registerPushToken(token: $t, platform: $p) }`, { t: data, p: Platform.OS });
		prefs.set(PUSH_KEY, data);
	} catch {
		/* try again next start */
	}
}

/** Before signing out: stop pushes to this phone for that account. */
export async function unregisterPush() {
	const token = prefs.get(PUSH_KEY);
	if (!token) return;
	await gql(`mutation Unpush($t: String!) { unregisterPushToken(token: $t) }`, { t: token }).catch(() => {});
	prefs.set(PUSH_KEY, null);
}
