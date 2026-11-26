import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { appleAvailable, googleAvailable, signInWithApple, signInWithGoogle } from '../../lib/auth';
import { errorText } from '../../lib/api/client';
import { fonts, useTheme } from '../../lib/theme';
import { Button, ErrorBox, Press, T } from '../../components/ui';
import { GoogleG } from '../../components/GoogleG';
import { KushiStudyLockup } from '../../components/KushiBrand';

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

	const canvas = '#0A0F1E';

	return (
		<View style={{ flex: 1, backgroundColor: canvas }}>
			{/* Full-bleed Lo-Fi Ollie editorial artwork */}
			<Image
				source={require('../../assets/ollie/welcome-hero.jpg')}
				style={StyleSheet.absoluteFill}
				contentFit="cover"
				contentPosition="top"
				accessible={false}
			/>

			{/* Subtle top & bottom gradient scrims for crisp legibility over the artwork */}
			<View pointerEvents="none" style={StyleSheet.absoluteFill}>
				<Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
					<Defs>
						<LinearGradient id="w-top-scrim" x1="0" y1="0" x2="0" y2="1">
							<Stop offset="0%" stopColor={canvas} stopOpacity="0.62" />
							<Stop offset="16%" stopColor={canvas} stopOpacity="0.18" />
							<Stop offset="28%" stopColor={canvas} stopOpacity="0" />
						</LinearGradient>
						<LinearGradient id="w-bot-scrim" x1="0" y1="0" x2="0" y2="1">
							<Stop offset="50%" stopColor={canvas} stopOpacity="0" />
							<Stop offset="66%" stopColor={canvas} stopOpacity="0.82" />
							<Stop offset="78%" stopColor={canvas} stopOpacity="0.98" />
							<Stop offset="100%" stopColor={canvas} stopOpacity="1" />
						</LinearGradient>
					</Defs>
					<Rect x="0" y="0" width="100" height="100" fill="url(#w-top-scrim)" />
					<Rect x="0" y="0" width="100" height="100" fill="url(#w-bot-scrim)" />
				</Svg>
			</View>

			<View
				style={{
					flex: 1,
					maxWidth: 520,
					width: '100%',
					alignSelf: 'center',
					paddingTop: insets.top + 14,
					paddingHorizontal: 24,
					paddingBottom: insets.bottom + 20,
					justifyContent: 'space-between'
				}}
			>
				{/* Official Kushi Study Brand Lockup at Top */}
				<View style={{ alignItems: 'center', justifyContent: 'center' }}>
					<KushiStudyLockup height={20} ink="#F8FAFC" accent={t.amber} divider="rgba(248, 250, 252, 0.28)" subColor="#E2E8F0" />
				</View>

				{/* Bottom Dock: Punchy Headline + Clean Sign-In Actions */}
				<View style={{ gap: 20 }}>
					<View style={{ alignItems: 'center', gap: 2 }}>
						<Text
							accessibilityRole="header"
							style={{
								fontFamily: fonts.display,
								fontSize: 32,
								lineHeight: 39,
								letterSpacing: -1,
								color: '#F8FAFC',
								textAlign: 'center',
								textShadowColor: 'rgba(10, 15, 30, 0.88)',
								textShadowOffset: { width: 0, height: 2 },
								textShadowRadius: 12
							}}
						>
							Study Made
						</Text>
						<Text
							style={{
								fontFamily: fonts.display,
								fontSize: 32,
								lineHeight: 39,
								letterSpacing: -1,
								color: t.amber,
								textAlign: 'center',
								textShadowColor: 'rgba(10, 15, 30, 0.88)',
								textShadowOffset: { width: 0, height: 2 },
								textShadowRadius: 12
							}}
						>
							Easy.
						</Text>
					</View>

					<View style={{ gap: 10 }}>
						{error ? <ErrorBox message={error} /> : null}
						{googleAvailable ? (
							<Press
								haptic
								onPress={() => void run('google')}
								disabled={!!busy}
								accessibilityRole="button"
								accessibilityState={{ busy: busy === 'google' }}
								style={{
									minHeight: 54,
									borderRadius: 16,
									backgroundColor: t.amber,
									flexDirection: 'row',
									alignItems: 'center',
									justifyContent: 'center',
									gap: 10,
									opacity: busy ? 0.65 : 1
								}}
							>
								<View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
									<GoogleG size={16} />
								</View>
								<Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: t.onAmber }}>
									{busy === 'google' ? 'Signing in…' : 'Continue with Google'}
								</Text>
							</Press>
						) : null}
						{apple ? (
							<AppleAuthentication.AppleAuthenticationButton
								buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
								buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
								cornerRadius={16}
								style={{ height: 54 }}
								onPress={() => void run('apple')}
							/>
						) : null}
						<Button
							kind={googleAvailable || apple ? 'solid' : 'primary'}
							title="Continue with email"
							disabled={!!busy}
							icon={<Mail size={18} color={googleAvailable || apple ? '#F8FAFC' : t.onAmber} />}
							onPress={() => router.push('/(auth)/email')}
							style={{
								borderRadius: 16,
								backgroundColor: googleAvailable || apple ? '#131C33' : t.amber,
								borderColor: googleAvailable || apple ? 'rgba(226, 232, 240, 0.14)' : 'transparent'
							}}
						/>
						<T v="small" style={{ marginTop: 2, textAlign: 'center', color: '#94A3B8' }}>
							Free to start · study.kushi.ng
						</T>
					</View>
				</View>
			</View>
		</View>
	);
}
