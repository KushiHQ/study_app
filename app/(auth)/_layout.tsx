import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../../lib/theme';

export default function AuthLayout() {
	const t = useTheme();
	const reduceMotion = useReducedMotion();
	return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: reduceMotion ? 'none' : 'slide_from_right' }} />;
}
