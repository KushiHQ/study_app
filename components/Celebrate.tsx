// Confetti burst + Ollie's celebration clip, all on the UI thread.
import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useTheme } from '../lib/theme';

const N = 46;

function Piece({ i, color, w, h }: { i: number; color: string; w: number; h: number }) {
	const p = useSharedValue(0);
	const seed = useMemo(() => ({ angle: (Math.random() * 1.4 - 0.7) * Math.PI, speed: 0.55 + Math.random() * 0.6, spin: (Math.random() - 0.5) * 900, size: 6 + Math.random() * 6, round: Math.random() > 0.6 }), []);
	useEffect(() => {
		p.value = withDelay(i * 6, withTiming(1, { duration: 1500 + Math.random() * 500, easing: Easing.out(Easing.quad) }));
	}, []);
	const a = useAnimatedStyle(() => {
		const dx = Math.sin(seed.angle) * w * 0.55 * seed.speed * p.value;
		const up = -h * 0.55 * seed.speed * p.value;
		const fall = h * 0.9 * p.value * p.value;
		return {
			opacity: 1 - Math.max(0, p.value - 0.75) * 4,
			transform: [{ translateX: dx }, { translateY: up + fall }, { rotate: `${seed.spin * p.value}deg` }]
		};
	});
	return <Animated.View style={[{ position: 'absolute', left: w / 2, top: h * 0.62, width: seed.size, height: seed.size * (seed.round ? 1 : 0.45), borderRadius: seed.round ? seed.size : 1, backgroundColor: color }, a]} />;
}

export function Confetti({ onDone }: { onDone?: () => void }) {
	const t = useTheme();
	const { width, height } = useWindowDimensions();
	const reduced = useReducedMotion();
	const colors = [t.amber, t.hues.sky.base, t.hues.rose.base, t.hues.sage.base, t.hues.lilac.base, t.hues.honey.base];
	useEffect(() => {
		const id = setTimeout(() => onDone?.(), 2300);
		return () => clearTimeout(id);
	}, []);
	if (reduced) return null;
	return (
		<View pointerEvents="none" style={StyleSheet.absoluteFill}>
			{Array.from({ length: N }).map((_, i) => (
				<Piece key={i} i={i} color={colors[i % colors.length]} w={width} h={height} />
			))}
		</View>
	);
}

/** Ollie cheering at the bottom of the screen for a moment. */
export function OllieCheer({ big, onDone }: { big?: boolean; onDone: () => void }) {
	useEffect(() => {
		const id = setTimeout(onDone, 3200);
		return () => clearTimeout(id);
	}, []);
	return (
		<Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(300)} pointerEvents="none" style={{ position: 'absolute', bottom: 90, alignSelf: 'center' }}>
			<Image source={big ? require('../assets/ollie/milestone.webp') : require('../assets/ollie/lesson-done.webp')} style={{ width: big ? 240 : 190, height: big ? 240 : 190 }} contentFit="contain" autoplay />
		</Animated.View>
	);
}
