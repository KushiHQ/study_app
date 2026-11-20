// SPEC §7 returns quizzes, practice, flashcards and labs as JSON. These read
// either a bare array or the object shapes proposed in the SPEC notes.
import type { FlashcardDeck, Lab, PracticeItem, Question } from '../api/types';

const arr = <T>(x: unknown, key: string): T[] => (Array.isArray(x) ? (x as T[]) : Array.isArray((x as any)?.[key]) ? (x as any)[key] : []);

export const questionsOf = (x: unknown) => arr<Question>(x, 'questions');
export const practiceOf = (x: unknown) => arr<PracticeItem>(x, 'items');
export function deckOf(x: unknown): FlashcardDeck {
	const today = (x as any)?.today;
	return { cards: arr(x, 'cards'), schedule: Array.isArray((x as any)?.schedule) ? (x as any).schedule : [], today: typeof today === 'string' ? today : undefined };
}
/** finalQuiz carries its quiz id; unitQuiz carries the unit. */
export const quizIdOf = (x: unknown, fallback: string): string => (x as any)?.quizId ?? (x as any)?.unit?.id ?? fallback;
export const labOf = (x: unknown) => x as Lab;
