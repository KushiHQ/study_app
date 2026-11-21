// Small building blocks in the Kushi Study look: text styles, buttons, cards,
// chips, the screen wrapper. Colours always come from the theme.
import { forwardRef, useEffect, type ReactNode } from 'react';
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
	type PressableProps,
	type ScrollViewProps,
	type StyleProp,
	type TextProps,
	type TextStyle,
	type ViewStyle
} from 'react-native';
import Animated, { Easing, FadeInDown, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radius, useTheme, type HueSet } from '../lib/theme';

type V = 'display' | 'title' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'small' | 'label' | 'micro' | 'read' | 'serif';

export function T({ v = 'body', color, style, ...p }: TextProps & { v?: V; color?: string }) {
	const t = useTheme();
	const base: Record<V, TextStyle> = {
		display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 37, letterSpacing: -1.1, color: t.fg },
		title: { fontFamily: fonts.display, fontSize: 19, lineHeight: 26, letterSpacing: -0.55, color: t.fg },
		h2: { fontFamily: fonts.bodyBold, fontSize: 19, lineHeight: 24, color: t.fg },
		h3: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 21, color: t.fg },
		body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: t.fg2 },
		bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 21, color: t.fg },
		small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: t.muted },
		label: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase', color: t.muted },
		micro: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 13, letterSpacing: 1.2, textTransform: 'uppercase', color: t.muted },
		read: { fontFamily: fonts.read, fontSize: 17, lineHeight: 27, color: t.fg },
		serif: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 31, letterSpacing: -0.4, color: t.fg }
	};
	return <Text {...p} style={[base[v], color ? { color } : null, style]} />;
}

export const Press = forwardRef<View, PressableProps & { style?: StyleProp<ViewStyle>; haptic?: boolean }>(function Press(
	{ style, haptic, onPress, ...p },
	ref
) {
	return (
		<Pressable
			ref={ref}
			{...p}
			onPress={(event) => {
				if (haptic) Haptics.selectionAsync().catch(() => {});
				onPress?.(event);
			}}
			style={({ pressed }) => [style, pressed && { opacity: 0.76 }]}
		/>
	);
});

type BtnKind = 'primary' | 'solid' | 'ghost' | 'danger' | 'hue';

export function Button({
	title,
	onPress,
	kind = 'primary',
	busy,
	disabled,
	icon,
	hue,
	style,
	small
}: {
	title: string;
	onPress?: () => void;
	kind?: BtnKind;
	busy?: boolean;
	disabled?: boolean;
	icon?: ReactNode;
	hue?: HueSet;
	style?: StyleProp<ViewStyle>;
	small?: boolean;
}) {
	const t = useTheme();
	const bg =
		kind === 'primary' ? t.amber : kind === 'solid' ? t.surface2 : kind === 'danger' ? t.dangerSoft : kind === 'hue' ? (hue?.base ?? t.amber) : 'transparent';
	const fg = kind === 'primary' ? t.onAmber : kind === 'danger' ? t.danger : kind === 'hue' ? t.onHue : t.fg;
	return (
		<Press
			haptic
			accessibilityRole="button"
			accessibilityState={{ disabled: !!disabled, busy: !!busy }}
			disabled={disabled || busy}
			onPress={onPress}
			style={[
				{
					height: small ? 40 : 52,
					paddingHorizontal: small ? 16 : 22,
					borderRadius: radius.sm,
					backgroundColor: bg,
					alignItems: 'center',
					justifyContent: 'center',
					flexDirection: 'row',
					gap: 8,
					opacity: disabled ? 0.5 : 1,
					borderWidth: kind === 'ghost' || kind === 'solid' ? StyleSheet.hairlineWidth * 2 : 0,
					borderColor: t.line2
				},
				style
			]}
		>
			{busy ? <ActivityIndicator color={fg} /> : icon}
			<Text style={{ color: fg, fontFamily: fonts.bodyBold, fontSize: small ? 14 : 16 }}>{title}</Text>
		</Press>
	);
}

export function Card({ children, style, onPress, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; padded?: boolean }) {
	const t = useTheme();
	const s: StyleProp<ViewStyle> = [
		{
			backgroundColor: t.surface,
			borderRadius: radius.md,
			borderWidth: StyleSheet.hairlineWidth * 2,
			borderColor: t.line,
			padding: padded ? 18 : 0
		},
		style
	];
	if (onPress)
		return (
			<Press onPress={onPress} style={s} accessibilityRole="button">
				{children}
			</Press>
		);
	return <View style={s}>{children}</View>;
}

export function Chip({ label, active, onPress, hue }: { label: string; active?: boolean; onPress?: () => void; hue?: HueSet }) {
	const t = useTheme();
	return (
		<Press
			haptic
			onPress={onPress}
			accessibilityRole="button"
			accessibilityState={{ selected: !!active }}
			style={{
				paddingHorizontal: 14,
				height: 36,
				borderRadius: radius.pill,
				justifyContent: 'center',
				backgroundColor: active ? (hue?.soft ?? t.accentSoft) : t.surface,
				borderWidth: StyleSheet.hairlineWidth * 2,
				borderColor: active ? (hue?.base ?? t.amber) : t.line2
			}}
		>
			<Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: active ? (hue?.ink ?? t.accent) : t.fg2 }}>{label}</Text>
		</Press>
	);
}

/** Status pill using the standard labels (Pending, Approved, Rejected, Review…). */
export function Pill({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'good' | 'bad' | 'accent' | 'signal' }) {
	const t = useTheme();
	const c = { muted: [t.surface2, t.muted], good: [t.successSoft, t.success], bad: [t.dangerSoft, t.danger], accent: [t.accentSoft, t.accent], signal: [t.signalSoft, t.signal] }[tone];
	return (
		<View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: c[0] }}>
			<Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: c[1] }}>{label}</Text>
		</View>
	);
}

const sectionEntrance = (delay: number) => FadeInDown.duration(220).delay(delay).easing(Easing.out(Easing.cubic))
	.withInitialValues({ opacity: 0.65, transform: [{ translateY: 6 }] })
	.reduceMotion(ReduceMotion.System);
const firstEntrance = sectionEntrance(0);
const followingEntrance = sectionEntrance(45);

export function Reveal({ children, style, follow }: { children: ReactNode; style?: StyleProp<ViewStyle>; follow?: boolean }) {
	return <Animated.View entering={follow ? followingEntrance : firstEntrance} style={style}>{children}</Animated.View>;
}

export function Screen({ children, scroll = true, padded = true, style, ...p }: ScrollViewProps & { scroll?: boolean; padded?: boolean; children: ReactNode }) {
	const t = useTheme();
	const insets = useSafeAreaInsets();
	if (!scroll) return <View style={[{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }, style as ViewStyle]}>{children}</View>;
	return (
		<ScrollView
			{...p}
			style={[{ flex: 1, backgroundColor: t.bg }, style]}
			contentContainerStyle={[{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, paddingHorizontal: padded ? 18 : 0 }, p.contentContainerStyle]}
			keyboardShouldPersistTaps="handled"
		>
			{children}
		</ScrollView>
	);
}

export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
	const t = useTheme();
	return (
		<View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 }}>
			<View style={{ width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: t.amber, transform: [{ rotate: '90deg' }] }} />
			<T v="label" color={color}>
				{children}
			</T>
		</View>
	);
}

export function Loading({ label }: { label?: string }) {
	const t = useTheme();
	return (
		<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12, backgroundColor: t.bg }}>
			<ActivityIndicator color={t.amber} size="large" />
			{label ? <T v="small">{label}</T> : null}
		</View>
	);
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
	const t = useTheme();
	return (
		<Card style={{ backgroundColor: t.dangerSoft, borderColor: 'transparent', gap: 10 }}>
			<T v="bodyStrong" color={t.danger}>
				{message}
			</T>
			{onRetry ? <Button small kind="solid" title="Try again" onPress={onRetry} style={{ alignSelf: 'flex-start' }} /> : null}
		</Card>
	);
}

/** Thin progress bar. */
export function Meter({ value, color, track, height = 6 }: { value: number; color?: string; track?: string; height?: number }) {
	const t = useTheme();
	const w = useSharedValue(0);
	useEffect(() => {
		w.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 700 });
	}, [value, w]);
	const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
	return (
		<View style={{ height, borderRadius: height, backgroundColor: track ?? t.surface2, overflow: 'hidden' }}>
			<Animated.View style={[{ height, borderRadius: height, backgroundColor: color ?? t.amber }, a]} />
		</View>
	);
}

export const hair = StyleSheet.hairlineWidth * 2;
