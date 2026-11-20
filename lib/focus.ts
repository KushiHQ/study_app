// Focus timer: 25 minutes of focus, then a 5-minute break (same as the web).
// Kept as an end time so it stays right while the app sleeps; a local
// notification fires when the phase ends even if the app is closed.
import { Platform } from 'react-native';
import { create } from 'zustand';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { prefs } from './storage';

export const FOCUS_SECONDS = 25 * 60;
export const BREAK_SECONDS = 5 * 60;
const KEY = 'ks.focus';

export type FocusPhase = 'idle' | 'focus' | 'break';
export type OllieState = 'idle' | 'reading' | 'focus' | 'deep' | 'paused' | 'break';

interface Saved {
	phase: FocusPhase;
	left: number;
	endsAt: number | null;
	rounds: number;
}

interface FocusState extends Saved {
	note: string;
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
		left: saved?.left ?? FOCUS_SECONDS,
		endsAt: saved?.endsAt ?? null,
		rounds: saved?.rounds ?? 0,
		note: '',
		start() {
			const s = get();
			const phase = s.phase === 'idle' ? 'focus' : s.phase;
			const left = s.phase === 'idle' ? FOCUS_SECONDS : s.left;
			const endsAt = Date.now() + left * 1000;
			set({ phase, left, endsAt, note: '' });
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
			set({ phase: 'idle', left: FOCUS_SECONDS, endsAt: null, note: '' });
			schedule(null, 'idle');
			save();
		},
		skip() {
			const s = get();
			if (s.phase === 'focus') {
				const endsAt = Date.now() + BREAK_SECONDS * 1000;
				set({ phase: 'break', left: BREAK_SECONDS, endsAt, note: '' });
				schedule(endsAt, 'break');
			} else {
				set({ phase: 'focus', left: FOCUS_SECONDS, endsAt: null, note: '' });
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
				const endsAt = Date.now() + BREAK_SECONDS * 1000;
				set({ phase: 'break', left: BREAK_SECONDS, endsAt, rounds: s.rounds + 1, note: 'Good focus. Stand up, stretch and drink some water. Five-minute break.' });
				schedule(endsAt, 'break');
			} else {
				set({ phase: 'focus', left: FOCUS_SECONDS, endsAt: null, note: 'Break over. Start the next round when you are ready.' });
			}
			save();
		}
	};
});

export const totalOf = (p: FocusPhase) => (p === 'break' ? BREAK_SECONDS : FOCUS_SECONDS);
export const clockOf = (left: number) => `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
export function ollieOf(s: Pick<Saved, 'phase' | 'left' | 'endsAt'>): OllieState {
	if (s.phase === 'idle') return 'idle';
	if (s.phase === 'break') return 'break';
	if (!s.endsAt) return 'paused';
	const done = FOCUS_SECONDS - s.left;
	return done < 60 ? 'reading' : done < 10 * 60 ? 'focus' : 'deep';
}
