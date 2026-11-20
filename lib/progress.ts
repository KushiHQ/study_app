// Progress events (SPEC §7 ProgressEventInput), saved on the phone first and
// sent through syncProgress in batches of up to 200, like the web app's queue.
// Each event carries a client uuid, so a batch retried after a dropped
// connection isn't counted twice. Works offline: the queue waits for the network.
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { prefs } from './storage';
import { gql, type GqlError } from './api/client';
import { SYNC } from './api/queries';
import type { ProgressEvent } from './api/types';
import { onSessionChange } from './session';

type Stored = ProgressEvent & { userId: string };
export type NewEvent = Omit<ProgressEvent, 'eventId' | 'at'>;
const KEY = 'ks.queue';

const read = (): Stored[] => prefs.getJSON<Stored[]>(KEY) ?? [];
const write = (q: Stored[]) => prefs.setJSON(KEY, q);

interface ProgressState {
	userId: string | null;
	pending: number;
	offline: boolean;
	/** optimistic overlays so screens react before the server confirms */
	completed: Record<string, boolean>;
	practice: Record<string, boolean>;
	/** bumped after each successful flush so screens can refetch */
	synced: number;
}

export const useProgress = create<ProgressState>(() => ({
	userId: null,
	pending: 0,
	offline: false,
	completed: {},
	practice: {},
	synced: 0
}));

let timer: ReturnType<typeof setTimeout> | undefined;
let flushing = false;

export function track(e: NewEvent) {
	const s = useProgress.getState();
	if (!s.userId) return;
	if (e.kind === 'lesson_complete' && e.lessonId) useProgress.setState({ completed: { ...s.completed, [e.lessonId]: true } });
	if (e.kind === 'lesson_uncomplete' && e.lessonId) useProgress.setState({ completed: { ...s.completed, [e.lessonId]: false } });
	if (e.kind === 'practice_mark' && e.itemId) useProgress.setState({ practice: { ...s.practice, [e.itemId]: !!e.gotIt } });
	const ev: Stored = JSON.parse(JSON.stringify({ ...e, eventId: Crypto.randomUUID(), at: new Date().toISOString(), userId: s.userId }));
	if (ev.kind === 'lesson_time') ev.seconds = Math.min(1800, Math.max(0, Math.round(ev.seconds ?? 0)));
	const q = read();
	q.push(ev);
	write(q);
	useProgress.setState({ pending: q.filter((x) => x.userId === s.userId).length });
	schedule(e.kind === 'lesson_time' || e.kind === 'lesson_open' ? 4000 : 800);
}

export function isCompleted(lessonId: string, server: string[] | undefined, overlay: Record<string, boolean>) {
	return overlay[lessonId] ?? !!server?.includes(lessonId);
}

export function schedule(ms = 800) {
	clearTimeout(timer);
	timer = setTimeout(flush, ms);
}

export async function flush() {
	const userId = useProgress.getState().userId;
	if (flushing || !userId) return;
	flushing = true;
	try {
		for (;;) {
			const queued = read()
				.filter((e) => e.userId === userId)
				.sort((a, b) => a.at.localeCompare(b.at));
			useProgress.setState({ pending: queued.length });
			if (!queued.length) break;
			const batch = queued.slice(0, 200);
			await gql(SYNC, { events: batch.map(({ userId: _u, ...e }) => e) });
			const sent = new Set(batch.map((e) => e.eventId));
			write(read().filter((e) => !sent.has(e.eventId)));
			useProgress.setState((s) => ({ offline: false, synced: s.synced + 1 }));
		}
	} catch (err) {
		const code = (err as GqlError).code;
		useProgress.setState({ offline: code === 'NETWORK' });
		// Try again later; the queue is safe on disk.
		schedule(code === 'NETWORK' ? 30_000 : 60_000);
	} finally {
		flushing = false;
	}
}

onSessionChange((u) => {
	const userId = u?.id ?? null;
	useProgress.setState({ userId, completed: {}, practice: {}, pending: 0 });
	// Forget queued events that belong to nobody signed in here any more.
	write(read().filter((e) => e.userId === userId));
	if (userId) flush();
});

AppState.addEventListener('change', (s) => {
	if (s !== 'active') flush();
});
NetInfo.addEventListener((n) => {
	if (n.isConnected) flush();
});
