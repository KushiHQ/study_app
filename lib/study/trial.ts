// The free trial every new student gets (server setting trial_days).

/** Fallback when the API can't say (matches the server default). */
export const TRIAL_DAYS = 14;

/** "2 weeks", "1 week", "10 days". */
export function trialLength(days: number): string {
	if (days > 0 && days % 7 === 0) return `${days / 7} week${days === 7 ? '' : 's'}`;
	return `${days} day${days === 1 ? '' : 's'}`;
}

/** Whole days left until `until` (at least 1 while it hasn't passed). */
export function daysLeft(until: string | null | undefined): number {
	if (!until) return 0;
	const ms = Date.parse(until) - Date.now();
	return ms > 0 ? Math.max(1, Math.ceil(ms / 864e5)) : 0;
}
