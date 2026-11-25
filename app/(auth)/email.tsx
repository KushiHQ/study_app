// Email code sign-in: email → 6-digit code (10 minutes).
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestCode, verifyCode } from '../../lib/auth';
import { errorText } from '../../lib/api/client';
import { alpha, fonts, radius, useTheme } from '../../lib/theme';
import { Button, Eyebrow, T, TopGlow, hair } from '../../components/ui';
import { TopBar } from '../../components/TopBar';

export default function EmailSignIn() {
	const t = useTheme();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [email, setEmail] = useState('');
	const [code, setCode] = useState('');
	const [step, setStep] = useState<'email' | 'code'>('email');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const codeRef = useRef<TextInput>(null);

	const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

	const send = async () => {
		if (!valid) return setError('Enter your email address.');
		setBusy(true);
		setError('');
		try {
			await requestCode(email);
			setStep('code');
			setTimeout(() => codeRef.current?.focus(), 350);
		} catch (e) {
			setError(errorText(e));
		} finally {
			setBusy(false);
		}
	};

	const verify = async (c = code) => {
		if (c.length !== 6) return;
		setBusy(true);
		setError('');
		try {
			await verifyCode(email, c);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
		} catch (e) {
			setError(errorText(e));
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
			setCode('');
		} finally {
			setBusy(false);
		}
	};

	const input = {
		height: 54,
		borderRadius: 14,
		borderWidth: hair,
		borderColor: t.line2,
		backgroundColor: t.surface,
		paddingHorizontal: 16,
		fontFamily: fonts.body,
		fontSize: 16,
		color: t.fg
	} as const;

	return (
		<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.bg }}>
			<TopGlow color={t.amber} height={260} />
			<View style={{ flex: 1, paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 20, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
				<TopBar
					backLabel={step === 'code' ? 'Email' : 'Welcome'}
					onBack={() => (step === 'code' ? setStep('email') : router.back())}
					showProfile={false}
				/>

				{step === 'email' ? (
					<View style={{ gap: 16, marginTop: 28 }}>
						<View>
							<Eyebrow>Account access</Eyebrow>
							<T v="display" style={{ fontSize: 25, lineHeight: 33 }}>What’s your email?</T>
						</View>
						<T>We’ll email you a six-digit sign-in code. No password needed.</T>
						<TextInput
							style={input}
							value={email}
							onChangeText={setEmail}
							placeholder="you@example.com"
							placeholderTextColor={t.muted}
							autoCapitalize="none"
							autoComplete="email"
							keyboardType="email-address"
							textContentType="emailAddress"
							autoFocus
							returnKeyType="send"
							onSubmitEditing={send}
						/>
						{error ? <T color={t.danger}>{error}</T> : null}
						<Button title="Send my code" onPress={send} busy={busy} disabled={!valid} style={{ borderRadius: 16 }} />
					</View>
				) : (
					<View style={{ gap: 16, marginTop: 28 }}>
						<View>
							<Eyebrow>Verification</Eyebrow>
							<T v="display" style={{ fontSize: 25, lineHeight: 33 }}>Check your email</T>
						</View>
						<T>
							We sent a 6-digit code to <Text style={{ fontFamily: fonts.bodySemi, color: t.fg }}>{email.trim()}</Text>. It works for 10 minutes.
						</T>
						<View>
							<Pressable onPress={() => codeRef.current?.focus()} style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
								{Array.from({ length: 6 }).map((_, i) => {
									const active = i === code.length;
									const filled = Boolean(code[i]);
									return (
										<View
											key={i}
											style={{
												flex: 1,
												height: 58,
												borderRadius: radius.sm,
												borderWidth: active ? 1.5 : hair,
												borderColor: active ? t.amber : filled ? alpha(t.amber, 0.45) : t.line2,
												backgroundColor: active ? alpha(t.amber, 0.08) : t.surface,
												alignItems: 'center',
												justifyContent: 'center'
											}}
										>
											<Text style={{ fontFamily: fonts.mono, fontSize: 22, color: t.fg }}>{code[i] ?? ''}</Text>
										</View>
									);
								})}
							</Pressable>
						</View>
						<TextInput
							ref={codeRef}
							value={code}
							onChangeText={(v) => {
								const c = v.replace(/\D/g, '').slice(0, 6);
								setCode(c);
								if (c.length === 6) verify(c);
							}}
							keyboardType="number-pad"
							textContentType="oneTimeCode"
							autoComplete="one-time-code"
							maxLength={6}
							style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
						/>
						{error ? <T color={t.danger}>{error}</T> : null}
						<Button title="Sign in" onPress={() => verify()} busy={busy} disabled={code.length !== 6} style={{ borderRadius: 16 }} />
						<Button kind="solid" title="Send a new code" onPress={send} disabled={busy} style={{ borderRadius: 16 }} />
					</View>
				)}
			</View>
		</KeyboardAvoidingView>
	);
}
