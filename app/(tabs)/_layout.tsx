import { Platform, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { BookOpen, Sun, Timer, User } from 'lucide-react-native';
import { fonts, radius, useTheme } from '../../lib/theme';
import { Press, hair } from '../../components/ui';

const ICONS = { index: Sun, courses: BookOpen, focus: Timer, account: User } as const;
const LABELS = { index: 'Today', courses: 'Courses', focus: 'Focus', account: 'You' } as const;

export default function TabsLayout() {
	return (
		<Tabs screenOptions={{ headerShown: false, animation: 'shift' }} tabBar={(p) => <TabBar {...p} />}>
			<Tabs.Screen name="index" />
			<Tabs.Screen name="courses" />
			<Tabs.Screen name="focus" />
			<Tabs.Screen name="account" />
		</Tabs>
	);
}

function TabBar({ state, navigation }: BottomTabBarProps) {
	const t = useTheme();
	const insets = useSafeAreaInsets();
	return (
		<View
			style={{
				position: 'absolute',
				left: 16,
				right: 16,
				bottom: Math.max(insets.bottom, 12),
				height: 64,
				borderRadius: radius.pill,
				backgroundColor: t.name === 'night' ? 'rgba(18,26,46,0.96)' : 'rgba(255,255,255,0.97)',
				borderWidth: hair,
				borderColor: t.line2,
				flexDirection: 'row',
				paddingHorizontal: 6,
				alignItems: 'center',
				shadowColor: '#000',
				shadowOpacity: t.name === 'night' ? 0.5 : 0.12,
				shadowRadius: 20,
				shadowOffset: { width: 0, height: 8 },
				elevation: 12
			}}
		>
			{state.routes.map((r, i) => {
				const focused = state.index === i;
				const Icon = ICONS[r.name as keyof typeof ICONS] ?? Sun;
				return (
					<Press
						key={r.key}
						haptic
						scaleTo={0.9}
						accessibilityRole="tab"
						accessibilityState={{ selected: focused }}
						accessibilityLabel={LABELS[r.name as keyof typeof LABELS]}
						onPress={() => {
							const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true } as never) as unknown as { defaultPrevented: boolean };
							if (!focused && !e.defaultPrevented) navigation.navigate(r.name);
						}}
						style={{ flex: 1, height: 52, alignItems: 'center', justifyContent: 'center' }}
					>
						<Pill on={focused} color={t.accentSoft} />
						<Icon size={21} color={focused ? t.accent : t.muted} strokeWidth={focused ? 2.4 : 2} />
						<Text style={{ fontFamily: focused ? fonts.bodyBold : fonts.bodyMedium, fontSize: 11, marginTop: 2, color: focused ? t.accent : t.muted }}>{LABELS[r.name as keyof typeof LABELS]}</Text>
					</Press>
				);
			})}
		</View>
	);
}

function Pill({ on, color }: { on: boolean; color: string }) {
	const a = useAnimatedStyle(() => ({ opacity: withSpring(on ? 1 : 0), transform: [{ scale: withSpring(on ? 1 : 0.6, { damping: 15 }) }] }));
	return <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 2, bottom: 2, left: 6, right: 6, borderRadius: 26, backgroundColor: color }, a]} />;
}
