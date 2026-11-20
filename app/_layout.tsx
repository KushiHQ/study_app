import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as Urql } from 'urql';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { Unbounded_500Medium, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold, InterTight_700Bold } from '@expo-google-fonts/inter-tight';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { Nunito_400Regular, Nunito_400Regular_Italic, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { Fraunces_400Regular_Italic, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { client } from '../lib/api/client';
import { useSession } from '../lib/session';
import { ThemeProvider, useTheme } from '../lib/theme';
import '../lib/progress';
import { startServices } from '../lib/services';

if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
	Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, tracesSampleRate: 0.1, enableNative: Platform.OS !== 'web' });
}

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayout() {
	const [loaded] = useFonts({
		Unbounded_500Medium,
		Unbounded_600SemiBold,
		InterTight_400Regular,
		InterTight_500Medium,
		InterTight_600SemiBold,
		InterTight_700Bold,
		JetBrainsMono_500Medium,
		Nunito_400Regular,
		Nunito_400Regular_Italic,
		Nunito_700Bold,
		Nunito_800ExtraBold,
		Fraunces_600SemiBold,
		Fraunces_400Regular_Italic
	});
	const status = useSession((s) => s.status);

	useEffect(() => {
		useSession.getState().restore();
		startServices();
	}, []);
	useEffect(() => {
		if (loaded && status !== 'loading') SplashScreen.hideAsync().catch(() => {});
	}, [loaded, status]);

	if (!loaded || status === 'loading') return null;
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<ThemeProvider>
					<Urql value={client}>
						<Shell />
					</Urql>
				</ThemeProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}

function Shell() {
	const t = useTheme();
	const status = useSession((s) => s.status);
	const user = useSession((s) => s.user);
	const segments = useSegments();
	const router = useRouter();

	useEffect(() => {
		SystemUI.setBackgroundColorAsync(t.bg).catch(() => {});
	}, [t.bg]);

	// Signed out → welcome; signed in without a department/level → onboarding.
	useEffect(() => {
		const inAuth = segments[0] === '(auth)';
		if (status === 'signedOut' && !inAuth) router.replace('/(auth)/welcome');
		else if (status === 'signedIn' && inAuth) router.replace(user && !user.department ? '/onboarding' : '/');
	}, [status, segments[0]]);

	return (
		<View style={{ flex: 1, backgroundColor: t.bg }}>
			<StatusBar style={t.statusBar} />
			<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: 'slide_from_right' }}>
				<Stack.Screen name="(tabs)" />
				<Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
				<Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
				<Stack.Screen name="c/[slug]/index" />
				<Stack.Screen name="c/[slug]/l/[lessonId]" options={{ animation: 'slide_from_bottom' }} />
				<Stack.Screen name="c/[slug]/quiz/[quizId]" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
				<Stack.Screen name="c/[slug]/cards" options={{ animation: 'slide_from_bottom' }} />
				<Stack.Screen name="c/[slug]/practice" options={{ animation: 'slide_from_bottom' }} />
				<Stack.Screen name="focus" options={{ animation: 'fade', presentation: 'fullScreenModal' }} />
				<Stack.Screen name="plan" options={{ presentation: 'modal' }} />
			</Stack>
		</View>
	);
}

export default process.env.EXPO_PUBLIC_SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;
