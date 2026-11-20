import type { TodayItem } from './api/types';
import { localId } from './study/ids';

export const courseHref = (slug: string) => `/c/${slug}` as const;
export const lessonHref = (slug: string, lessonId: string) => `/c/${slug}/l/${localId(lessonId)}` as const;
/** quizId: a unit id ("csc-311/u1-…"), or "final" / "<slug>/final" */
export const quizHref = (slug: string, quizId: string) => `/c/${slug}/quiz/${quizId.endsWith('final') ? 'final' : localId(quizId)}` as const;

export function todayHref(i: TodayItem): string {
	switch (i.kind) {
		case 'lesson':
			return i.refId ? lessonHref(i.courseSlug, i.refId) : courseHref(i.courseSlug);
		case 'cards':
			return `/c/${i.courseSlug}/cards`;
		case 'review':
			return `/c/${i.courseSlug}/practice`;
		case 'quiz':
		case 'mock':
			return quizHref(i.courseSlug, i.refId ?? 'final');
		default:
			return courseHref(i.courseSlug);
	}
}

/** "Good morning" in Lagos time. */
export function greeting(): string {
	const h = (new Date().getUTCHours() + 1) % 24;
	if (h < 5) return 'Burning the midnight oil';
	if (h < 12) return 'Good morning';
	if (h < 17) return 'Good afternoon';
	if (h < 21) return 'Good evening';
	return 'Late-night study';
}
