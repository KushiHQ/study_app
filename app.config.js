/**
 * Kushi Study app. Same Expo account, Apple team and Play account as Kushi Housing.
 * Env (EAS secrets / .env): EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
 * EXPO_PUBLIC_RC_IOS_KEY, EXPO_PUBLIC_RC_ANDROID_KEY,
 * EXPO_PUBLIC_SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN, EAS_PROJECT_ID.
 *
 * @param {import('expo/config').ConfigContext} context
 * @returns {import('expo/config').ExpoConfig}
 */
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ||
	'1052447000642-e8m3c6iidcivocoiv11f5e9bbb1csldr.apps.googleusercontent.com';

export default ({ config }) => ({
	...config,
	name: 'Kushi Study',
	slug: 'kushi-study',
	version: '1.1.1',
	orientation: 'portrait',
	icon: './assets/icon.png',
	scheme: 'kushistudy',
	userInterfaceStyle: 'automatic',
	jsEngine: 'hermes',
	newArchEnabled: true,
	ios: {
		bundleIdentifier: 'ng.kushi.study',
		supportsTablet: true,
		usesAppleSignIn: true,
		infoPlist: {
			ITSAppUsesNonExemptEncryption: false,
			// Focus music keeps playing with the screen off.
			UIBackgroundModes: ['audio', 'remote-notification']
		}
	},
	android: {
		package: 'ng.kushi.study',
		adaptiveIcon: {
			foregroundImage: './assets/adaptive-icon.png',
			backgroundColor: '#080D1C'
		},
		edgeToEdgeEnabled: true,
		predictiveBackGestureEnabled: false,
		permissions: ['android.permission.POST_NOTIFICATIONS', 'android.permission.VIBRATE', 'com.android.vending.BILLING'],
		blockedPermissions: ['android.permission.RECORD_AUDIO']
	},
	web: {
		bundler: 'metro',
		output: 'single',
		favicon: './assets/favicon.png'
	},
	extra: {
		router: { origin: false },
		googleIosClientId,
		eas: { projectId: process.env.EAS_PROJECT_ID || '30354dfd-3e13-4e11-85ff-1ad8b778e531' }
	},
	owner: 'kushi-digital-innovations-ltd',
	plugins: [
		'./plugins/with-android-device-compatibility.cjs',
		'expo-router',
		'expo-font',
		'expo-sqlite',
		'expo-secure-store',
		'expo-video',
		['expo-audio', { microphonePermission: false }],
		'expo-web-browser',
		'expo-apple-authentication',
		[
			'expo-notifications',
			{
				color: '#F59E0B'
			}
		],
		[
			'@react-native-google-signin/google-signin',
			{ iosUrlScheme: googleIosClientId.split('.').reverse().join('.') }
		],
		[
			'expo-splash-screen',
			{
				image: './assets/splash-icon.png',
				imageWidth: 220,
				resizeMode: 'contain',
				backgroundColor: '#04050C',
				dark: { image: './assets/splash-icon.png', backgroundColor: '#04050C' }
			}
		],
		[
			'expo-build-properties',
			{
				android: { minSdkVersion: 26, enableMinifyInReleaseBuilds: true },
				ios: { deploymentTarget: '15.5' }
			}
		],
		[
			'@sentry/react-native/expo',
			{
				organization: process.env.SENTRY_ORG || 'kushi-digital-innovation-ltd',
				project: process.env.SENTRY_PROJECT || 'kushi-study'
			}
		]
	],
	experiments: {
		typedRoutes: false,
		reactCompiler: false
	}
});
