// The lesson reader: every block drawn natively, a reading-progress bar, quick
// checks, recap, exam corner, "I've got this" with confetti and Ollie, and a
// sideways swipe to the next or previous lesson (the next one is preloaded).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useClient, useQuery } from 'urql';
import Animated, { FadeIn, FadeInDown, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ArrowRight, Check, Clock, Lock, RotateCcw } from 'lucide-react-native';
import { COURSE, LESSON } from '../../../../lib/api/queries';
import type { CourseOutline, CourseProgress, LessonContent, Question } from '../../../../lib/api/types';
import { errorCode, errorText } from '../../../../lib/api/client';
import { isCompleted, track, useProgress } from '../../../../lib/progress';
import { fonts, radius, useTheme, useTint } from '../../../../lib/theme';
import { fullId } from '../../../../lib/study/ids';
import { lessonHref, quizHref } from '../../../../lib/nav';
import { plain } from '../../../../lib/html';
import { Blocks, Eye } from '../../../../components/blocks/Blocks';
import { Html } from '../../../../components/Html';
import { QuestionCard } from '../../../../components/QuestionCard';
import { Confetti, OllieCheer } from '../../../../components/Celebrate';
import { ReportSheet, type ReportTarget } from '../../../../components/ReportSheet';
import { Button, Card, ErrorBox, Loading, Press, T, hair } from '../../../../components/ui';

type CourseData = { course: CourseOutline; courseProgress: CourseProgress | null };

export default function LessonReader() {
	const { slug, lessonId: local } = useLocalSearchParams<{ slug: string; lessonId: string }>();
	const id = fullId(slug, local);
	const t = useTheme();
	const hue = useTint(slug);
	const router = useRouter();
	const client = useClient();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const overlay = useProgress((s) => s.completed);

	const [{ data: cd }] = useQuery<CourseData>({ query: COURSE, variables: { slug, signedIn: true, preview: null } });
	const [{ data, error, fetching }, refetch] = useQuery<{ lesson: LessonContent }>({ query: LESSON, variables: { slug, id, preview: null }, requestPolicy: 'cache-first' });
	const lc = data?.lesson;
	const lesson = lc?.lesson;
	const course = cd?.course;
	const unitIndex = course?.units.findIndex((u) => u.lessons.some((l) => l.id === id)) ?? -1;
	const unit = unitIndex >= 0 ? course!.units[unitIndex] : null;
	const outline = unit?.lessons.find((l) => l.id === id);
	const done = isCompleted(id, cd?.courseProgress?.completedLessons, overlay);
	const locked = errorCode(error) === 'PAYWALL' || (!lc && outline?.locked);

	const [right, setRight] = useState(0);
	const [answered, setAnswered] = useState(0);
	const [party, setParty] = useState<null | 'lesson' | 'unit'>(null);
	const [report, setReport] = useState<ReportTarget | null>(null);

	// ---- reading progress
	const scrollY = useSharedValue(0);
	const maxY = useSharedValue(1);
	const onScroll = useAnimatedScrollHandler((e) => {
		scrollY.value = e.contentOffset.y;
		maxY.value = Math.max(1, e.contentSize.height - e.layoutMeasurement.height);
	});
	const barStyle = useAnimatedStyle(() => ({ width: `${Math.min(1, Math.max(0, scrollY.value / maxY.value)) * 100}%` }));

	// ---- time on lesson: counted while the app is in front, sent each minute
	const secs = useRef(0);
	useEffect(() => {
		if (!lc) return;
		track({ kind: 'lesson_open', courseSlug: slug, lessonId: id });
		let last = Date.now();
		let active = AppState.currentState === 'active';
		const flushTime = () => {
			if (secs.current >= 5) track({ kind: 'lesson_time', courseSlug: slug, lessonId: id, seconds: secs.current });
			secs.current = 0;
		};
		const tick = setInterval(() => {
			const now = Date.now();
			if (active) secs.current += Math.min(5, (now - last) / 1000);
			last = now;
			if (secs.current >= 60) flushTime();
		}, 1000);
		const sub = AppState.addEventListener('change', (s) => {
			active = s === 'active';
			if (!active) flushTime();
		});
		return () => {
			clearInterval(tick);
			sub.remove();
			flushTime();
		};
	}, [lc?.id]);

	// Preload the next lesson so the swipe lands instantly.
	useEffect(() => {
		if (lc?.next && !lc.next.locked) client.query(LESSON, { slug, id: lc.next.id, preview: null }).toPromise();
	}, [lc?.next?.id]);

	useEffect(() => {
		setRight(0);
		setAnswered(0);
	}, [id]);

	const markDone = () => {
		const was = done;
		track({ kind: was ? 'lesson_uncomplete' : 'lesson_complete', courseSlug: slug, lessonId: id });
		if (was) return;
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
		const isDone = (x: string) => x === id || isCompleted(x, cd?.courseProgress?.completedLessons, overlay);
		setParty(unit && unit.lessons.every((l) => isDone(l.id)) ? 'unit' : 'lesson');
	};

	const go = useCallback(
		(to: { id: string; locked: boolean } | null | undefined) => {
			if (!to) return;
			Haptics.selectionAsync().catch(() => {});
			router.replace(lessonHref(slug, to.id) as never);
		},
		[slug]
	);

	// ---- swipe sideways between lessons
	const dx = useSharedValue(0);
	const pan = Gesture.Pan()
		.activeOffsetX([-24, 24])
		.failOffsetY([-14, 14])
		.onUpdate((e) => {
			dx.value = e.translationX * 0.35;
		})
		.onEnd((e) => {
			const far = Math.abs(e.translationX) > width * 0.28 || Math.abs(e.velocityX) > 900;
			if (far && e.translationX < 0 && lc?.next) runOnJS(go)(lc.next);
			else if (far && e.translationX > 0 && lc?.prev) runOnJS(go)(lc.prev);
			dx.value = withSpring(0, { damping: 18 });
		});
	const swipeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dx.value }] }));

	const checks = (lc?.checks ?? []) as Question[];
	const hasRecap = !!lesson?.recap?.length;

	if (!lc && fetching) return <Loading label="Opening the lesson…" />;

	return (
		<View style={{ flex: 1, backgroundColor: t.bg }}>
			{/* top bar */}
			<View style={{ paddingTop: insets.top, backgroundColor: t.bg, borderBottomWidth: hair, borderColor: t.line, zIndex: 2 }}>
				<View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 6 }}>
					<Press onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back to the course" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
						<ArrowLeft size={22} color={t.fg} />
					</Press>
					<View style={{ flex: 1 }}>
						<Text numberOfLines={1} style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: hue.ink, textTransform: 'uppercase' }}>
							{course?.card.code} · {unit ? `Unit ${unitIndex + 1}` : ''}
						</Text>
						<Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: t.fg }}>
							{plain(lesson?.title ?? outline?.title ?? '')}
						</Text>
					</View>
				</View>
				<View style={{ height: 3, backgroundColor: t.surface2 }}>
					<Animated.View style={[{ height: 3, backgroundColor: hue.base }, barStyle]} />
				</View>
			</View>

			{locked || !lc || !lesson ? (
				<View style={{ padding: 20, gap: 14 }}>
					{locked ? (
						<Card style={{ gap: 10, alignItems: 'flex-start' }}>
							<Lock size={26} color={t.accent} />
							<T v="title">Keep going with a plan.</T>
							<T>The first lesson of every course is free. One plan opens every lesson, quiz and flashcard in every course.</T>
							<Button title="See the plan" onPress={() => router.push('/plan')} />
						</Card>
					) : (
						<ErrorBox message={error ? errorText(error) : "We couldn't open this lesson."} onRetry={() => refetch({ requestPolicy: 'network-only' })} />
					)}
				</View>
			) : (
				<GestureDetector gesture={pan}>
					<Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} style={swipeStyle} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 60, gap: 22 }}>
						<Animated.View entering={FadeInDown.duration(500)} style={{ gap: 8 }}>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
								<Clock size={13} color={t.muted} />
								<T v="small">{lesson.minutes} min read</T>
								{done ? (
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 }}>
										<Check size={13} color={t.success} />
										<T v="small" color={t.success}>
											Done
										</T>
									</View>
								) : null}
							</View>
							<Text style={{ fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, color: t.fg, letterSpacing: -0.5 }}>{plain(lesson.title)}</Text>
							{lesson.tagline ? <Text style={{ fontFamily: fonts.serifItalic, fontSize: 18, lineHeight: 25, color: t.fg2 }}>{plain(lesson.tagline)}</Text> : null}
						</Animated.View>

						{lesson.hook ? (
							<Animated.View entering={FadeInDown.delay(100).duration(500)} style={{ borderLeftWidth: 3, borderLeftColor: hue.base, paddingLeft: 14 }}>
								<Html html={lesson.hook} hue={hue} style={{ fontSize: 18, lineHeight: 28 }} />
							</Animated.View>
						) : null}

						<Blocks blocks={lesson.blocks} hue={hue} onReport={(blockKey, what) => setReport({ courseSlug: slug, lessonId: id, blockKey, what })} />

						{hasRecap ? (
							<View style={{ backgroundColor: hue.wash, borderRadius: radius.md, padding: 18, gap: 10 }}>
								<Eye hue={hue}>📌 Recap</Eye>
								{lesson.recap!.map((r, i) => (
									<View key={i} style={{ flexDirection: 'row', gap: 10 }}>
										<View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: hue.base, marginTop: 10, transform: [{ rotate: '45deg' }] }} />
										<View style={{ flex: 1 }}>
											<Html html={r} hue={hue} style={{ fontSize: 16, lineHeight: 25 }} />
										</View>
									</View>
								))}
							</View>
						) : null}

						{lesson.examCorner ? (
							<View style={{ backgroundColor: t.surface, borderRadius: radius.md, padding: 18, gap: 8, borderWidth: hair, borderColor: t.line }}>
								<Eye hue={hue}>🎯 Exam corner</Eye>
								<Html html={lesson.examCorner} hue={hue} style={{ fontSize: 16, lineHeight: 25 }} />
							</View>
						) : null}

						{checks.length ? (
							<View style={{ gap: 18 }}>
								<View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
									<Text style={{ fontFamily: fonts.serif, fontSize: 22, color: t.fg }}>Quick check</Text>
									{answered ? (
										<T v="bodyStrong" color={hue.ink}>
											{right} / {answered}
										</T>
									) : (
										<T v="small">{checks.length} question{checks.length === 1 ? '' : 's'}</T>
									)}
								</View>
								{checks.map((q, i) => (
									<View key={q.id} style={{ backgroundColor: t.surface, borderRadius: radius.md, padding: 16, borderWidth: hair, borderColor: t.line }}>
										<QuestionCard
											q={q}
											hue={hue}
											number={`${i + 1}.`}
											onAnswer={(ok, response) => {
												setAnswered((n) => n + 1);
												if (ok) setRight((n) => n + 1);
												track({ kind: 'attempt', courseSlug: slug, lessonId: id, questionId: q.id, context: 'check', correct: ok, response });
											}}
											onReport={() => setReport({ courseSlug: slug, lessonId: id, questionId: q.id, what: 'this question' })}
										/>
									</View>
								))}
							</View>
						) : null}

						<View style={{ alignItems: 'center', gap: 10, marginTop: 6 }}>
							{done ? (
								<Animated.View entering={FadeIn} style={{ alignItems: 'center', gap: 8 }}>
									<T v="bodyStrong" color={t.success}>
										{unit && unit.lessons.every((l) => isCompleted(l.id, cd?.courseProgress?.completedLessons, overlay)) ? `Unit ${unitIndex + 1} complete. Brilliant.` : 'Nice work. One more waypoint behind you.'}
									</T>
									<Press onPress={markDone} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
										<RotateCcw size={14} color={t.muted} />
										<T v="small">Mark as not done</T>
									</Press>
								</Animated.View>
							) : (
								<Button title="I've got this" icon={<Check size={18} color={t.onAmber} />} onPress={markDone} style={{ alignSelf: 'stretch' }} />
							)}
							{done && unit?.quizCount && unit.lessons.every((l) => isCompleted(l.id, cd?.courseProgress?.completedLessons, overlay)) ? (
								<Button kind="hue" hue={hue} title={`Take the unit ${unitIndex + 1} quiz`} onPress={() => router.push(quizHref(slug, unit.id) as never)} style={{ alignSelf: 'stretch' }} />
							) : null}
						</View>

						{lc.next ? (
							<Press haptic onPress={() => go(lc.next)} style={{ backgroundColor: hue.wash, borderRadius: radius.md, padding: 16, borderWidth: 1.5, borderColor: hue.base, gap: 4 }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
									<T v="label" color={hue.ink}>
										Up next
									</T>
									{lc.next.locked ? <Lock size={12} color={hue.ink} /> : null}
									<ArrowRight size={14} color={hue.ink} style={{ marginLeft: 'auto' }} />
								</View>
								<Text style={{ fontFamily: fonts.serif, fontSize: 19, color: t.fg }}>{plain(lc.next.title)}</Text>
								{lc.next.tagline ? <T v="small">{plain(lc.next.tagline)}</T> : null}
								<T v="micro" style={{ marginTop: 4 }}>
									Or swipe left
								</T>
							</Press>
						) : (
							<Button kind="ghost" title="Back to the course" onPress={() => router.back()} />
						)}
					</Animated.ScrollView>
				</GestureDetector>
			)}
			{party ? <Confetti /> : null}
			{party ? <OllieCheer big={party === 'unit'} onDone={() => setParty(null)} /> : null}
			<ReportSheet target={report} onClose={() => setReport(null)} />
		</View>
	);
}
