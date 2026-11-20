// Welcome: Ollie says hello; continue with Google, Apple (iPhone) or an email code.
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail } from 'lucide-react-native';
import { appleAvailable, signInWithApple, signInWithGoogle } from '../../lib/auth';
import { errorText } from '../../lib/api/client';
import { fonts, radius, useTheme } from '../../lib/theme';
import { Button, ErrorBox, Press, T, hair } from '../../components/ui';
import { GoogleG } from '../../components/GoogleG';

export default function Welcome() {
	const t = useTheme();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
	const [error, setError] = useState('');
	const [apple, setApple] = useState(false);
	const bob = useSharedValue(0);

	useEffect(() => {
		appleAvailable().then(setApple);
		bob.value = withRepeat(withSequence(withTiming(-8, { duration: 1600, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.quad) })), -1);
	}, []);
	const float = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));

	const run = async (which: 'google' | 'apple') => {
		setError('');
		setBusy(which);
		try {
			await (which === 'google' ? signInWithGoogle() : signInWithApple());
		} catch (e) {
			setError(errorText(e) || 'That sign-in did not complete. Try again or use an email code.');
		} finally {
			setBusy(null);
		}
	};

	return (
		<View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, paddingHorizontal: 22 }}>
			<Animated.View entering={FadeInDown.duration(600)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
				<View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: t.amber, transform: [{ rotate: '45deg' }] }} />
				<Text style={{ fontFamily: fonts.display, fontSize: 16, color: t.fg, letterSpacing: -0.4 }}>Kushi Study</Text>
			</Animated.View>
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
				<Animated.View style={float}>
					<Image source={require('../../assets/ollie/hello.webp')} style={{ width: 220, height: 220 }} contentFit="contain" autoplay />
				</Animated.View>
				<Animated.View entering={FadeInUp.delay(150).duration(600)} style={{ alignItems: 'center', gap: 10, marginTop: 8 }}>
					<T v="display" style={{ textAlign: 'center' }}>
						Study smarter{'\n'}for your exams.
					</T>
					<T v="body" style={{ textAlign: 'center', maxWidth: 320 }}>
						Clear lessons, quick checks and flashcards for your university courses. Two weeks free.
					</T>
				</Animated.View>
			</View>
			<Animated.View entering={FadeInUp.delay(300).duration(600)} style={{ gap: 12 }}>
				{error ? <ErrorBox message={error} /> : null}
				<Press
					haptic
					onPress={() => run('google')}
					disabled={!!busy}
					accessibilityRole="button"
					accessibilityLabel="Continue with Google"
					style={{ height: 52, borderRadius: radius.pill, backgroundColor: t.surface2, borderWidth: hair, borderColor: t.line2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
				>
					<View style={{ position: 'absolute', left: 7, width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: busy === 'google' ? 2 : 0, borderColor: t.amber }}>
						<GoogleG size={20} />
					</View>
					<Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: t.fg }}>{busy === 'google' ? 'Signing in…' : 'Continue with Google'}</Text>
				</Press>
				{apple ? (
					<AppleAuthentication.AppleAuthenticationButton
						buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
						buttonStyle={t.name === 'night' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
						cornerRadius={26}
						style={{ height: 52 }}
						onPress={() => run('apple')}
					/>
				) : null}
				<Button kind="ghost" title="Continue with email" icon={<Mail size={18} color={t.fg} />} onPress={() => router.push('/(auth)/email')} />
				<T v="small" style={{ textAlign: 'center', marginTop: 4 }}>
					By continuing you agree to the terms at study.kushi.ng.
				</T>
			</Animated.View>
		</View>
	);
}
