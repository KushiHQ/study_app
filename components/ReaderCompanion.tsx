// Bottom-right floating Lesson Reader companion:
// - Focus timer pill stacked above either the interactive 60fps Lottie Ollie desk companion
//   (tap Ollie to make him wave; automatically stretches & leaves for coffee on break, returns on resume)
//   or a sleek circular Music/Focus toggle FAB.
// - Tapping the Focus pill (or the popover controls) opens the dark floating popover with
//   Focus Timer controls, Study Music playback, and the "Show Ollie reading along" switch.
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Headphones, Pause, Play, RotateCcw, SkipForward } from 'lucide-react-native';
import { clockOf, useFocus } from '../lib/focus';
import { useStudyPrefs } from '../lib/prefs';
import { askForNotifications } from '../lib/services';
import { alpha, fonts, radius, useTheme } from '../lib/theme';
import { OllieDesk } from './OllieDesk';
import { Press, ToggleSwitch, hair } from './ui';

const TRACKS = [
	{ title: 'Lofi Focus', artist: 'Marek Zielinski' },
	{ title: 'Beautiful Lofi', artist: 'Marek Zielinski' },
	{ title: 'Lofi Relaxing', artist: 'Marco Conti' },
	{ title: 'Tokyo Lofi', artist: 'Marek Zielinski' },
	{ title: 'Lofi Chill', artist: 'Marek Zielinski' },
	{ title: 'Lofi Beat', artist: 'Marek Zielinski' },
	{ title: 'Lofi Pop', artist: 'Marek Zielinski' },
	{ title: 'Lofi Gaming', artist: 'Marek Zielinski' }
];

const OLLIE_AVATAR = require('../assets/ollie/ollie-focus.png');

export function ReaderCompanion() {
	const t = useTheme();
	const insets = useSafeAreaInsets();
	const reduceMotion = useReducedMotion();
	const f = useFocus();
	const showOllie = useStudyPrefs((s) => s.showOllie);
	const setShowOllie = useStudyPrefs((s) => s.setShowOllie);
	const [open, setOpen] = useState(false);
	const [tapSeq, setTapSeq] = useState(0);

	const idle = f.phase === 'idle';
	const onBreak = f.phase === 'break';
	const running = f.endsAt !== null;
	const track = TRACKS[f.track % TRACKS.length] ?? TRACKS[0];
	const stageBg = t.name === 'night' ? '#121A31' : '#F6F2EA';

	const pokeOllie = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
		setTapSeq((n) => n + 1);
	};

	const toggleTimer = () => {
		if (running) f.pause();
		else {
			f.start();
			if (idle) void askForNotifications();
		}
	};

	const bottomOffset = Math.max(insets.bottom, 16) + 8;

	return (
		<>
			{/* Bottom-right floating stack (kept mounted with opacity to avoid Android ViewGroupDrawingOrder crashes) */}
			<View
				pointerEvents={open ? 'none' : 'box-none'}
				style={{
					position: 'absolute',
					right: 16,
					bottom: bottomOffset,
					alignItems: 'flex-end',
					gap: 8,
					opacity: open ? 0 : 1
				}}
			>
					{/* Focus Timer Pill */}
					<Press
						haptic
						onPress={() => setOpen(true)}
						accessibilityRole="button"
						accessibilityLabel={`Focus timer ${clockOf(f.left)}`}
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							gap: 6,
							paddingHorizontal: 11,
							paddingVertical: 6,
							borderRadius: radius.pill,
							backgroundColor: t.name === 'night' ? 'rgba(12, 18, 35, 0.90)' : t.surface,
							borderWidth: hair,
							borderColor: running || !idle ? alpha(t.amber, 0.48) : t.line2,
							shadowColor: '#000',
							shadowOpacity: t.name === 'night' ? 0.4 : 0.14,
							shadowRadius: 14,
							shadowOffset: { width: 0, height: 6 },
							elevation: 6
						}}
					>
						<View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: onBreak ? t.signal : running ? t.amber : t.muted }} />
						<Text style={{ fontFamily: fonts.mono, fontSize: 11.5, color: running || !idle ? t.accent : t.fg2, fontVariant: ['tabular-nums'] }}>
							{idle ? 'Focus' : clockOf(f.left)}
						</Text>
					</Press>

					{/* Either interactive Lottie Ollie desk card (tap Ollie to wave!) OR compact Music FAB */}
					{showOllie ? (
						<Press
							onPress={pokeOllie}
							onLongPress={() => setOpen(true)}
							accessibilityRole="button"
							accessibilityLabel="Tap Ollie to say hi, or tap Focus pill above for timer and music"
							style={{
								width: 112,
								height: 98,
								borderRadius: 16,
								padding: 4,
								backgroundColor: t.name === 'night' ? 'rgba(12, 18, 35, 0.92)' : t.surface,
								borderWidth: hair,
								borderColor: t.name === 'night' ? 'rgba(210, 224, 255, 0.18)' : t.line2,
								shadowColor: '#000',
								shadowOpacity: t.name === 'night' ? 0.48 : 0.16,
								shadowRadius: 18,
								shadowOffset: { width: 0, height: 8 },
								elevation: 8
							}}
						>
							<View style={{ flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: stageBg }}>
								<OllieDesk phase={f.phase} tapSeq={tapSeq} playing={!reduceMotion && !open} />
								{f.musicOn ? (
									<View
										style={{
											position: 'absolute',
											right: 5,
											bottom: 5,
											paddingHorizontal: 6,
											paddingVertical: 2,
											borderRadius: 999,
											backgroundColor: 'rgba(10, 15, 30, 0.84)',
											borderWidth: hair,
											borderColor: alpha(t.amber, 0.36)
										}}
									>
										<Text style={{ fontFamily: fonts.mono, fontSize: 8.5, color: t.amber }}>♫ LO-FI</Text>
									</View>
								) : null}
							</View>
						</Press>
					) : (
						<Press
							haptic
							onPress={() => setOpen(true)}
							accessibilityRole="button"
							accessibilityLabel="Open Study music and Focus controls"
							style={{
								width: 50,
								height: 50,
								borderRadius: 25,
								alignItems: 'center',
								justifyContent: 'center',
								backgroundColor: t.name === 'night' ? 'rgba(12, 18, 35, 0.92)' : t.surface,
								borderWidth: hair,
								borderColor: f.musicOn ? alpha(t.amber, 0.5) : t.line2,
								shadowColor: '#000',
								shadowOpacity: t.name === 'night' ? 0.45 : 0.15,
								shadowRadius: 16,
								shadowOffset: { width: 0, height: 6 },
								elevation: 7
							}}
						>
							<Headphones size={21} color={f.musicOn ? t.amber : t.fg} />
						</Press>
					)}
				</View>

			{/* Floating Popover Window */}
			<Modal transparent visible={open} animationType="none" onRequestClose={() => setOpen(false)}>
				<Pressable
					style={{ flex: 1, backgroundColor: 'rgba(5, 8, 18, 0.42)', justifyContent: 'flex-end', alignItems: 'flex-end', paddingRight: 16, paddingBottom: bottomOffset }}
					onPress={() => setOpen(false)}
				>
					<Animated.View entering={FadeIn.duration(160)} style={{ alignItems: 'flex-end', gap: 12 }}>
						<Pressable
							onPress={(e) => e.stopPropagation()}
							style={{
								width: 292,
								borderRadius: 20,
								padding: 14,
								gap: 14,
								backgroundColor: t.name === 'night' ? '#0E1529' : t.surface,
								borderWidth: hair,
								borderColor: t.name === 'night' ? 'rgba(210, 224, 255, 0.16)' : t.line2,
								shadowColor: '#000',
								shadowOpacity: t.name === 'night' ? 0.55 : 0.18,
								shadowRadius: 26,
								shadowOffset: { width: 0, height: 12 },
								elevation: 12
							}}
						>
							{/* Interactive Lottie Ollie Desk Stage (tap Ollie to wave!) */}
							<Press
								onPress={pokeOllie}
								accessibilityRole="button"
								accessibilityLabel="Tap Ollie to say hi"
								style={{
									width: '100%',
									aspectRatio: 8 / 7,
									maxHeight: 196,
									borderRadius: 14,
									overflow: 'hidden',
									backgroundColor: stageBg,
									borderWidth: hair,
									borderColor: t.name === 'night' ? 'rgba(255, 255, 255, 0.08)' : t.line
								}}
							>
								<OllieDesk phase={f.phase} tapSeq={tapSeq} playing={!reduceMotion && open} />
							</Press>

							{/* Focus Timer Row */}
							<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
								<View style={{ gap: 2 }}>
									<Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.1, color: t.muted }}>
										{onBreak ? 'BREAK TIMER' : 'FOCUS TIMER'}
									</Text>
									<Text style={{ fontFamily: fonts.mono, fontSize: 23, color: onBreak ? t.signal : t.amber, fontVariant: ['tabular-nums'] }}>
										{clockOf(f.left)}
									</Text>
								</View>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
									{!idle ? (
										<Press
											haptic
											onPress={f.reset}
											accessibilityLabel="Reset focus timer"
											style={{
												width: 34,
												height: 34,
												borderRadius: 17,
												alignItems: 'center',
												justifyContent: 'center',
												backgroundColor: t.surface2,
												borderWidth: hair,
												borderColor: t.line2
											}}
										>
											<RotateCcw size={14} color={t.muted} />
										</Press>
									) : null}
									<Press
										haptic
										onPress={toggleTimer}
										accessibilityRole="button"
										style={{
											height: 34,
											paddingHorizontal: 16,
											borderRadius: 999,
											alignItems: 'center',
											justifyContent: 'center',
											backgroundColor: t.amber
										}}
									>
										<Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: t.onAmber }}>
											{idle ? 'Start' : running ? 'Pause' : 'Resume'}
										</Text>
									</Press>
								</View>
							</View>

							<View style={{ height: hair, backgroundColor: t.line }} />

							{/* Study Music Row */}
							<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
								<View style={{ flex: 1, gap: 2 }}>
									<Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.1, color: t.muted }}>STUDY MUSIC</Text>
									<Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: t.fg }}>
										{track.title}
									</Text>
								</View>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
									<Press
										haptic
										onPress={() => {
											if (!f.musicOn && idle) f.start();
											f.toggleMusic();
										}}
										accessibilityLabel={f.musicOn ? 'Pause music' : 'Play music'}
										style={{
											width: 34,
											height: 34,
											borderRadius: 17,
											alignItems: 'center',
											justifyContent: 'center',
											backgroundColor: f.musicOn ? alpha(t.amber, 0.16) : t.surface2,
											borderWidth: hair,
											borderColor: f.musicOn ? alpha(t.amber, 0.42) : t.line2
										}}
									>
										{f.musicOn ? <Pause size={15} color={t.amber} /> : <Play size={15} color={t.fg} />}
									</Press>
									<Press
										haptic
										onPress={() => f.nextTrack(TRACKS.length)}
										accessibilityLabel="Next track"
										style={{
											width: 34,
											height: 34,
											borderRadius: 17,
											alignItems: 'center',
											justifyContent: 'center',
											backgroundColor: t.surface2,
											borderWidth: hair,
											borderColor: t.line2
										}}
									>
										<SkipForward size={15} color={t.fg2} />
									</Press>
								</View>
							</View>

							<View style={{ height: hair, backgroundColor: t.line }} />

							{/* Show Ollie Reading Along Toggle */}
							<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
									<Image source={OLLIE_AVATAR} contentFit="contain" style={{ width: 22, height: 22 }} />
									<Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: t.fg2 }}>Show Ollie reading along</Text>
								</View>
								<ToggleSwitch value={showOllie} onChange={setShowOllie} />
							</View>
						</Pressable>

						{/* Bottom-right Close/Ollie FAB */}
						<Press
							haptic
							onPress={() => setOpen(false)}
							accessibilityLabel="Close Focus and Music panel"
							style={{
								width: 50,
								height: 50,
								borderRadius: 25,
								alignItems: 'center',
								justifyContent: 'center',
								backgroundColor: t.name === 'night' ? '#0E1529' : t.surface,
								borderWidth: hair,
								borderColor: alpha(t.amber, 0.5)
							}}
						>
							<Image source={OLLIE_AVATAR} contentFit="contain" style={{ width: 34, height: 34 }} />
						</Press>
					</Animated.View>
				</Pressable>
			</Modal>
		</>
	);
}
