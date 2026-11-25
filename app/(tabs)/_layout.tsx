import { Platform, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { useLinkBuilder } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { BookOpen, CalendarDays, UserRound } from 'lucide-react-native';
import { alpha, fonts, useTheme } from '../../lib/theme';
import { hair } from '../../components/ui';

const ITEMS = {
	index: { label: 'Today', Icon: CalendarDays },
	courses: { label: 'Courses', Icon: BookOpen },
	account: { label: 'Account', Icon: UserRound }
} as const;

export default function TabsLayout() {
	const reduceMotion = useReducedMotion();
	return (
		<Tabs tabBar={(props) => <StudyDock {...props} />} screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'fade' }}>
			<Tabs.Screen name="index" options={{ title: ITEMS.index.label }} />
			<Tabs.Screen name="courses" options={{ title: ITEMS.courses.label }} />
			<Tabs.Screen name="account" options={{ title: ITEMS.account.label }} />
		</Tabs>
	);
}

function StudyDock({ state, navigation, insets }: BottomTabBarProps) {
	const t = useTheme();
	const { buildHref } = useLinkBuilder();

	return (
		<View
			accessibilityRole="tablist"
			style={{
				backgroundColor: t.name === 'night' ? '#0D1426' : t.surface,
				borderTopWidth: hair,
				borderTopColor: t.line,
				paddingTop: 8,
				paddingBottom: Math.max(insets.bottom, 10),
				paddingHorizontal: 16,
				flexDirection: 'row'
			}}
		>
			{state.routes.map((route, index) => {
				const item = ITEMS[route.name as keyof typeof ITEMS];
				if (!item) return null;
				const selected = state.index === index;
				const { Icon, label } = item;
				const color = selected ? t.accent : t.muted;
				return (
					<PlatformPressable
						key={route.key}
						href={buildHref(route.name, route.params)}
						role={Platform.OS === 'ios' ? 'button' : 'tab'}
						accessibilityState={{ selected }}
						aria-selected={selected}
						accessibilityLabel={label}
						pressOpacity={0.72}
						pressColor={alpha(t.amber, 0.08)}
						onPress={() => {
							const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
							if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
						}}
						onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
						style={{
							flex: 1,
							minHeight: 46,
							alignItems: 'center',
							justifyContent: 'center',
							gap: 4
						}}
					>
						<Icon size={22} color={color} strokeWidth={selected ? 2.2 : 1.75} />
						<Text style={{ fontFamily: selected ? fonts.bodySemi : fonts.bodyMedium, fontSize: 11, lineHeight: 14, color }}>{label}</Text>
					</PlatformPressable>
				);
			})}
		</View>
	);
}
