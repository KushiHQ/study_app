import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useMemo } from 'react';
import { Platform, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as Urql } from 'urql';
import * as Sentry from '@sentry/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useFonts } from 'expo-font';
import { Unbounded_500Medium, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold, InterTight_700Bold } from '@expo-google-fonts/inter-tight';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { Nunito_400Regular, Nunito_400Regular_Italic, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { Fraunces_400Regular_Italic, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { client } from '../lib/api/client';
import { useSession } from '../lib/session';
import { needsStudySetup } from '../lib/onboarding';
import { ThemeProvider, useTheme } from '../lib/theme';
import '../lib/progress';
import { startServices } from '../lib/services';
import { FocusSession } from '../components/FocusControls';

const SENTRY_DSN =
	process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ||
	'https://545261c96306f566e50b5c22320d3651@o4511420856860672.ingest.us.sentry.io/4512491404591104';

if (SENTRY_DSN) {
	Sentry.init({
		dsn: SENTRY_DSN,
		tracesSampleRate: 0.1,
		enableNative: Platform.OS !== 'web',
		sendDefaultPii: false
	});
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
		<GestureHandlerRootView style={{ flex: 1, backgroundColor: '#080D1C' }}>
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
	const reduceMotion = useReducedMotion();
	const activityAnimation = reduceMotion ? 'none' : 'slide_from_bottom';
	const status = useSession((s) => s.status);
	const user = useSession((s) => s.user);
	const segments = useSegments();
	const inAuth = segments[0] === '(auth)';
	const router = useRouter();

	useEffect(() => {
		SystemUI.setBackgroundColorAsync(t.bg).catch(() => {});
	}, [t.bg]);

	useEffect(() => {
		Sentry.setUser(user ? { id: user.id } : null);
	}, [user]);

	useEffect(() => {
		if (status === 'signedOut' && !inAuth) router.replace('/(auth)/welcome');
		else if (status === 'signedIn' && inAuth) router.replace(user && needsStudySetup(user) ? '/onboarding' : '/');
	}, [status, inAuth, router, user]);

	const navTheme = useMemo(() => {
		const base = t.name === 'night' ? DarkTheme : DefaultTheme;
		return {
			...base,
			colors: {
				...base.colors,
				primary: t.amber,
				background: t.bg,
				card: t.bg,
				text: t.fg,
				border: t.line,
				notification: t.amber
			}
		};
	}, [t.name, t.amber, t.bg, t.fg, t.line]);

	return (
		<NavThemeProvider value={navTheme}>
			<View style={{ flex: 1, backgroundColor: t.bg }}>
				<StatusBar style={t.statusBar} />
				{status === 'signedIn' ? <FocusSession /> : null}
				<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: reduceMotion ? 'none' : 'fade', animationDuration: 180 }}>
					<Stack.Screen name="(tabs)" />
					<Stack.Screen name="(auth)" />
					<Stack.Screen name="onboarding" />
					<Stack.Screen name="c/[slug]/index" />
					<Stack.Screen name="c/[slug]/l/[lessonId]" />
					<Stack.Screen name="c/[slug]/quiz/[quizId]" options={{ animation: activityAnimation, gestureEnabled: false }} />
					<Stack.Screen name="c/[slug]/cards" options={{ animation: activityAnimation }} />
					<Stack.Screen name="c/[slug]/practice" options={{ animation: activityAnimation }} />
					<Stack.Screen name="plan" options={{ presentation: 'modal' }} />
				</Stack>
			</View>
		</NavThemeProvider>
	);
}

export default SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;
