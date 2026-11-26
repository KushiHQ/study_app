// Interactive 60fps 2D vector Ollie Desk Lottie state machine (800x700):
//   study  — looping: breathing, eyes reading, page turn, sipping steaming coffee
//   tap    — one-shot (2.0s): looks up and waves when tapped, then returns to study
//   leave  — one-shot (5.3s): stretch, headphones off, takes empty mug & walks out (holds empty desk on break)
//   return — one-shot (5.1s): walks back in with fresh steaming coffee, headphones on -> study
import { useEffect, useRef, useState } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import type { FocusPhase } from '../lib/focus';

type DeskClip = 'study' | 'tap' | 'leave' | 'return';

const CLIPS: Record<DeskClip, ReturnType<typeof require>> = {
	study: require('../assets/ollie/lottie/ollie-desk-study.json'),
	tap: require('../assets/ollie/lottie/ollie-desk-tap.json'),
	leave: require('../assets/ollie/lottie/ollie-desk-leave.json'),
	return: require('../assets/ollie/lottie/ollie-desk-return.json')
};

export function OllieDesk({
	phase,
	tapSeq = 0,
	playing = true,
	style
}: {
	phase: FocusPhase;
	/** Increment to trigger Ollie's friendly wave reaction (only while studying at his desk). */
	tapSeq?: number;
	playing?: boolean;
	style?: StyleProp<ViewStyle>;
}) {
	const [clip, setClip] = useState<DeskClip>(phase === 'break' ? 'leave' : 'study');
	const prevPhase = useRef<FocusPhase>(phase);
	const prevTap = useRef<number>(tapSeq);
	const lottieRef = useRef<LottieView>(null);

	// React to Focus <-> Break phase transitions
	useEffect(() => {
		const prev = prevPhase.current;
		prevPhase.current = phase;
		if (prev === phase) return;
		if (phase === 'break') {
			setClip('leave');
		} else if (prev === 'break') {
			setClip('return');
		} else {
			setClip('study');
		}
	}, [phase]);

	// React to user tapping Ollie while he is studying at his desk
	useEffect(() => {
		if (tapSeq === prevTap.current) return;
		prevTap.current = tapSeq;
		if (phase !== 'break' && clip === 'study') {
			setClip('tap');
		}
	}, [tapSeq, phase, clip]);

	// Pause/resume when hidden or reduced-motion
	useEffect(() => {
		if (!lottieRef.current) return;
		if (playing) lottieRef.current.resume();
		else lottieRef.current.pause();
	}, [playing]);

	if (Platform.OS === 'web') {
		return (
			<View style={[{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }, style]}>
				<Image
					source={phase === 'break' ? require('../assets/ollie/thumbs.webp') : require('../assets/ollie/notes.webp')}
					style={{ width: '90%', height: '90%' }}
					contentFit="contain"
					accessible={false}
				/>
			</View>
		);
	}

	const isLoop = clip === 'study';

	return (
		<LottieView
			ref={lottieRef}
			key={clip}
			source={CLIPS[clip]}
			autoPlay={playing}
			loop={isLoop}
			resizeMode="contain"
			style={[{ width: '100%', height: '100%' }, style]}
			onAnimationFinish={(isCancelled) => {
				if (isCancelled) return;
				if (clip === 'tap' || clip === 'return') {
					setClip('study');
				}
				// clip === 'leave' stays parked on its final empty-desk frame during break!
			}}
		/>
	);
}
