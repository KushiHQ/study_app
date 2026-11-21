import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { runOnJS, useAnimatedReaction, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';

export type PlaybackViewport = { scrollY: SharedValue<number>; height: SharedValue<number> };

export function VisiblePlayback({ viewport, contentTop, diagram, children }: {
	viewport: PlaybackViewport;
	contentTop: SharedValue<number | null>;
	diagram: boolean;
	children: (autoplay: boolean) => ReactNode;
}) {
	const { scrollY, height } = viewport;
	const reduceMotion = useReducedMotion();
	const [autoplay, setAutoplay] = useState(false);
	const target = useRef<View>(null);
	const layout = useSharedValue({ y: 0, height: 0 });
	const visibleFraction = diagram ? 0.3 : 0.4;
	const viewportFraction = diagram ? 0.8 : 0.75;
	const web = Platform.OS === 'web';

	useEffect(() => {
		if (!web || reduceMotion || !target.current || typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(([entry]) => {
			if (!entry?.isIntersecting || entry.intersectionRatio < visibleFraction) return;
			observer.disconnect();
			setAutoplay(true);
		}, { rootMargin: `0px 0px -${diagram ? 20 : 25}% 0px`, threshold: visibleFraction });
		observer.observe(target.current as unknown as Element);
		return () => observer.disconnect();
	}, [web, diagram, reduceMotion, visibleFraction]);

	useAnimatedReaction(
		() => {
			if (web || autoplay || reduceMotion) return false;
			const block = layout.get();
			const visibleHeight = height.get() * viewportFraction;
			const origin = contentTop.get();
			if (origin === null || !block.height || !visibleHeight) return false;
			const top = block.y + origin;
			const screenTop = scrollY.get();
			const overlap = Math.min(top + block.height, screenTop + visibleHeight) - Math.max(top, screenTop);
			return overlap >= Math.min(block.height, visibleHeight) * visibleFraction;
		},
		(visible, previous) => {
			if (visible && !previous) runOnJS(setAutoplay)(true);
		}
	);

	return (
		<View ref={target} onLayout={({ nativeEvent }) => layout.set({ y: nativeEvent.layout.y, height: nativeEvent.layout.height })}>
			{children(autoplay)}
		</View>
	);
}
