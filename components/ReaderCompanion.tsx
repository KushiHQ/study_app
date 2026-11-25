// Bottom-right floating Lesson Reader companion:
// - Focus timer pill stacked above either the compact 16:9 looping Ollie video
//   (scene-reading.mp4 / scene-break.mp4) or a sleek circular Music/Ollie toggle FAB.
// - Tapping opens a clean dark floating popover with the 16:9 Ollie video player,
//   Focus Timer controls, Study Music playback, and the "Show Ollie reading along" switch.
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Headphones, Pause, Play, RotateCcw, SkipForward } from 'lucide-react-native';
import { clockOf, useFocus } from '../lib/focus';
import { useStudyPrefs } from '../lib/prefs';
import { askForNotifications } from '../lib/services';
import { alpha, fonts, radius, useTheme } from '../lib/theme';
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

const READING_SCENE = require('../assets/ollie/scene-reading.mp4');
const BREAK_SCENE = require('../assets/ollie/scene-break.mp4');
const OLLIE_AVATAR = require('../assets/ollie/ollie-focus.png');
const READING_POSE = require('../assets/ollie/notes.webp');
const BREAK_POSE = require('../assets/ollie/thumbs.webp');

export function ReaderCompanion() {
	const t = useTheme();
	const insets = useSafeAreaInsets();
	const reduceMotion = useReducedMotion();
	const f = useFocus();
	const showOllie = useStudyPrefs((s) => s.showOllie);
	const setShowOllie = useStudyPrefs((s) => s.setShowOllie);
	const [open, setOpen] = useState(false);

	const idle = f.phase === 'idle';
	const onBreak = f.phase === 'break';
	const running = f.endsAt !== null;
	const track = TRACKS[f.track % TRACKS.length] ?? TRACKS[0];
	const scene = onBreak ? BREAK_SCENE : READING_SCENE;
	const poster = onBreak ? BREAK_POSE : READING_POSE;
	const playVideo = !reduceMotion && (running || f.musicOn || open);

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

					{/* Either compact 16:9 looping Ollie video card OR compact Music FAB */}
					{showOllie ? (
						<Press
							haptic
							onPress={() => setOpen(true)}
							accessibilityRole="button"
							accessibilityLabel="Open Focus timer and Study music"
							style={{
								width: 144,
								height: 84,
								borderRadius: 15,
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
							<View style={{ flex: 1, borderRadius: 11, overflow: 'hidden', backgroundColor: '#221a14' }}>
								<OllieVideo source={scene} poster={poster} playing={playVideo} />
								{f.musicOn ? (
									<View
										style={{
											position: 'absolute',
											right: 6,
											bottom: 6,
											paddingHorizontal: 7,
											paddingVertical: 2.5,
											borderRadius: 999,
											backgroundColor: 'rgba(10, 15, 30, 0.84)',
											borderWidth: hair,
											borderColor: alpha(t.amber, 0.36)
										}}
									>
										<Text style={{ fontFamily: fonts.mono, fontSize: 9, color: t.amber }}>♫ LO-FI</Text>
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
							{/* 16:9 Looping Ollie Video Player */}
							<View
								style={{
									width: '100%',
									aspectRatio: 16 / 9,
									borderRadius: 13,
									overflow: 'hidden',
									backgroundColor: '#221a14',
									borderWidth: hair,
									borderColor: t.name === 'night' ? 'rgba(255, 255, 255, 0.08)' : t.line
								}}
							>
								<OllieVideo source={scene} poster={poster} playing={playVideo} />
							</View>

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

function OllieVideo({ source, poster, playing }: { source: number; poster: number; playing: boolean }) {
	const [hasFrame, setHasFrame] = useState(false);
	const player = useVideoPlayer(source, (video) => {
		video.muted = true;
		video.loop = true;
		video.audioMixingMode = 'mixWithOthers';
	});
	useEffect(() => {
		if (playing) player.play();
		else player.pause();
	}, [player, playing]);
	return (
		<>
			<VideoView
				player={player}
				style={{ width: '100%', height: '100%' }}
				nativeControls={false}
				contentFit="cover"
				surfaceType="textureView"
				playsInline
				onFirstFrameRender={() => setHasFrame(true)}
			/>
			{!hasFrame ? <Image source={poster} autoplay={false} contentFit="cover" style={StyleSheet.absoluteFillObject} /> : null}
		</>
	);
}
