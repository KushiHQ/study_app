// Types for the Kushi Study course bundle (SPEC §3) and the GraphQL API (SPEC §7).
// The canonical bundle types live in study_content/schema/bundle.ts; keep these in step.

export type Html = string;

// ---------------------------------------------------------------- bundle

export type WidgetKind = 'slider-formula' | 'graph-search' | 'sort-steps' | 'truth-table' | 'reveal-steps';

type Keyed = { key?: string };

/** A drawing on a figure, in the picture's pixels (study_content schema/bundle.ts). */
export interface FigureMark {
	kind: 'arrow' | 'line' | 'label';
	x1: number;
	y1: number;
	x2?: number;
	y2?: number;
	hue?: 'accent' | 'sage' | 'rose' | 'honey' | 'sky' | 'lilac' | 'peach' | 'ink';
	label?: string;
	both?: boolean;
	dashed?: boolean;
	step?: number;
}

export type Block = Keyed &
	(
		| { type: 'text'; html: Html }
		| { type: 'analogy'; title: string; html: Html }
		| { type: 'bigidea'; html: Html }
		| { type: 'steps'; title: string; intro?: Html; steps: { title: string; html: Html }[] }
		| { type: 'compare'; title: string; headers: string[]; rows: Html[][] }
		| { type: 'diagram'; svg: string; caption: Html; parts?: { id: string; title: string; html: Html }[]; steps?: { title: string; html: Html }[] }
		| {
				type: 'figure';
				image: { src: string; width: number; height: number; alt: string };
				spots: { x: number; y: number; title: string; html: Html; step?: number }[];
				steps?: { title: string; html: Html }[];
				marks?: FigureMark[];
				caption: Html;
		  }
		| { type: 'formula'; tex: string; title: string; html: Html }
		| { type: 'code'; lang: string; code: string; caption?: Html; /** highlighted on the server */ html?: string }
		| { type: 'think'; prompt: Html; answer: Html }
		| { type: 'mnemonic'; html: Html }
		| { type: 'story'; title: string; html: Html }
		| { type: 'pitfall'; html: Html }
		| { type: 'heading'; text: string }
		| { type: 'widget'; kind: WidgetKind; title?: string; config: Record<string, unknown>; caption?: Html }
		| TraceBlock
		| PlotBlock
	);

/** A graph of functions or data (study_content schema/bundle.ts). Formulas arrive already sampled as points. */
export interface PlotAxis {
	label?: string;
	min: number;
	max: number;
	log?: true;
	ticks?: { v: number; label?: string }[];
}
export interface PlotSeries {
	kind: 'curve' | 'line' | 'points' | 'bars';
	name: string;
	html?: Html;
	hue?: 'sky' | 'peach' | 'sage' | 'lilac' | 'honey' | 'rose';
	dash?: true;
	smooth?: true;
	expr?: string;
	pts?: [number, number | null][];
	values?: number[];
}
export interface PlotMark {
	kind: 'point' | 'vline' | 'hline' | 'area';
	x?: number;
	y?: number;
	from?: number;
	to?: number;
	series?: number;
	label?: string;
	html?: Html;
}
export interface PlotBlock {
	type: 'plot';
	title: string;
	x: PlotAxis;
	y: PlotAxis;
	categories?: string[];
	snap?: number;
	series: PlotSeries[];
	marks?: PlotMark[];
	caption?: Html;
}

/** A data-structure / algorithm trace (study_content schema/bundle.ts). The app draws and animates the states. */
export type TraceKind = 'array' | 'heap' | 'tree' | 'list' | 'stack' | 'queue' | 'code' | 'graph';
export interface TraceState {
	title: string;
	html: Html;
	v: string[];
	links?: ('r' | 'l' | 'b' | '')[];
	hot?: number[];
	done?: number[];
	dim?: number[];
	ptr?: { name: string; at: number }[];
	line?: number;
	out?: string;
	input?: string[];
	at?: number;
	path?: [number, number][];
}
export interface TraceBlock {
	type: 'trace';
	kind: TraceKind;
	title: string;
	states: TraceState[];
	order?: 'max' | 'min';
	outLabel?: string;
	vLabel?: string;
	code?: string;
	lang?: string;
	/** kind=code: the program, highlighted on the server */
	html?: string;
	graph?: { nodes: { id: string; x?: number; y?: number }[]; edges: { from: number; to: number; directed?: boolean; w?: string }[] };
	caption?: Html;
}

export interface Lesson {
	id: string;
	title: string;
	tagline: string;
	minutes: number;
	hook?: Html;
	blocks: Block[];
	recap?: Html[];
	examCorner?: Html;
	checks: string[];
}

export interface Unit {
	id: string;
	title: string;
	summary: Html;
	lessons: Lesson[];
	quiz: string[];
}

export interface Lab {
	id: string;
	title: string;
	intro: Html;
	component: string;
}

export interface PracticeItem {
	id: string;
	label: string;
	marks?: string;
	question: Html;
	approach: Html;
	answer: Html;
	lessonId?: string;
}

export interface Flashcard {
	id: string;
	front: Html;
	back: Html;
	lessonId?: string;
}

type QBase = { id: string; prompt: Html; why: Html; lessonId?: string; difficulty?: 1 | 2 | 3 };
export type Question = QBase &
	(
		| { type: 'single'; options: Html[]; answer: number }
		| { type: 'multi'; options: Html[]; answers: number[] }
		| { type: 'numeric'; answer: number; tolerance: number; unit?: string }
		| { type: 'order'; items: Html[] }
	);

export interface CourseBundle {
	schema: 1;
	code: string;
	slug: string;
	title: string;
	nickname: string;
	icon: string;
	summary: Html;
	welcome: Html;
	examShape: Html;
	healthNotice?: boolean;
	offerings: { department: string; departmentName: string; level: string }[];
	aliases: { school: string; code: string; title?: string; coverage?: { covered: number; total: number } }[];
	units: Unit[];
	labs: Lab[];
	practice: PracticeItem[];
	flashcards: Flashcard[];
	questions: Question[];
	finalQuiz: string[];
	studyPlan: { suggestedWeeks: number };
	version: string;
}

// ---------------------------------------------------------------- API

export interface Department {
	id: string;
	slug: string;
	name: string;
	courseCount: number;
}
export interface Level {
	code: string;
	name: string;
}
export interface User {
	id: string;
	email: string;
	name: string | null;
	department: Department | null;
	level: Level | null;
	school: string | null;
	isTeacher: boolean;
	staffRole: string | null;
}
export interface Device {
	id: string;
	label: string;
	lastUsedAt: string;
	current: boolean;
}
export interface Alias {
	school: string;
	code: string;
	title: string | null;
	covered: number | null;
	total: number | null;
}
export interface CourseCard {
	code: string;
	slug: string;
	title: string;
	nickname: string;
	icon: string;
	summary: string;
	unitCount: number;
	lessonCount: number;
	minutes: number;
	healthNotice: boolean;
	offerings: { department: Department; level: Level }[];
	aliases: Alias[];
}
export interface LessonOutline {
	id: string;
	title: string;
	tagline: string;
	minutes: number;
	locked: boolean;
}
export interface UnitOutline {
	id: string;
	title: string;
	summary: string;
	free: boolean;
	lessons: LessonOutline[];
	quizCount: number;
}
export interface LabOutline {
	id: string;
	title: string;
	component: string;
	locked: boolean;
}
export interface CourseOutline {
	card: CourseCard;
	version: string;
	welcome: string;
	examShape: string;
	units: UnitOutline[];
	labs: LabOutline[];
	practiceCount: number;
	flashcardCount: number;
	finalQuizCount: number;
	freeUnits: number;
	/** Lessons open without a plan, counted from the start of the course (owner: 1). */
	freeLessons?: number;
	viewerHasAccess: boolean;
}
export interface LessonContent {
	id: string;
	unitId: string;
	courseSlug: string;
	version: string;
	lesson: Lesson;
	checks: Question[];
	prev: LessonOutline | null;
	next: LessonOutline | null;
}
export interface Enrollment {
	examDate: string | null;
	studyDays: number[];
	startedAt: string;
}
export interface CourseProgress {
	courseSlug: string;
	courseTitle: string;
	courseCode: string;
	covered: number;
	examReady: number;
	completedLessons: string[];
	startedLessons: string[];
	lessonMastery: { lessonId: string; mastery: number; attempts: number }[];
	nextLesson: LessonOutline | null;
	cardsDue: number;
	practiceDone: string[];
	labsVisited: string[];
	finalQuizBest: number | null;
	enrollment: Enrollment | null;
}
export interface TodayItem {
	/** lesson | cards | quiz (refId = unit id or "<slug>/final") | review */
	kind: 'lesson' | 'cards' | 'quiz' | 'review' | string;
	courseSlug: string;
	courseTitle: string;
	refId: string | null;
	title: string;
	minutes: number;
}
export interface Today {
	items: TodayItem[];
	streakDays: number;
	studiedToday: boolean;
	daysToExam: number | null;
	behindBy: number;
}
export interface Plan {
	code: string;
	name: string;
	interval: string;
	priceKobo: number;
	active: boolean;
}
export interface Subscription {
	id: string;
	plan: Plan;
	status: 'active' | 'cancelled' | 'expired' | 'past_due' | string;
	method: 'card' | 'one_off' | string;
	currentPeriodEnd: string;
	cancelAtPeriodEnd: boolean;
}
export interface Access {
	hasAccess: boolean;
	until: string | null;
	source: 'subscription' | 'grant' | 'staff' | string | null;
}
export interface Payment {
	id: string;
	txRef: string;
	amountKobo: number;
	status: string;
	purpose: string;
	method: string;
	createdAt: string;
}

/** Flashcards query payload: the deck plus this user's schedule. */
export interface CardSchedule {
	cardId: string;
	dueOn: string;
	intervalDays: number;
	reps: number;
	/** Not sent by the server today; SM-2 defaults apply. */
	ease?: number;
	lapses?: number;
}
export interface FlashcardDeck {
	cards: Flashcard[];
	schedule: CardSchedule[];
	/** The server's today (Africa/Lagos), YYYY-MM-DD. */
	today?: string;
}

export type ProgressKind =
	| 'lesson_open'
	| 'lesson_time'
	| 'lesson_complete'
	| 'lesson_uncomplete'
	| 'attempt'
	| 'card_review'
	| 'practice_mark'
	| 'lab_visit'
	| 'quiz_result';

export interface ProgressEvent {
	eventId: string;
	at: string;
	kind: ProgressKind;
	courseSlug: string;
	lessonId?: string;
	questionId?: string;
	cardId?: string;
	itemId?: string;
	labId?: string;
	/** quiz_result: a unit id, or "<slug>/final" */
	quizId?: string;
	seconds?: number;
	context?: 'check' | 'unit_quiz' | 'final_quiz' | 'practice';
	correct?: boolean;
	response?: unknown;
	grade?: number;
	gotIt?: boolean;
	score?: number;
	total?: number;
}

export type FeedbackKind = 'wrong' | 'unclear' | 'missing' | 'typo' | 'other';

export interface PayoutAccount {
	bankCode: string;
	bankName: string;
	accountLast4: string;
	accountName: string;
}
export interface ReferredPerson {
	name: string;
	joinedAt: string;
	status: 'joined' | 'rewarded' | 'reversed';
	rewardKobo: number | null;
	rewardedAt: string | null;
}
export interface Withdrawal {
	id: string;
	amountKobo: number;
	status: 'pending' | 'processing' | 'paid' | 'failed' | 'rejected' | 'cancelled';
	bankName: string;
	accountLast4: string;
	note: string | null;
	createdAt: string;
	paidAt: string | null;
}
export interface WalletEntry {
	id: string;
	kind: 'referral_reward' | 'reward_reversal' | 'withdrawal' | 'withdrawal_return' | 'adjustment';
	amountKobo: number;
	note: string | null;
	createdAt: string;
}
export interface Referrals {
	code: string;
	link: string;
	enabled: boolean;
	rewardBps: number;
	rewardKoboAtCurrentPrice: number;
	minWithdrawalKobo: number;
	invitedCount: number;
	paidCount: number;
	earnedKobo: number;
	withdrawnKobo: number;
	pendingWithdrawalKobo: number;
	balanceKobo: number;
	referredBy: string | null;
	canApplyCode: boolean;
	payoutAccount: PayoutAccount | null;
	people: ReferredPerson[];
	withdrawals: Withdrawal[];
	entries: WalletEntry[];
}
export interface BankOption {
	code: string;
	name: string;
}
