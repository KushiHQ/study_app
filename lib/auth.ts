// Sign-in: email code, Google (native SDK id token) and Apple (iOS).
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { gql, type AuthPayload } from './api/client';
import { deviceLabel, useSession } from './session';

// The web client id: Google puts it in the id token's audience, so the server's
// existing STUDY_GOOGLE_CLIENT_IDS already accepts tokens from the app.
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '1052447000642-ur5g7kce7v8p4d26dv83vedrbne1jd36.apps.googleusercontent.com';

const IOS_CLIENT_ID: string | undefined = Constants.expoConfig?.extra?.googleIosClientId;

export const googleAvailable = Platform.OS === 'android' || (Platform.OS === 'ios' && Boolean(IOS_CLIENT_ID));

const USER = `id email name school isTeacher staffRole department { id slug name courseCount } level { code name }`;
const AUTH = `accessToken refreshToken expiresIn user { ${USER} }`;

let configured = false;
function configureGoogle() {
	if (configured || Platform.OS === 'web') return;
	GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, iosClientId: IOS_CLIENT_ID });
	configured = true;
}

export async function requestCode(email: string) {
	await gql(`mutation RequestCode($email: String!) { requestEmailCode(email: $email) }`, { email: email.trim() });
}

export async function verifyCode(email: string, code: string) {
	const d = await gql<{ verifyEmailCode: AuthPayload }>(
		`mutation VerifyCode($email: String!, $code: String!, $device: String) { verifyEmailCode(email: $email, code: $code, deviceLabel: $device) { ${AUTH} } }`,
		{ email: email.trim(), code: code.trim(), device: deviceLabel() }
	);
	await useSession.getState().signIn(d.verifyEmailCode);
}

/** Resolves false when the student cancels. */
export async function signInWithGoogle(): Promise<boolean> {
	if (!googleAvailable) throw new Error('Google sign-in is unavailable on this build. Use email or another sign-in option.');
	configureGoogle();
	try {
		if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
		const r = await GoogleSignin.signIn();
		if (r.type !== 'success' || !r.data.idToken) return false;
		const d = await gql<{ signInWithGoogle: AuthPayload }>(
			`mutation Google($token: String!, $device: String) { signInWithGoogle(idToken: $token, deviceLabel: $device) { ${AUTH} } }`,
			{ token: r.data.idToken, device: deviceLabel() }
		);
		await useSession.getState().signIn(d.signInWithGoogle);
		return true;
	} catch (e) {
		if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return false;
		if (isErrorWithCode(e) && e.code === 'DEVELOPER_ERROR') throw new Error("Google sign-in isn't ready in this build yet. Use an email code.");
		throw e;
	}
}

export async function appleAvailable(): Promise<boolean> {
	if (Platform.OS !== 'ios') return false;
	return AppleAuthentication.isAvailableAsync().catch(() => false);
}

export async function signInWithApple(): Promise<boolean> {
	try {
		const c = await AppleAuthentication.signInAsync({
			requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL]
		});
		if (!c.identityToken) return false;
		const fullName = c.fullName?.givenName ? `${c.fullName.givenName} ${c.fullName.familyName ?? ''}`.trim() : null;
		const d = await gql<{ signInWithApple: AuthPayload }>(
			`mutation Apple($token: String!, $name: String, $device: String) { signInWithApple(identityToken: $token, fullName: $name, deviceLabel: $device) { ${AUTH} } }`,
			{ token: c.identityToken, name: fullName, device: deviceLabel() }
		);
		await useSession.getState().signIn(d.signInWithApple);
		return true;
	} catch (e) {
		if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
		throw e;
	}
}

export async function signOutEverywhereHere() {
	if (Platform.OS !== 'web') await GoogleSignin.signOut().catch(() => {});
}
