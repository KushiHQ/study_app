// A progress ring that sweeps to its value on the UI thread.
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

const ACircle = Animated.createAnimatedComponent(Circle);

export function Ring({ value, size = 56, stroke = 6, color, track, children, duration = 900 }: { value: number; size?: number; stroke?: number; color: string; track: string; children?: ReactNode; duration?: number }) {
	const r = (size - stroke) / 2;
	const c = 2 * Math.PI * r;
	const p = useSharedValue(0);
	useEffect(() => {
		p.value = withTiming(Math.max(0, Math.min(1, value)), { duration, easing: Easing.out(Easing.cubic) });
	}, [value]);
	const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value) }));
	return (
		<View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
			<Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
				<Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
				<ACircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={props} />
			</Svg>
			{children}
		</View>
	);
}
