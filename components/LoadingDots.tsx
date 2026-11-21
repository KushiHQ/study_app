import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '../lib/theme';

// The pulsing dots used by Kushi's mobile splash, in the Study palette.
export function LoadingDots({ label = 'Loading' }: { label?: string }) {
	const t = useTheme();
	const reduceMotion = useReducedMotion();
	return (
		<View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }}
			style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 30, backgroundColor: t.accentSoft }}>
			{[0, 250, 500].map((delay) => <Dot key={delay} delay={delay} color={t.accent} reduceMotion={reduceMotion} />)}
		</View>
	);
}

function Dot({ delay, color, reduceMotion }: { delay: number; color: string; reduceMotion: boolean }) {
	const opacity = useSharedValue(0.3);
	useEffect(() => {
		if (reduceMotion) return;
		opacity.set(withDelay(delay, withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, true)));
		return () => cancelAnimation(opacity);
	}, [delay, opacity, reduceMotion]);
	const pulse = useAnimatedStyle(() => {
		const value = opacity.get();
		return { opacity: value, transform: [{ scale: 0.8 + (value - 0.3) * (0.4 / 0.7) }] };
	});
	return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, reduceMotion ? null : pulse]} />;
}
