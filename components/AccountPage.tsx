import type { ReactNode } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { fonts, radius, useTheme } from '../lib/theme';
import { Press, Screen, T, hair } from './ui';

export function AccountPage({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
	const router = useRouter();
	const t = useTheme();
	return (
		<Screen contentContainerStyle={{ width: '100%', maxWidth: 580, alignSelf: 'center', gap: 18 }}>
			<Press accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/account')}
				style={{ minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
				<ArrowLeft size={19} color={t.accent} />
				<T v="bodyStrong">Back</T>
			</Press>
			<View style={{ gap: 8 }}>
				<T v="display" accessibilityRole="header">{title}</T>
				{description ? <T>{description}</T> : null}
			</View>
			{children}
		</Screen>
	);
}

export function AccountField({ label, multiline, ...props }: TextInputProps & { label: string }) {
	const t = useTheme();
	return (
		<View style={{ gap: 5 }}>
			<T v="bodyStrong">{label}</T>
			<TextInput {...props} multiline={multiline} accessibilityLabel={label} placeholderTextColor={t.muted} style={{
				minHeight: multiline ? 100 : 48, textAlignVertical: multiline ? 'top' : 'center',
				borderRadius: radius.sm, borderWidth: hair, borderColor: t.line2, backgroundColor: t.bg,
				color: t.fg, fontFamily: fonts.body, fontSize: 16, paddingHorizontal: 12, paddingVertical: 10
			}} />
		</View>
	);
}
