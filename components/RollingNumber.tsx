// A number that rolls up from its old value to the new one.
import { useEffect, useState } from 'react';
import { Text, type TextStyle } from 'react-native';
import { Easing, runOnJS, useAnimatedReaction, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

export function RollingNumber({ value, style, duration = 900 }: { value: number; style?: TextStyle; duration?: number }) {
	const reduced = useReducedMotion();
	const v = useSharedValue(0);
	const [shown, setShown] = useState(reduced ? value : 0);
	useEffect(() => {
		if (reduced) return setShown(value);
		v.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
	}, [value]);
	useAnimatedReaction(
		() => Math.round(v.value),
		(n, prev) => {
			if (n !== prev) runOnJS(setShown)(n);
		}
	);
	return <Text style={[style, { fontVariant: ['tabular-nums'] }]}>{shown}</Text>;
}
