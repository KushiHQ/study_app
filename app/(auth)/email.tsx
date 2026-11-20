// Email code sign-in: email → 6-digit code (10 minutes).
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { requestCode, verifyCode } from '../../lib/auth';
import { errorText } from '../../lib/api/client';
import { fonts, radius, useTheme } from '../../lib/theme';
import { Button, Press, T, hair } from '../../components/ui';

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
	const shake = useSharedValue(0);
	const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

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
			shake.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }), withTiming(-6, { duration: 50 }), withTiming(0, { duration: 50 }));
			setCode('');
		} finally {
			setBusy(false);
		}
	};

	const input = {
		height: 54,
		borderRadius: 16,
		borderWidth: hair,
		borderColor: t.line2,
		backgroundColor: t.surface,
		paddingHorizontal: 16,
		fontFamily: fonts.body,
		fontSize: 17,
		color: t.fg
	} as const;

	return (
		<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.bg }}>
			<View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 22, paddingBottom: insets.bottom + 20 }}>
				<Press onPress={() => (step === 'code' ? setStep('email') : router.back())} accessibilityLabel="Back" hitSlop={12} style={{ width: 40, height: 40, justifyContent: 'center' }}>
					<ArrowLeft size={24} color={t.fg} />
				</Press>
				{step === 'email' ? (
					<Animated.View key="email" entering={FadeInRight} exiting={FadeOutLeft} style={{ gap: 14, marginTop: 24 }}>
						<T v="title">What's your email?</T>
						<T>We'll send you a 6-digit code. No password to remember.</T>
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
						<Button title="Send my code" onPress={send} busy={busy} disabled={!valid} />
					</Animated.View>
				) : (
					<Animated.View key="code" entering={FadeInRight} exiting={FadeOutLeft} style={{ gap: 14, marginTop: 24 }}>
						<T v="title">Check your email</T>
						<T>
							We sent a code to <Text style={{ fontFamily: fonts.bodySemi, color: t.fg }}>{email.trim()}</Text>. It works for 10 minutes.
						</T>
						<Animated.View style={shakeStyle}>
							<Pressable onPress={() => codeRef.current?.focus()} style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
								{Array.from({ length: 6 }).map((_, i) => (
									<View
										key={i}
										style={{
											flex: 1,
											height: 58,
											borderRadius: radius.sm,
											borderWidth: i === code.length ? 2 : hair,
											borderColor: i === code.length ? t.amber : t.line2,
											backgroundColor: t.surface,
											alignItems: 'center',
											justifyContent: 'center'
										}}
									>
										<Text style={{ fontFamily: fonts.mono, fontSize: 24, color: t.fg }}>{code[i] ?? ''}</Text>
									</View>
								))}
							</Pressable>
						</Animated.View>
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
						<Button title="Sign in" onPress={() => verify()} busy={busy} disabled={code.length !== 6} />
						<Button kind="ghost" title="Send a new code" onPress={send} disabled={busy} />
					</Animated.View>
				)}
			</View>
		</KeyboardAvoidingView>
	);
}
