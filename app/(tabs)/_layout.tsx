import { Platform, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { useLinkBuilder } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { BookOpen, CalendarDays, UserRound } from 'lucide-react-native';
import { alpha, fonts, radius, useTheme } from '../../lib/theme';
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
		<View style={{ backgroundColor: t.bg, paddingTop: 5, paddingBottom: Math.max(insets.bottom, 10), paddingLeft: Math.max(14, insets.left), paddingRight: Math.max(14, insets.right) }}>
			<View accessibilityRole="tablist" style={{ alignSelf: 'center', width: '100%', maxWidth: 440, borderRadius: radius.md, borderWidth: hair, borderColor: t.line2, backgroundColor: t.surface, padding: 5, flexDirection: 'row', gap: 4 }}>
				{state.routes.map((route, index) => {
					const item = ITEMS[route.name as keyof typeof ITEMS];
					if (!item) return null;
					const selected = state.index === index;
					const { Icon, label } = item;
					const color = selected ? t.accent : t.fg2;
					return (
						<PlatformPressable
							key={route.key}
							href={buildHref(route.name, route.params)}
							role={Platform.OS === 'ios' ? 'button' : 'tab'}
							accessibilityState={{ selected }}
							aria-selected={selected}
							accessibilityLabel={label}
							pressOpacity={0.76}
							pressColor={alpha(t.amber, 0.10)}
							onPress={() => {
								const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
								if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
							}}
							onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
							style={{
								flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 5, paddingVertical: 7,
								flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
								borderRadius: radius.sm, borderWidth: hair,
								borderColor: selected ? alpha(t.amber, 0.24) : 'transparent',
								backgroundColor: selected ? t.accentSoft : 'transparent'
							}}
						>
							<Icon size={17} color={color} strokeWidth={selected ? 2.25 : 1.8} />
							<Text style={{ flexShrink: 1, fontFamily: selected ? fonts.bodyBold : fonts.bodySemi, fontSize: 13, lineHeight: 17, color }}>{label}</Text>
						</PlatformPressable>
					);
				})}
			</View>
		</View>
	);
}
