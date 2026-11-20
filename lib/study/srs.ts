// SM-2 spaced repetition (SPEC §4 card_reviews). Grades: 0 again, 1 hard, 2 good, 3 easy.
// The server owns the real schedule; the app uses this to preview "next in N days"
// on the grade buttons and to keep the deck honest while offline.

export interface CardState {
	intervalDays: number;
	ease: number;
	reps: number;
	lapses: number;
}

export const GRADES = [
	{ grade: 0, label: 'Again', hint: 'I forgot' },
	{ grade: 1, label: 'Hard', hint: 'Got it, barely' },
	{ grade: 2, label: 'Good', hint: 'Got it' },
	{ grade: 3, label: 'Easy', hint: 'Too easy' }
] as const;

export const freshCard = (): CardState => ({ intervalDays: 0, ease: 2.5, reps: 0, lapses: 0 });

export function review(prev: CardState, grade: number): CardState {
	// Map the 4 buttons onto SM-2's 0..5 quality scale.
	const q = [1, 3, 4, 5][Math.max(0, Math.min(3, grade))];
	let { intervalDays, ease, reps, lapses } = prev;
	ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
	if (q < 3) {
		reps = 0;
		lapses += 1;
		intervalDays = 1;
	} else {
		reps += 1;
		if (reps === 1) intervalDays = grade === 3 ? 3 : 1;
		else if (reps === 2) intervalDays = grade === 1 ? 3 : 6;
		else intervalDays = Math.round(intervalDays * (grade === 1 ? 1.2 : grade === 3 ? ease * 1.3 : ease));
	}
	return { intervalDays: Math.max(1, intervalDays), ease: Math.round(ease * 100) / 100, reps, lapses };
}

export function intervalLabel(days: number): string {
	if (days <= 1) return '1 day';
	if (days < 30) return `${days} days`;
	const m = Math.round(days / 30);
	return m === 1 ? '1 month' : `${m} months`;
}

/** Today's date in Africa/Lagos (UTC+1, no daylight saving) as YYYY-MM-DD. */
export function lagosToday(now = Date.now()): string {
	return new Date(now + 3600_000).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
	const d = new Date(`${iso}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}
