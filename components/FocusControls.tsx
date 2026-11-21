import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ChevronDown, ChevronUp, Headphones } from 'lucide-react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { WEB_URL } from '../lib/api/client';
import { clockOf, useFocus } from '../lib/focus';
import { askForNotifications } from '../lib/services';
import { fonts, radius, useTheme } from '../lib/theme';
import { Button, Press, T, hair } from './ui';

const TRACKS = [
	{ title: 'Lofi Focus', artist: 'Marek Zielinski', file: 'lofi-focus-606303.mp3' },
	{ title: 'Beautiful Lofi', artist: 'Marek Zielinski', file: 'beautiful-lofi-603162.mp3' },
	{ title: 'Lofi Relaxing', artist: 'Marco Conti', file: 'lofi-relaxing-598427.mp3' },
	{ title: 'Tokyo Lofi', artist: 'Marek Zielinski', file: 'tokyo-lofi-604786.mp3' },
	{ title: 'Lofi Chill', artist: 'Marek Zielinski', file: 'lofi-chill-612445.mp3' },
	{ title: 'Lofi Beat', artist: 'Marek Zielinski', file: 'lofi-beat-613823.mp3' },
	{ title: 'Lofi Pop', artist: 'Marek Zielinski', file: 'lofi-pop-611108.mp3' },
	{ title: 'Lofi Gaming', artist: 'Marek Zielinski', file: 'lofi-gaming-606302.mp3' }
];

const READING_SCENE = require('../assets/ollie/scene-reading.mp4');
const BREAK_SCENE = require('../assets/ollie/scene-break.mp4');
const READING_POSE = require('../assets/ollie/notes.webp');
const BREAK_POSE = require('../assets/ollie/thumbs.webp');

export function FocusSession() {
	const running = useFocus((s) => s.endsAt !== null);
	const musicOn = useFocus((s) => s.musicOn);
	useEffect(() => {
		if (!running) return;
		useFocus.getState().tick();
		const timer = setInterval(() => useFocus.getState().tick(), 500);
		return () => clearInterval(timer);
	}, [running]);
	return running && musicOn ? <FocusAudio /> : null;
}

function FocusAudio() {
	const track = useFocus((s) => s.track);
	const player = useAudioPlayer(null);
	const status = useAudioPlayerStatus(player);
	useEffect(() => {
		let active = true;
		const start = async () => {
			await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' });
			if (!active) return;
			player.replace(`${WEB_URL}/music/${TRACKS[track].file}`);
			player.play();
		};
		void start().catch(() => {});
		return () => { active = false; };
	}, [player, track]);
	useEffect(() => {
		if (status.didJustFinish) useFocus.getState().nextTrack(TRACKS.length);
	}, [status.didJustFinish]);
	return null;
}

export function FocusControls() {
	const t = useTheme();
	const f = useFocus();
	const [open, setOpen] = useState(false);
	const [visible, setVisible] = useState(false);
	const reduceMotion = useReducedMotion();
	useFocusEffect(useCallback(() => {
		setVisible(true);
		return () => setVisible(false);
	}, []));
	const idle = f.phase === 'idle';
	const onBreak = f.phase === 'break';
	const running = f.endsAt !== null;
	const label = idle ? 'Focus timer' : onBreak ? (running ? 'Break' : 'Break paused') : running ? 'Focusing' : 'Focus paused';
	const scene = running && visible && !reduceMotion ? (onBreak ? BREAK_SCENE : READING_SCENE) : null;
	const Chevron = open ? ChevronUp : ChevronDown;
	return (
		<View style={{ borderTopWidth: hair, borderColor: t.line, paddingHorizontal: 20 }}>
			<Press accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 }}>
				<View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ width: open ? 112 : 57, height: open ? 66 : 36, overflow: 'hidden', borderRadius: radius.sm, backgroundColor: onBreak ? t.signalSoft : t.accentSoft }}>
					{scene !== null ? <OllieScene key={scene} source={scene} poster={onBreak ? BREAK_POSE : READING_POSE} /> : <OlliePoster source={onBreak ? BREAK_POSE : READING_POSE} />}
				</View>
				<T v="bodyStrong" style={{ flex: 1 }}>{label}</T>
				<Text style={{ color: onBreak ? t.signal : running ? t.accent : t.fg2, fontFamily: fonts.mono, fontVariant: ['tabular-nums'] }} accessibilityRole="timer">{clockOf(f.left)}</Text>
				<Chevron size={16} color={t.muted} />
			</Press>
			{open ? (
				<View style={{ paddingBottom: 14, gap: 10 }}>
					{f.note ? <T v="small">{f.note}</T> : idle ? <T v="small">Read for 25 minutes, then take a 5-minute break.</T> : null}
					<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
						<Button small title={idle ? 'Start focus' : running ? 'Pause' : 'Resume'} onPress={() => {
							if (running) f.pause();
							else {
								f.start();
								if (idle) {
									void askForNotifications();
									setOpen(false);
								}
							}
						}} />
						{!idle ? <Button small kind="ghost" title={f.phase === 'break' ? 'End break' : 'Take a break'} onPress={f.skip} /> : null}
						{!idle ? <Button small kind="ghost" title="End session" onPress={f.reset} /> : null}
					</View>
					<Press accessibilityRole="switch" accessibilityState={{ checked: f.musicOn }} onPress={f.toggleMusic} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
						<Headphones size={16} color={t.accent} />
						<T v="bodyStrong">Study music</T>
						<T v="small">{f.musicOn ? 'On' : 'Off'}</T>
					</Press>
					{f.musicOn ? (
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
							<T v="small" onPress={() => void Linking.openURL('https://pixabay.com/music/').catch(() => {})}>{TRACKS[f.track].title} · {TRACKS[f.track].artist} · Pixabay</T>
							<Button small kind="ghost" title="Next track" onPress={() => f.nextTrack(TRACKS.length)} />
						</View>
					) : null}
				</View>
			) : null}
		</View>
	);
}

function OlliePoster({ source }: { source: number }) {
	return <Image source={source} autoplay={false} accessible={false} contentFit="contain" style={[StyleSheet.absoluteFillObject, { margin: 2 }]} />;
}

function OllieScene({ source, poster }: { source: number; poster: number }) {
	const [hasFrame, setHasFrame] = useState(false);
	const player = useVideoPlayer(source, (video) => {
		video.muted = true;
		video.loop = true;
		video.audioMixingMode = 'mixWithOthers';
	});
	useEffect(() => {
		player.play();
	}, [player]);
	return (
		<>
			<VideoView player={player} style={{ width: '100%', height: '100%' }} nativeControls={false} contentFit="cover" surfaceType="textureView" playsInline onFirstFrameRender={() => setHasFrame(true)} />
			{!hasFrame ? <OlliePoster source={poster} /> : null}
		</>
	);
}
