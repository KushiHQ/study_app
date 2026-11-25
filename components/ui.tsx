// Small building blocks in the Kushi Study look: text styles, buttons, luminous
// gradient cards, chips, custom tooltips, toggle switches, recessed inputs,
// and frosted bottom-sheet selects. Colours always come from the theme.
import { forwardRef, useEffect, useId, useState, type ReactNode } from 'react';
import {
	ActivityIndicator,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
	type PressableProps,
	type ScrollViewProps,
	type StyleProp,
	type TextInputProps,
	type TextProps,
	type TextStyle,
	type ViewStyle
} from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronDown, Info } from 'lucide-react-native';
import { alpha, fonts, mix, radius, useTheme, type HueSet } from '../lib/theme';
import { LoadingDots } from './LoadingDots';

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

/**
 * Kushi's signature silky-smooth diagonal wash (matching study.kushi.ng).
 * Uses a 4-stop alpha ease-out over the solid card surface so there is zero abrupt cutoff.
 */
export function LuminousBg({ from, to, borderRadius = radius.md }: { from: string; to: string; borderRadius?: number }) {
	const gid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
	return (
		<View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}>
			<Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
				<Defs>
					<LinearGradient id={`lum-${gid}`} x1="0%" y1="0%" x2="85%" y2="95%">
						<Stop offset="0%" stopColor={from} stopOpacity="1" />
						<Stop offset="36%" stopColor={from} stopOpacity="0.45" />
						<Stop offset="70%" stopColor={to} stopOpacity="0.88" />
						<Stop offset="100%" stopColor={to} stopOpacity="1" />
					</LinearGradient>
				</Defs>
				<Rect x="0" y="0" width="100" height="100" fill={`url(#lum-${gid})`} />
			</Svg>
		</View>
	);
}

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

export function Card({
	children,
	style,
	onPress,
	padded = true,
	tint,
	tintStrength = 8
}: {
	children: ReactNode;
	style?: StyleProp<ViewStyle>;
	onPress?: () => void;
	padded?: boolean;
	/** Optional accent hex to give the card Kushi's signature luminous diagonal tint + subtle tinted outline */
	tint?: string;
	tintStrength?: number;
}) {
	const t = useTheme();
	const from = tint
		? mix(tint, tintStrength, t.surface)
		: t.name === 'night'
			? mix('#b4caff', 4.5, t.surface)
			: mix('#6374af', 2.5, t.surface);
	const borderColor = tint ? alpha(tint, t.name === 'night' ? 0.28 : 0.22) : t.line;
	const s: StyleProp<ViewStyle> = [
		{
			backgroundColor: t.surface,
			borderRadius: radius.md,
			borderWidth: StyleSheet.hairlineWidth * 2,
			borderColor,
			padding: padded ? 18 : 0,
			overflow: 'hidden'
		},
		style
	];
	const inner = (
		<>
			<LuminousBg from={from} to={t.surface} borderRadius={radius.md} />
			{children}
		</>
	);
	if (onPress)
		return (
			<Press onPress={onPress} style={s} accessibilityRole="button">
				{inner}
			</Press>
		);
	return <View style={s}>{inner}</View>;
}

export function Chip({ label, active, onPress, hue }: { label: string; active?: boolean; onPress?: () => void; hue?: HueSet }) {
	const t = useTheme();
	const tint = hue?.base ?? t.amber;
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
				borderColor: active ? alpha(tint, 0.45) : t.line2,
				overflow: 'hidden'
			}}
		>
			{active ? <LuminousBg from={mix(tint, 20, t.surface)} to={t.surface} borderRadius={radius.pill} /> : null}
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

/** Custom Kushi pill toggle switch (replaces raw checkboxes). */
export function ToggleSwitch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
	const t = useTheme();
	const pos = useSharedValue(value ? 1 : 0);
	useEffect(() => {
		pos.value = withTiming(value ? 1 : 0, { duration: 200, easing: Easing.out(Easing.cubic) });
	}, [value, pos]);
	const thumbStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: pos.value * 18 }]
	}));
	return (
		<Press
			haptic
			accessibilityRole="switch"
			accessibilityState={{ checked: value }}
			accessibilityLabel={label}
			onPress={() => onChange(!value)}
			style={{ flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 38 }}
		>
			<View
				style={{
					width: 46,
					height: 28,
					borderRadius: 14,
					padding: 3,
					backgroundColor: value ? t.amber : t.bg2,
					borderWidth: hair,
					borderColor: value ? t.amber : t.line2,
					justifyContent: 'center'
				}}
			>
				<Animated.View
					style={[
						{
							width: 20,
							height: 20,
							borderRadius: 10,
							backgroundColor: value ? t.onAmber : t.fg2
						},
						thumbStyle
					]}
				/>
			</View>
			{label ? <T v="bodyStrong">{label}</T> : null}
		</Press>
	);
}

/** Custom Kushi tooltip matching web's inverted pill tooltip. */
export function InfoTip({ text, label = 'More info', size = 15 }: { text: string; label?: string; size?: number }) {
	const t = useTheme();
	const [open, setOpen] = useState(false);
	return (
		<>
			<Press
				haptic
				hitSlop={10}
				accessibilityRole="button"
				accessibilityLabel={label}
				onPress={() => setOpen(true)}
				style={{
					width: 24,
					height: 24,
					borderRadius: 12,
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: open ? alpha(t.fg, 0.08) : 'transparent'
				}}
			>
				<Info size={size} color={open ? t.fg : t.muted} />
			</Press>
			<Modal transparent visible={open} animationType="none" onRequestClose={() => setOpen(false)}>
				<Pressable
					style={{ flex: 1, backgroundColor: 'rgba(6,9,19,0.45)', justifyContent: 'center', alignItems: 'center', padding: 28 }}
					onPress={() => setOpen(false)}
				>
					<Animated.View
						entering={FadeIn.duration(150)}
						exiting={FadeOut.duration(120)}
						style={{
							maxWidth: 320,
							paddingHorizontal: 16,
							paddingVertical: 13,
							borderRadius: 14,
							backgroundColor: t.fg,
							shadowColor: '#000',
							shadowOpacity: 0.3,
							shadowRadius: 20,
							shadowOffset: { width: 0, height: 10 }
						}}
					>
						<Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: t.surface }}>{text}</Text>
					</Animated.View>
				</Pressable>
			</Modal>
		</>
	);
}

/** Unified recessed-luminous text input matching web .input. */
export function FieldInput({ label, multiline, style, ...props }: TextInputProps & { label?: string }) {
	const t = useTheme();
	const [focused, setFocused] = useState(false);
	return (
		<View style={{ gap: 6 }}>
			{label ? <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: t.fg2 }}>{label}</Text> : null}
			<TextInput
				{...props}
				multiline={multiline}
				placeholderTextColor={t.muted}
				onFocus={(e) => {
					setFocused(true);
					props.onFocus?.(e);
				}}
				onBlur={(e) => {
					setFocused(false);
					props.onBlur?.(e);
				}}
				style={[
					{
						minHeight: multiline ? 96 : 46,
						textAlignVertical: multiline ? 'top' : 'center',
						borderRadius: 13,
						borderWidth: focused ? 1.5 : hair,
						borderColor: focused ? alpha(t.amber, 0.8) : t.line2,
						backgroundColor: focused ? t.surface : t.name === 'night' ? mix(t.bg, 50, t.surface) : t.surface2,
						color: t.fg,
						fontFamily: fonts.body,
						fontSize: 15,
						paddingHorizontal: 14,
						paddingVertical: 10
					},
					style
				]}
			/>
		</View>
	);
}

/** Unified Kushi bottom-sheet select matching web's frosted .ksel-list. */
export function SelectField({
	label,
	value,
	options,
	placeholder = 'Choose…',
	onChange
}: {
	label: string;
	value: string | null;
	options: { value: string; label: string }[];
	placeholder?: string;
	onChange: (value: string) => void;
}) {
	const t = useTheme();
	const insets = useSafeAreaInsets();
	const [open, setOpen] = useState(false);
	const selected = options.find((o) => o.value === value);
	return (
		<View style={{ gap: 6, flex: 1 }}>
			<Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: t.fg2 }}>{label}</Text>
			<Press
				haptic
				accessibilityRole="button"
				accessibilityLabel={label}
				onPress={() => setOpen(true)}
				style={{
					minHeight: 46,
					borderRadius: 13,
					borderWidth: open ? 1.5 : hair,
					borderColor: open ? alpha(t.amber, 0.8) : t.line2,
					backgroundColor: t.name === 'night' ? mix(t.bg, 50, t.surface) : t.surface2,
					paddingHorizontal: 14,
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: 8
				}}
			>
				<Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: selected ? t.fg : t.muted }}>
					{selected?.label ?? placeholder}
				</Text>
				<ChevronDown size={16} color={t.muted} />
			</Press>

			<Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
				<Pressable style={{ flex: 1, backgroundColor: 'rgba(6,9,19,0.55)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
					<Pressable
						style={{
							maxHeight: '68%',
							backgroundColor: t.surface,
							borderTopLeftRadius: 24,
							borderTopRightRadius: 24,
							borderWidth: hair,
							borderColor: t.line2,
							paddingTop: 12,
							paddingBottom: Math.max(insets.bottom, 18),
							overflow: 'hidden'
						}}
						onPress={(e) => e.stopPropagation()}
					>
						<LuminousBg from={mix(t.surface2, 92, t.amber)} to={t.surface} borderRadius={24} />
						<View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: t.line2, alignSelf: 'center', marginBottom: 12 }} />
						<Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: t.fg, paddingHorizontal: 20, marginBottom: 10 }}>{label}</Text>
						<ScrollView contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}>
							{options.map((o) => {
								const isSel = o.value === value;
								return (
									<Press
										key={o.value}
										haptic
										onPress={() => {
											onChange(o.value);
											setOpen(false);
										}}
										style={{
											flexDirection: 'row',
											alignItems: 'center',
											justifyContent: 'space-between',
											paddingHorizontal: 14,
											paddingVertical: 12,
											borderRadius: 12,
											borderWidth: isSel ? hair : 0,
											borderColor: isSel ? alpha(t.amber, 0.36) : 'transparent',
											backgroundColor: isSel ? t.accentSoft : 'transparent',
											overflow: 'hidden'
										}}
									>
										{isSel ? <LuminousBg from={mix(t.amber, 18, t.surface2)} to={t.surface2} borderRadius={12} /> : null}
										<Text style={{ fontFamily: isSel ? fonts.bodySemi : fonts.body, fontSize: 15, color: isSel ? t.accent : t.fg2 }}>{o.label}</Text>
										{isSel ? <Check size={16} color={t.accent} /> : null}
									</Press>
								);
							})}
						</ScrollView>
					</Pressable>
				</Pressable>
			</Modal>
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

/** Subtle top indigo/teal atmospheric canvas wash matching study_web_app src/app.css --canvas. */
export function CanvasGlow() {
	const t = useTheme();
	const night = t.name === 'night';
	return (
		<View pointerEvents="none" style={[StyleSheet.absoluteFill, { height: 340, overflow: 'hidden' }]}>
			<Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
				<Defs>
					<RadialGradient id="cg-left" cx="12%" cy="0%" r="65%">
						<Stop offset="0%" stopColor={night ? '#6366F1' : '#7C5CE0'} stopOpacity={night ? '0.16' : '0.07'} />
						<Stop offset="100%" stopColor={t.bg} stopOpacity="0" />
					</RadialGradient>
					<RadialGradient id="cg-right" cx="92%" cy="4%" r="55%">
						<Stop offset="0%" stopColor={night ? '#2DD4BF' : '#2F80ED'} stopOpacity={night ? '0.09' : '0.07'} />
						<Stop offset="100%" stopColor={t.bg} stopOpacity="0" />
					</RadialGradient>
				</Defs>
				<Rect x="0" y="0" width="100" height="100" fill="url(#cg-left)" />
				<Rect x="0" y="0" width="100" height="100" fill="url(#cg-right)" />
			</Svg>
		</View>
	);
}

export function Screen({ children, scroll = true, padded = true, style, ...p }: ScrollViewProps & { scroll?: boolean; padded?: boolean; children: ReactNode }) {
	const t = useTheme();
	const insets = useSafeAreaInsets();
	if (!scroll)
		return (
			<View style={[{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }, style as ViewStyle]}>
				<CanvasGlow />
				{children}
			</View>
		);
	return (
		<View style={{ flex: 1, backgroundColor: t.bg }}>
			<CanvasGlow />
			<ScrollView
				{...p}
				style={[{ flex: 1 }, style]}
				contentContainerStyle={[{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, paddingHorizontal: padded ? 18 : 0 }, p.contentContainerStyle]}
				keyboardShouldPersistTaps="handled"
			>
				{children}
			</ScrollView>
		</View>
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
		<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
			<LoadingDots label={label} />
		</View>
	);
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
	const t = useTheme();
	return (
		<Card tint={t.danger} tintStrength={14} style={{ gap: 10 }}>
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
