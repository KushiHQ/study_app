import { useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useClient, useQuery } from 'urql';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ArrowRight, Check, Clock, Lock, RotateCcw } from 'lucide-react-native';
import { COURSE, LESSON } from '../../../../lib/api/queries';
import type { CourseOutline, CourseProgress, LessonContent, Question } from '../../../../lib/api/types';
import { errorCode, errorText } from '../../../../lib/api/client';
import { isCompleted, track, useProgress } from '../../../../lib/progress';
import { fonts, radius, useTheme, useTint } from '../../../../lib/theme';
import { fullId, localId } from '../../../../lib/study/ids';
import { courseHref, quizHref } from '../../../../lib/nav';
import { plain } from '../../../../lib/html';
import { Blocks, Eye } from '../../../../components/blocks/Blocks';
import { Html } from '../../../../components/Html';
import { QuestionCard } from '../../../../components/QuestionCard';
import { FocusControls } from '../../../../components/FocusControls';
import { ReportSheet, type ReportTarget } from '../../../../components/ReportSheet';
import { Button, Card, ErrorBox, Loading, Press, T, hair } from '../../../../components/ui';

type CourseData = { course: CourseOutline; courseProgress: CourseProgress | null };

export default function LessonReader() {
	const { slug, lessonId: local } = useLocalSearchParams<{ slug: string; lessonId: string }>();
	if (!slug || !local) return <ErrorBox message="This lesson link is incomplete." />;
	const id = fullId(slug, local);
	return <Lesson key={id} slug={slug} id={id} />;
}

function Lesson({ slug, id }: { slug: string; id: string }) {
	const t = useTheme();
	const hue = useTint(slug);
	const router = useRouter();
	const client = useClient();
	const insets = useSafeAreaInsets();
	const overlay = useProgress((s) => s.completed);

	const [{ data: cd }] = useQuery<CourseData>({ query: COURSE, variables: { slug, signedIn: true, preview: null } });
	const [{ data, error, fetching }, refetch] = useQuery<{ lesson: LessonContent }>({ query: LESSON, variables: { slug, id, preview: null }, requestPolicy: 'cache-first' });
	const lc = data?.lesson?.id && fullId(slug, data.lesson.id) === id ? data.lesson : undefined;
	const lesson = lc?.lesson;
	const course = cd?.course;
	const unitIndex = course?.units.findIndex((u) => u.lessons.some((l) => l.id === id)) ?? -1;
	const unit = unitIndex >= 0 ? course!.units[unitIndex] : null;
	const outline = unit?.lessons.find((l) => l.id === id);
	const done = isCompleted(id, cd?.courseProgress?.completedLessons, overlay);
	const locked = errorCode(error) === 'PAYWALL' || (!lc && outline?.locked);

	const [right, setRight] = useState(0);
	const [answered, setAnswered] = useState(0);
	const [report, setReport] = useState<ReportTarget | null>(null);
	const changingLesson = useRef(false);

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
	const loaded = Boolean(lc);
	useEffect(() => {
		if (!loaded) return;
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
	}, [id, loaded, slug]);

	// Warm the cache for the next lesson without changing the reader route.
	useEffect(() => {
		if (lc?.next && !lc.next.locked) void client.query(LESSON, { slug, id: fullId(slug, lc.next.id), preview: null }).toPromise();
	}, [client, lc?.next, slug]);

	const markDone = () => {
		const was = done;
		track({ kind: was ? 'lesson_uncomplete' : 'lesson_complete', courseSlug: slug, lessonId: id });
		if (was) return;
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
	};

	const go = (target: string) => {
		const next = localId(target);
		if (!next || next === localId(id) || changingLesson.current) return;
		changingLesson.current = true;
		router.setParams({ lessonId: next });
	};
	const goBack = () => {
		if (router.canGoBack()) router.back();
		else router.replace(courseHref(slug));
	};

	const checks = (lc?.checks ?? []) as Question[];
	const hasRecap = !!lesson?.recap?.length;

	if (!lc && fetching) return <Loading label="Opening the lesson…" />;

	return (
		<View style={{ flex: 1, backgroundColor: t.bg }}>
			{/* top bar */}
			<View style={{ paddingTop: insets.top, backgroundColor: t.bg, borderBottomWidth: hair, borderColor: t.line, zIndex: 2 }}>
				<View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 6 }}>
					<Press onPress={goBack} hitSlop={10} accessibilityLabel="Back" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
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
				{lc && lesson && !locked ? <FocusControls /> : null}
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
				<Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 30, paddingBottom: insets.bottom + 36, gap: 26 }}>
					<View style={{ gap: 10 }}>
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
					</View>

					{lesson.hook ? (
						<View style={{ borderLeftWidth: 2, borderLeftColor: t.accent, paddingLeft: 16 }}>
							<Html html={lesson.hook} hue={hue} style={{ fontSize: 18, lineHeight: 28 }} />
						</View>
					) : null}

					<Blocks blocks={lesson.blocks} hue={hue} onReport={(blockKey, what) => setReport({ courseSlug: slug, lessonId: id, blockKey, what })} />

					{hasRecap ? (
						<View style={{ backgroundColor: hue.wash, borderRadius: radius.md, padding: 18, gap: 10 }}>
							<Eye hue={hue}>Recap</Eye>
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
							<Eye hue={hue}>Exam corner</Eye>
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
							<View style={{ alignItems: 'center', gap: 8 }}>
								<T v="bodyStrong" color={t.success}>
									{unit && unit.lessons.every((l) => isCompleted(l.id, cd?.courseProgress?.completedLessons, overlay)) ? `Unit ${unitIndex + 1} complete` : 'Lesson complete'}
								</T>
								<Press onPress={markDone} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
									<RotateCcw size={14} color={t.muted} />
									<T v="small">Mark as not done</T>
								</Press>
							</View>
						) : (
							<Button title="Mark as complete" icon={<Check size={18} color={t.onAmber} />} onPress={markDone} style={{ alignSelf: 'stretch' }} />
						)}
						{done && unit && unit.quizCount > 0 && unit.lessons.every((l) => isCompleted(l.id, cd?.courseProgress?.completedLessons, overlay)) ? (
							<Button kind="hue" hue={hue} title={`Take the unit ${unitIndex + 1} quiz`} onPress={() => router.push(quizHref(slug, unit.id) as never)} style={{ alignSelf: 'stretch' }} />
						) : null}
					</View>

					{lc.next ? (
						<Press haptic accessibilityRole="button" onPress={() => go(lc.next!.id)} style={{ backgroundColor: t.surface, borderRadius: radius.md, padding: 18, borderWidth: hair, borderColor: t.line2, gap: 4 }}>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
								<T v="label" color={hue.ink}>
									Next lesson
								</T>
								{lc.next.locked ? <Lock size={12} color={hue.ink} /> : null}
								<ArrowRight size={14} color={hue.ink} style={{ marginLeft: 'auto' }} />
							</View>
							<Text style={{ fontFamily: fonts.serif, fontSize: 19, color: t.fg }}>{plain(lc.next.title)}</Text>
							{lc.next.tagline ? <T v="small">{plain(lc.next.tagline)}</T> : null}
						</Press>
					) : (
						<Button kind="ghost" title="Back to the course" onPress={() => router.replace(courseHref(slug))} />
					)}
					{lc.prev ? <Button kind="ghost" title="Previous lesson" onPress={() => go(lc.prev!.id)} /> : null}
				</Animated.ScrollView>
			)}
			<ReportSheet target={report} onClose={() => setReport(null)} />
		</View>
	);
}
