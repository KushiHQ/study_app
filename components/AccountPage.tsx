import type { ReactNode } from 'react';
import { View, type TextInputProps } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../lib/theme';
import { FieldInput, Press, Screen, T } from './ui';

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
	return <FieldInput label={label} multiline={multiline} accessibilityLabel={label} {...props} />;
}
