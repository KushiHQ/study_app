import { Platform, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { useLinkBuilder } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { alpha, fonts, useTheme } from '../../lib/theme';
import { hair } from '../../components/ui';

type TabKey = 'index' | 'courses' | 'account';

const ITEMS: Record<TabKey, { label: string }> = {
	index: { label: 'Today' },
	courses: { label: 'Courses' },
	account: { label: 'Account' }
};

/** Unique rounded fillable dock icons matching Kushi Study Mobile v2. */
function DockIcon({ name, active, color, bg }: { name: TabKey; active: boolean; color: string; bg: string }) {
	if (name === 'index') {
		return (
			<Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
				<Rect
					x={3}
					y={3.5}
					width={18}
					height={17}
					rx={5.5}
					fill={active ? color : 'none'}
					stroke={color}
					strokeWidth={1.9}
				/>
				<Path
					d="M8.2 9.8h7.6M8.2 14.2h4.6"
					stroke={active ? bg : color}
					strokeWidth={2}
					strokeLinecap="round"
				/>
			</Svg>
		);
	}
	if (name === 'courses') {
		return (
			<Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
				{active ? (
					<>
						<Path
							d="M3.2 6.2C3.2 4.8 4.4 3.8 5.8 4.1C7.9 4.5 10.1 5.4 11.4 6.7V19.6C10.1 18.5 7.9 17.8 5.5 17.5C4.2 17.3 3.2 16.3 3.2 15V6.2Z"
							fill={color}
						/>
						<Path
							d="M20.8 6.2C20.8 4.8 19.6 3.8 18.2 4.1C16.1 4.5 13.9 5.4 12.6 6.7V19.6C13.9 18.5 16.1 17.8 18.5 17.5C19.8 17.3 20.8 16.3 20.8 15V6.2Z"
							fill={color}
						/>
					</>
				) : (
					<>
						<Path
							d="M12 6.8C10.4 5.3 7.8 4.4 5.2 4.3C4.1 4.3 3.3 5.1 3.3 6.2V15.3C3.3 16.4 4.1 17.2 5.2 17.3C7.8 17.5 10.4 18.3 12 19.7M12 6.8C13.6 5.3 16.2 4.4 18.8 4.3C19.9 4.3 20.7 5.1 20.7 6.2V15.3C20.7 16.4 19.9 17.2 18.8 17.3C16.2 17.5 13.6 18.3 12 19.7M12 6.8V19.7"
							stroke={color}
							strokeWidth={1.85}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</>
				)}
			</Svg>
		);
	}
	return (
		<Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
			<Circle cx={12} cy={8.2} r={3.8} fill={active ? color : 'none'} stroke={color} strokeWidth={1.9} />
			<Path
				d="M4.8 19.2C5.4 15.8 8.3 13.8 12 13.8C15.7 13.8 18.6 15.8 19.2 19.2"
				fill={active ? color : 'none'}
				stroke={color}
				strokeWidth={1.9}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</Svg>
	);
}

export default function TabsLayout() {
	const t = useTheme();
	const reduceMotion = useReducedMotion();
	return (
		<Tabs
			tabBar={(props) => <StudyDock {...props} />}
			screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg }, animation: reduceMotion ? 'none' : 'fade' }}
		>
			<Tabs.Screen name="index" options={{ title: ITEMS.index.label }} />
			<Tabs.Screen name="courses" options={{ title: ITEMS.courses.label }} />
			<Tabs.Screen name="account" options={{ title: ITEMS.account.label }} />
		</Tabs>
	);
}

function StudyDock({ state, navigation, insets }: BottomTabBarProps) {
	const t = useTheme();
	const { buildHref } = useLinkBuilder();
	const dockBg = t.name === 'night' ? '#0B1122' : t.surface;

	return (
		<View
			accessibilityRole="tablist"
			style={{
				backgroundColor: dockBg,
				borderTopWidth: hair,
				borderTopColor: t.name === 'night' ? 'rgba(210, 224, 255, 0.10)' : t.line,
				paddingTop: 8,
				paddingBottom: Math.max(insets.bottom, 10),
				paddingHorizontal: 16,
				flexDirection: 'row'
			}}
		>
			{state.routes.map((route, index) => {
				const key = route.name as TabKey;
				const item = ITEMS[key];
				if (!item) return null;
				const selected = state.index === index;
				const color = selected ? t.amber : t.muted;
				return (
					<PlatformPressable
						key={route.key}
						href={buildHref(route.name, route.params)}
						role={Platform.OS === 'ios' ? 'button' : 'tab'}
						accessibilityState={{ selected }}
						aria-selected={selected}
						accessibilityLabel={item.label}
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
						<DockIcon name={key} active={selected} color={color} bg={dockBg} />
						<Text style={{ fontFamily: selected ? fonts.bodySemi : fonts.bodyMedium, fontSize: 11, lineHeight: 14, color: selected ? t.accent : t.muted }}>
							{item.label}
						</Text>
					</PlatformPressable>
				);
			})}
		</View>
	);
}
