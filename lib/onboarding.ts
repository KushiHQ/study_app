import type { User } from './api/types';
import { prefs } from './storage';

const skipKey = (userId: string) => `ks.studySetupSkipped.${userId}`;

export function needsStudySetup(user: User): boolean {
	return (!user.department || !user.level) && prefs.get(skipKey(user.id)) !== '1';
}

export function skipStudySetup(userId: string) {
	prefs.set(skipKey(userId), '1');
}
