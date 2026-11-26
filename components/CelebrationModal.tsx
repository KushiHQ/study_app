// Escalating milestone celebration modal with 2-beat Duolingo-grade choreography:
//   Beat 1 (Hero Moment): Large container-free Ollie animates dead-center on canvas + chime & haptics.
//   Beat 2 (Settle & Reveal): Ollie smoothly glides up & scales down slightly as headline, stats & CTAs reveal in.
// Uses safe Reanimated transform/opacity shared values only (zero exiting/layout/zIndex) for 100% Android stability.
import { useEffect, useRef } from 'react';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArrowRight, Award, Check, Sparkles, Trophy, X } from 'lucide-react-native';
import { useStudyPrefs } from '../lib/prefs';
import { alpha, fonts, mix, radius, useTheme } from '../lib/theme';
import { OllieLottie } from './OllieLottie';
import { Button, Card, Eyebrow, Meter, Press, T, TopGlow, hair } from './ui';

export type MilestoneTier = 'lesson' | 'unit' | 'course';

export type MilestonePayload = {
	tier: MilestoneTier;
	courseCode: string;
	courseTitle: string;
	lessonTitle?: string;
	unitNumber?: number;
	unitTitle?: string;
	unitDone?: number;
	unitTotal?: number;
	courseDone?: number;
	courseTotal?: number;
	primaryLabel: string;
	onPrimary: () => void;
	secondaryLabel?: string;
	onSecondary?: () => void;
};

const CHIMES: Record<MilestoneTier, ReturnType<typeof require>> = {
	lesson: require('../assets/sounds/chime-lesson.mp3'),
	unit: require('../assets/sounds/chime-unit.mp3'),
	course: require('../assets/sounds/chime-course.mp3')
};

// Duration Ollie owns center-stage before gliding up & revealing the cards
const SOLO_MS: Record<MilestoneTier, number> = {
	lesson: 1350,
	unit: 1650,
	course: 1950
};

export function CelebrationModal({
	milestone,
	onClose
}: {
	milestone: MilestonePayload | null;
	onClose: () => void;
}) {
	const t = useTheme();
	const insets = useSafeAreaInsets();
	const { height: winH } = useWindowDimensions();
	const sounds = useStudyPrefs((s) => s.sounds);

	const centerOffsetY = Math.min(180, Math.max(100, Math.round(winH * 0.2)));
	const ollieScale = useSharedValue(1.3);
	const ollieY = useSharedValue(centerOffsetY);
	const contentOpacity = useSharedValue(0);
	const contentY = useSharedValue(28);
	const settledRef = useRef(false);

	const settleNow = () => {
		if (settledRef.current) return;
		settledRef.current = true;
		ollieScale.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) });
		ollieY.value = withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) });
		contentOpacity.value = withDelay(90, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
		contentY.value = withDelay(90, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));
	};

	useEffect(() => {
		if (!milestone) return;
		settledRef.current = false;

		// Beat 1: Ollie pops in LARGE & dead-center on canvas, zero container
		ollieScale.value = 0.85;
		ollieY.value = centerOffsetY;
		contentOpacity.value = 0;
		contentY.value = 28;
		ollieScale.value = withSpring(1.28, { damping: 12, stiffness: 165 });

		// Beat 2: After Ollie's solo celebration, glide up & shrink slightly while content reveals
		const settleTimer = setTimeout(settleNow, SOLO_MS[milestone.tier]);

		if (!sounds) {
			return () => clearTimeout(settleTimer);
		}

		// Play escalating milestone chime via expo-audio
		let player: ReturnType<typeof createAudioPlayer> | null = null;
		let releaseTimer: ReturnType<typeof setTimeout> | null = null;
		try {
			player = createAudioPlayer(CHIMES[milestone.tier]);
			player.volume = 0.85;
			player.play();
			releaseTimer = setTimeout(() => {
				try {
					player?.remove();
				} catch {}
				player = null;
			}, 2600);
		} catch {}

		// 3-tier escalating haptic celebration
		const timers: ReturnType<typeof setTimeout>[] = [];
		if (milestone.tier === 'lesson') {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
		} else if (milestone.tier === 'unit') {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
			timers.push(setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}), 140));
		} else {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
			timers.push(setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 130));
			timers.push(setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}), 280));
		}

		return () => {
			clearTimeout(settleTimer);
			timers.forEach(clearTimeout);
			if (releaseTimer) clearTimeout(releaseTimer);
			try {
				player?.remove();
			} catch {}
		};
	}, [milestone, sounds, centerOffsetY, ollieScale, ollieY, contentOpacity, contentY]);

	const ollieAnimStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: ollieY.value }, { scale: ollieScale.value }]
	}));

	const contentAnimStyle = useAnimatedStyle(() => ({
		opacity: contentOpacity.value,
		transform: [{ translateY: contentY.value }]
	}));

	if (!milestone) return null;

	const isCourse = milestone.tier === 'course';
	const isUnit = milestone.tier === 'unit';
	const glowColor = isCourse ? t.amber : isUnit ? t.amber : t.success;
	const glowStrength = isCourse ? (t.name === 'night' ? 0.26 : 0.14) : isUnit ? (t.name === 'night' ? 0.2 : 0.1) : (t.name === 'night' ? 0.16 : 0.08);
	const accentColor = isCourse || isUnit ? t.amber : t.success;
	const eyebrowText = isCourse
		? `${milestone.courseCode} · COURSE COMPLETE`
		: isUnit
			? `${milestone.courseCode} · UNIT ${String(milestone.unitNumber ?? 1).padStart(2, '0')} COMPLETE`
			: `${milestone.courseCode} · LESSON COMPLETE`;

	const headline = isCourse
		? 'Course mastered.'
		: isUnit
			? `Unit ${milestone.unitNumber ?? 1} locked in.`
			: 'Nice work.';

	const subtitle = isCourse
		? `You completed every lesson in ${milestone.courseTitle}. Ready for exam day.`
		: isUnit
			? `You finished all ${milestone.unitTotal ?? ''} lessons in ${milestone.unitTitle ?? 'this unit'}. Lock it in with the unit quiz.`
			: milestone.lessonTitle
				? `You finished "${milestone.lessonTitle}". Keep the momentum going.`
				: 'Another concept locked into memory.';

	const unitRatio = milestone.unitTotal ? (milestone.unitDone ?? 0) / milestone.unitTotal : 1;
	const courseRatio = milestone.courseTotal ? (milestone.courseDone ?? 0) / milestone.courseTotal : 1;
	// Settled resting size (starts at 1.28x of this during Beat 1!)
	const lottieSize = isCourse ? 248 : isUnit ? 236 : 224;

	return (
		<Modal visible transparent={false} animationType="fade" onRequestClose={onClose}>
			<Pressable onPress={settleNow} style={{ flex: 1, backgroundColor: t.bg }}>
				<TopGlow color={glowColor} height={isCourse ? 390 : 330} strength={glowStrength} />

				{/* Top Close Pill */}
				<View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'flex-end' }}>
					<Press
						haptic
						onPress={onClose}
						accessibilityRole="button"
						accessibilityLabel="Close celebration"
						style={{
							width: 38,
							height: 38,
							borderRadius: 19,
							alignItems: 'center',
							justifyContent: 'center',
							backgroundColor: t.name === 'night' ? 'rgba(19, 27, 50, 0.78)' : alpha(t.surface, 0.9),
							borderWidth: hair,
							borderColor: t.line2
						}}
					>
						<X size={18} color={t.fg2} />
					</Press>
				</View>

				<ScrollView
					contentContainerStyle={{
						flexGrow: 1,
						justifyContent: 'center',
						alignItems: 'center',
						paddingHorizontal: 24,
						paddingTop: 4,
						paddingBottom: insets.bottom + 28,
						gap: 16,
						maxWidth: 520,
						width: '100%',
						alignSelf: 'center'
					}}
				>
					{/* Container-Free Animated 2D Lottie Ollie */}
					<Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, ollieAnimStyle]}>
						<OllieLottie variant={milestone.tier} size={lottieSize} loop autoPlay />
					</Animated.View>

					{/* Beat 2: Milestone Badge, Headline, Progress Card & Actions */}
					<Animated.View style={[{ alignSelf: 'stretch', alignItems: 'center', gap: 18 }, contentAnimStyle]}>
						<View
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								gap: 5,
								paddingHorizontal: 12,
								paddingVertical: 5,
								borderRadius: radius.pill,
								backgroundColor: isCourse ? t.amber : isUnit ? mix(t.amber, 22, t.surface) : t.successSoft,
								borderWidth: hair,
								borderColor: isCourse ? t.amber : alpha(accentColor, 0.5)
							}}
						>
							{isCourse ? (
								<Trophy size={13} color={t.onAmber} />
							) : isUnit ? (
								<Award size={13} color={t.accent} />
							) : (
								<Check size={13} color={t.success} strokeWidth={2.6} />
							)}
							<Text
								style={{
									fontFamily: fonts.mono,
									fontSize: 10,
									letterSpacing: 1.2,
									textTransform: 'uppercase',
									color: isCourse ? t.onAmber : isUnit ? t.accent : t.success
								}}
							>
								{isCourse ? '100% MASTERED' : isUnit ? 'UNIT MILESTONE' : 'COMPLETED'}
							</Text>
						</View>

						<View style={{ alignItems: 'center', gap: 8 }}>
							<Eyebrow color={isCourse || isUnit ? t.accent : t.success}>{eyebrowText}</Eyebrow>
							<Text
								accessibilityRole="header"
								style={{
									fontFamily: fonts.display,
									fontSize: isCourse ? 28 : 25,
									lineHeight: isCourse ? 36 : 32,
									letterSpacing: -0.9,
									color: t.fg,
									textAlign: 'center'
								}}
							>
								{headline}
							</Text>
							<T style={{ textAlign: 'center', maxWidth: 340 }}>{subtitle}</T>
						</View>

						<Card
							tint={accentColor}
							tintStrength={t.name === 'night' ? 12 : 8}
							style={{ alignSelf: 'stretch', borderRadius: 22, padding: 18, gap: 14 }}
						>
							{isCourse ? (
								<View style={{ flexDirection: 'row', gap: 10 }}>
									<StatTile label="Lessons" value={`${milestone.courseDone ?? 0}/${milestone.courseTotal ?? 0}`} color={t.amber} />
									<StatTile label="Covered" value="100%" color={t.success} />
								</View>
							) : (
								<>
									<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
											<Sparkles size={14} color={accentColor} />
											<Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, color: t.muted, textTransform: 'uppercase' }}>
												{isUnit ? 'Course progress' : `Unit ${milestone.unitNumber ?? 1} progress`}
											</Text>
										</View>
										<Text style={{ fontFamily: fonts.mono, fontSize: 12, color: accentColor }}>
											{isUnit
												? `${milestone.courseDone ?? 0} / ${milestone.courseTotal ?? 0} lessons`
												: `${milestone.unitDone ?? 0} / ${milestone.unitTotal ?? 0} lessons`}
										</Text>
									</View>
									<Meter value={isUnit ? courseRatio : unitRatio} color={accentColor} height={8} />
								</>
							)}
						</Card>

						<View style={{ alignSelf: 'stretch', gap: 10, marginTop: 2 }}>
							<Button
								title={milestone.primaryLabel}
								icon={<ArrowRight size={17} color={t.onAmber} />}
								onPress={() => {
									onClose();
									milestone.onPrimary();
								}}
								style={{ borderRadius: 16 }}
							/>
							{milestone.secondaryLabel && milestone.onSecondary ? (
								<Button
									kind="solid"
									title={milestone.secondaryLabel}
									onPress={() => {
										onClose();
										milestone.onSecondary!();
									}}
									style={{ borderRadius: 16 }}
								/>
							) : null}
						</View>
					</Animated.View>
				</ScrollView>
			</Pressable>
		</Modal>
	);
}

function StatTile({ label, value, color }: { label: string; value: string; color: string }) {
	const t = useTheme();
	return (
		<View
			style={{
				flex: 1,
				padding: 14,
				borderRadius: 16,
				backgroundColor: t.name === 'night' ? alpha(t.bg, 0.55) : t.surface2,
				borderWidth: hair,
				borderColor: t.line,
				alignItems: 'center',
				gap: 4
			}}
		>
			<Text style={{ fontFamily: fonts.display, fontSize: 22, color }}>{value}</Text>
			<Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.1, textTransform: 'uppercase', color: t.muted }}>{label}</Text>
		</View>
	);
}
