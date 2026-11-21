import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Layers, Mail, SquareCheck } from 'lucide-react-native';
import { appleAvailable, googleAvailable, signInWithApple, signInWithGoogle } from '../../lib/auth';
import { errorText } from '../../lib/api/client';
import { fonts, radius, useTheme } from '../../lib/theme';
import { Button, ErrorBox, Press, Screen, T, hair } from '../../components/ui';
import { GoogleG } from '../../components/GoogleG';

const FEATURES = [
	{ Icon: BookOpen, label: 'Read one idea at a time' },
	{ Icon: SquareCheck, label: 'Answer a question from memory' },
	{ Icon: Layers, label: 'Review what you missed' }
];

export default function Welcome() {
	const t = useTheme();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
	const [error, setError] = useState('');
	const [apple, setApple] = useState(false);
	useEffect(() => { void appleAvailable().then(setApple); }, []);

	const run = async (which: 'google' | 'apple') => {
		if (busy) return;
		setError('');
		setBusy(which);
		try {
			await (which === 'google' ? signInWithGoogle() : signInWithApple());
		} catch (e) {
			setError(errorText(e) || 'Sign-in did not complete. Try again or continue with email.');
		} finally {
			setBusy(null);
		}
	};

	return (
		<Screen contentContainerStyle={{ flexGrow: 1, maxWidth: 520, width: '100%', alignSelf: 'center', paddingHorizontal: 24, paddingBottom: insets.bottom + 24, gap: 24 }}>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 10 }}>
				<View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: t.amber, transform: [{ rotate: '45deg' }] }} />
				<T v="bodyStrong" style={{ fontFamily: fonts.display }}>Kushi Study</T>
			</View>
			<View style={{ flex: 1, justifyContent: 'center', paddingVertical: 20, gap: 20 }}>
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
					<T v="display" accessibilityRole="header" style={{ flex: 1 }}>Get ready for your next exam.</T>
					<Image source={require('../../assets/ollie/hello.webp')} style={{ width: 94, height: 100 }} contentFit="contain" autoplay={false} accessible={false} />
				</View>
				<T>Practise recalling what you’ve read so you can use it on exam day.</T>
				<View style={{ backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2, borderRadius: radius.md, paddingHorizontal: 16 }}>
					{FEATURES.map(({ Icon, label }, i) => (
						<View key={label} style={{ minHeight: 51, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: i ? hair : 0, borderColor: t.line }}>
							<Icon size={18} color={t.accent} />
							<T v="bodyStrong" style={{ flex: 1 }}>{label}</T>
						</View>
					))}
				</View>
			</View>
			<View style={{ gap: 10 }}>
				{error ? <ErrorBox message={error} /> : null}
				{googleAvailable ? (
					<Press onPress={() => void run('google')} disabled={!!busy} accessibilityRole="button" accessibilityState={{ busy: busy === 'google' }}
						style={{ minHeight: 52, borderRadius: radius.sm, backgroundColor: t.surface2, borderWidth: hair, borderColor: t.line2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
						<GoogleG size={20} />
						<T v="bodyStrong">{busy === 'google' ? 'Signing in…' : 'Continue with Google'}</T>
					</Press>
				) : null}
				{apple ? (
					<AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
						buttonStyle={t.name === 'night' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
						cornerRadius={radius.sm} style={{ height: 52 }} onPress={() => void run('apple')} />
				) : null}
				<Button kind={googleAvailable || apple ? 'ghost' : 'primary'} title="Continue with email" disabled={!!busy}
					icon={<Mail size={18} color={googleAvailable || apple ? t.fg : t.onAmber} />} onPress={() => router.push('/(auth)/email')} />
				<T v="small" style={{ marginTop: 4 }}>By continuing you agree to the terms at study.kushi.ng.</T>
			</View>
		</Screen>
	);
}
