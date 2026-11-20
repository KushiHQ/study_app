// Focus mode: Ollie's scene loops behind a big timer ring, with study music.
// Scenes and music stream from the website (study.kushi.ng), never bundled.
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Music, Pause, Play, RotateCcw, SkipForward, X } from 'lucide-react-native';
import { WEB_URL } from '../lib/api/client';
import { clockOf, ollieOf, totalOf, useFocus } from '../lib/focus';
import { askForNotifications } from '../lib/services';
import { fonts, radius, useTheme } from '../lib/theme';
import { Ring } from './Ring';
import { Press } from './ui';

const TRACKS = [
	{ id: '606303', title: 'Lofi Focus', artist: 'Marek Zielinski', file: 'lofi-focus-606303.mp3' },
	{ id: '603162', title: 'Beautiful Lofi', artist: 'Marek Zielinski', file: 'beautiful-lofi-603162.mp3' },
	{ id: '598427', title: 'Lofi Relaxing', artist: 'Marco Conti', file: 'lofi-relaxing-598427.mp3' },
	{ id: '604786', title: 'Tokyo Lofi', artist: 'Marek Zielinski', file: 'tokyo-lofi-604786.mp3' },
	{ id: '612445', title: 'Lofi Chill', artist: 'Marek Zielinski', file: 'lofi-chill-612445.mp3' },
	{ id: '613823', title: 'Lofi Beat', artist: 'Marek Zielinski', file: 'lofi-beat-613823.mp3' },
	{ id: '611108', title: 'Lofi Pop', artist: 'Marek Zielinski', file: 'lofi-pop-611108.mp3' },
	{ id: '606302', title: 'Lofi Gaming', artist: 'Marek Zielinski', file: 'lofi-gaming-606302.mp3' }
];
const trackUrl = (i: number) => `${WEB_URL}/music/${TRACKS[i].file}`;
const sceneUrl = (s: string) => `${WEB_URL}/ollie/scene-${s}.mp4`;

export function FocusView({ onClose }: { onClose?: () => void }) {
	const t = useTheme();
	const insets = useSafeAreaInsets();
	const f = useFocus();
	const running = !!f.endsAt;
	const brk = f.phase === 'break';
	const ollie = ollieOf(f);
	const scene = brk ? 'break' : ollie === 'deep' ? 'map' : 'reading';
	const color = brk ? t.signal : t.amber;

	useEffect(() => {
		const id = setInterval(() => useFocus.getState().tick(), 500);
		return () => clearInterval(id);
	}, []);
	useEffect(() => {
		if (Platform.OS === 'web') return;
		if (running) activateKeepAwakeAsync('focus').catch(() => {});
		else deactivateKeepAwake('focus').catch(() => {});
		return () => {
			deactivateKeepAwake('focus').catch(() => {});
		};
	}, [running]);

	// ---- music
	const [musicOn, setMusicOn] = useState(false);
	const [track, setTrack] = useState(() => Math.floor(Math.random() * TRACKS.length));
	const audio = useAudioPlayer(trackUrl(track));
	const status = useAudioPlayerStatus(audio);
	useEffect(() => {
		setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
	}, []);
	useEffect(() => {
		if (status.didJustFinish) setTrack((i) => (i + 1) % TRACKS.length);
	}, [status.didJustFinish]);
	const first = useRef(true);
	useEffect(() => {
		if (first.current) {
			first.current = false;
			return;
		}
		audio.replace(trackUrl(track));
		if (musicOn) audio.play();
	}, [track]);
	useEffect(() => {
		if (musicOn && running) audio.play();
		else audio.pause();
	}, [musicOn, running]);

	const start = () => {
		f.start();
		askForNotifications();
	};

	// breathing pulse on the ring while running
	const pulse = useSharedValue(1);
	useEffect(() => {
		pulse.value = running ? withRepeat(withSequence(withTiming(1.025, { duration: 1800 }), withTiming(1, { duration: 1800 })), -1) : withTiming(1);
	}, [running]);
	const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

	return (
		<View style={{ flex: 1, backgroundColor: '#0a0f1e' }}>
			<Animated.View key={scene} entering={FadeIn.duration(900)} exiting={FadeOut.duration(900)} style={{ position: 'absolute', inset: 0 }}>
				<Scene src={sceneUrl(scene)} />
			</Animated.View>
			<View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(10,15,30,0.45)' }} />

			<View style={{ flex: 1, paddingTop: insets.top + 10, paddingBottom: insets.bottom + (onClose ? 24 : 100), paddingHorizontal: 22 }}>
				<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 }}>
					<Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.4, color: 'rgba(255,255,255,0.75)' }}>
						{f.rounds ? `${f.rounds} ROUND${f.rounds === 1 ? '' : 'S'} DONE` : 'FOCUS MODE'}
					</Text>
					{onClose ? (
						<Press onPress={onClose} hitSlop={12} accessibilityLabel="Leave focus mode" style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' }}>
							<X size={20} color="#fff" />
						</Press>
					) : null}
				</View>

				<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
					<Animated.View style={pulseStyle}>
						<Ring value={f.phase === 'idle' ? 0 : 1 - f.left / totalOf(f.phase)} size={250} stroke={10} color={color} track="rgba(255,255,255,0.18)" duration={600}>
							<Text style={{ fontFamily: fonts.display, fontSize: 58, letterSpacing: -2, color: '#fff', fontVariant: ['tabular-nums'] }} accessibilityRole="timer">
								{clockOf(f.left)}
							</Text>
							<Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
								{f.phase === 'idle' ? '25 minutes of focus' : brk ? 'Break: stretch, drink water' : running ? 'Focus' : 'Paused'}
							</Text>
						</Ring>
					</Animated.View>
					{f.note ? (
						<Animated.View entering={FadeIn} style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.md, padding: 14, maxWidth: 320 }}>
							<Text style={{ fontFamily: fonts.bodyMedium, color: '#fff', textAlign: 'center', fontSize: 15, lineHeight: 21 }}>{f.note}</Text>
						</Animated.View>
					) : null}
				</View>

				<View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 22 }}>
					<Round label="Stop" onPress={f.reset} disabled={f.phase === 'idle'}>
						<RotateCcw size={22} color="#fff" />
					</Round>
					<Press
						haptic
						scaleTo={0.92}
						onPress={running ? f.pause : start}
						accessibilityRole="button"
						accessibilityLabel={running ? 'Pause' : f.phase === 'idle' ? 'Start focus' : 'Resume'}
						style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}
					>
						{running ? <Pause size={34} color={t.onAmber} fill={t.onAmber} /> : <Play size={34} color={t.onAmber} fill={t.onAmber} style={{ marginLeft: 4 }} />}
					</Press>
					<Round label={brk ? 'End break' : 'Skip to break'} onPress={f.skip} disabled={f.phase === 'idle'}>
						<SkipForward size={22} color="#fff" />
					</Round>
				</View>

				<View style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.pill, padding: 8, paddingRight: 16 }}>
					<Press
						haptic
						onPress={() => setMusicOn(!musicOn)}
						accessibilityRole="switch"
						accessibilityState={{ checked: musicOn }}
						accessibilityLabel="Study music"
						style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: musicOn ? t.amber : 'rgba(255,255,255,0.16)' }}
					>
						<Music size={18} color={musicOn ? t.onAmber : '#fff'} />
					</Press>
					<View style={{ flex: 1 }}>
						<Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: '#fff' }}>
							{musicOn ? TRACKS[track].title : 'Study music'}
						</Text>
						<Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.7)' }} onPress={() => Linking.openURL('https://pixabay.com/music/')}>
							{musicOn ? `${TRACKS[track].artist} · Pixabay` : running ? 'Off' : 'Plays while the timer runs'}
						</Text>
					</View>
					{musicOn ? (
						<Press haptic onPress={() => setTrack((i) => (i + 1) % TRACKS.length)} accessibilityLabel="Next track" hitSlop={8}>
							<SkipForward size={18} color="#fff" />
						</Press>
					) : null}
				</View>
			</View>
		</View>
	);
}

function Scene({ src }: { src: string }) {
	const player = useVideoPlayer(src, (p) => {
		p.loop = true;
		p.muted = true;
		p.play();
	});
	return <VideoView player={player} style={{ flex: 1 }} contentFit="cover" nativeControls={false} allowsFullscreen={false} allowsPictureInPicture={false} />;
}

function Round({ children, onPress, label, disabled }: { children: React.ReactNode; onPress: () => void; label: string; disabled?: boolean }) {
	return (
		<Press haptic onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', opacity: disabled ? 0.4 : 1 }}>
			{children}
		</Press>
	);
}
