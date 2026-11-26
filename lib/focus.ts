// Focus timer: customizable Pomodoro focus & break durations (defaults 25m / 5m).
// Kept as an end time so it stays right while the app sleeps; a local
// notification fires when the phase ends even if the app is closed.
import { Platform } from 'react-native';
import { create } from 'zustand';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { prefs } from './storage';
import { useStudyPrefs } from './prefs';

const KEY = 'ks.focus';

export type FocusPhase = 'idle' | 'focus' | 'break';

export const focusSeconds = () => useStudyPrefs.getState().focusMinutes * 60;
export const breakSeconds = () => useStudyPrefs.getState().breakMinutes * 60;

interface Saved {
	phase: FocusPhase;
	left: number;
	endsAt: number | null;
	rounds: number;
}

export type FocusCue = 'start' | 'end';

interface FocusState extends Saved {
	note: string;
	musicOn: boolean;
	track: number;
	cue: FocusCue | null;
	cueSeq: number;
	toggleMusic(): void;
	nextTrack(count: number): void;
	syncDuration(): void;
	start(): void;
	pause(): void;
	reset(): void;
	skip(): void;
	tick(): void;
}

let notifId: string | null = null;
async function schedule(endsAt: number | null, phase: FocusPhase) {
	if (Platform.OS === 'web') return;
	if (notifId) await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
	notifId = null;
	if (!endsAt) return;
	const secs = Math.max(1, Math.round((endsAt - Date.now()) / 1000));
	notifId = await Notifications.scheduleNotificationAsync({
		content: {
			title: phase === 'focus' ? 'Focus round done' : 'Break over',
			body: phase === 'focus' ? 'Good focus. Stand up, stretch and drink some water.' : 'Start the next round when you are ready.'
		},
		trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secs }
	}).catch(() => null);
}

const saved = prefs.getJSON<Saved>(KEY);

export const useFocus = create<FocusState>((set, get) => {
	const save = () => {
		const { phase, left, endsAt, rounds } = get();
		prefs.setJSON(KEY, phase === 'idle' ? null : { phase, left, endsAt, rounds });
	};
	return {
		phase: saved?.phase ?? 'idle',
		left: saved?.left ?? focusSeconds(),
		endsAt: saved?.endsAt ?? null,
		rounds: saved?.rounds ?? 0,
		note: '',
		musicOn: false,
		track: 0,
		cue: null,
		cueSeq: 0,
		toggleMusic: () => set((s) => ({ musicOn: !s.musicOn })),
		nextTrack: (count) => set((s) => ({ track: (s.track + 1) % count })),
		syncDuration() {
			const s = get();
			if (s.phase === 'idle' && !s.endsAt) {
				set({ left: focusSeconds() });
			}
		},
		start() {
			const s = get();
			const phase = s.phase === 'idle' ? 'focus' : s.phase;
			const left = s.phase === 'idle' ? focusSeconds() : s.left;
			const endsAt = Date.now() + left * 1000;
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
			set({ phase, left, endsAt, note: '', cue: 'start', cueSeq: s.cueSeq + 1 });
			schedule(endsAt, phase);
			save();
		},
		pause() {
			const s = get();
			if (!s.endsAt) return;
			set({ endsAt: null, left: Math.max(1, Math.ceil((s.endsAt - Date.now()) / 1000)) });
			schedule(null, s.phase);
			save();
		},
		reset() {
			set({ phase: 'idle', left: focusSeconds(), endsAt: null, note: '' });
			schedule(null, 'idle');
			save();
		},
		skip() {
			const s = get();
			if (s.phase === 'focus') {
				const brk = breakSeconds();
				const endsAt = Date.now() + brk * 1000;
				set({ phase: 'break', left: brk, endsAt, note: '', cue: 'end', cueSeq: s.cueSeq + 1 });
				schedule(endsAt, 'break');
			} else {
				set({ phase: 'focus', left: focusSeconds(), endsAt: null, note: '' });
				schedule(null, 'focus');
			}
			save();
		},
		tick() {
			const s = get();
			if (!s.endsAt) return;
			const left = Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000));
			if (left > 0) {
				if (left !== s.left) set({ left });
				return;
			}
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
			if (s.phase === 'focus') {
				const brk = breakSeconds();
				const brkMin = useStudyPrefs.getState().breakMinutes;
				const endsAt = Date.now() + brk * 1000;
				set({
					phase: 'break',
					left: brk,
					endsAt,
					rounds: s.rounds + 1,
					note: `Good focus. Stand up, stretch and drink some water. ${brkMin}-minute break.`,
					cue: 'end',
					cueSeq: s.cueSeq + 1
				});
				schedule(endsAt, 'break');
			} else {
				set({
					phase: 'focus',
					left: focusSeconds(),
					endsAt: null,
					note: 'Break over. Start the next round when you are ready.',
					cue: 'end',
					cueSeq: s.cueSeq + 1
				});
			}
			save();
		}
	};
});

export const clockOf = (left: number) => `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
