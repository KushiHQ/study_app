// Unit quiz and final quiz: one question per card, a progress bar, haptics,
// and a result screen with a score ring, confetti and lessons to revisit.
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from 'urql';
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, RotateCcw, X } from 'lucide-react-native';
import { COURSE, FINAL_QUIZ, UNIT_QUIZ } from '../../../../lib/api/queries';
import type { CourseOutline, Question } from '../../../../lib/api/types';
import { errorCode, errorText } from '../../../../lib/api/client';
import { track } from '../../../../lib/progress';
import { questionsOf, quizIdOf } from '../../../../lib/study/payload';
import { fullId } from '../../../../lib/study/ids';
import { lessonHref } from '../../../../lib/nav';
import { plain } from '../../../../lib/html';
import { fonts, radius, useTheme, useTint } from '../../../../lib/theme';
import { QuestionCard } from '../../../../components/QuestionCard';
import { Confetti } from '../../../../components/Celebrate';
import { Ring } from '../../../../components/Ring';
import { ReportSheet, type ReportTarget } from '../../../../components/ReportSheet';
import { Button, ErrorBox, Loading, Meter, Press, T, hair } from '../../../../components/ui';

export default function Quiz() {
	const { slug, quizId: qp } = useLocalSearchParams<{ slug: string; quizId: string }>();
	const isFinal = qp === 'final';
	const unitId = isFinal ? null : fullId(slug, qp);
	const t = useTheme();
	const hue = useTint(slug);
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [{ data: cd }] = useQuery<{ course: CourseOutline }>({ query: COURSE, variables: { slug, signedIn: true, preview: null } });
	const [{ data, error, fetching }, refetch] = useQuery<Record<string, unknown>>({
		query: isFinal ? FINAL_QUIZ : UNIT_QUIZ,
		variables: isFinal ? { slug, preview: null } : { slug, id: unitId, preview: null }
	});
	const raw = data ? (isFinal ? data.finalQuiz : data.unitQuiz) : null;
	const questions = useMemo(() => (raw ? questionsOf(raw) : []), [raw]);
	const quizId = raw ? quizIdOf(raw, isFinal ? `${slug}/final` : unitId!) : (unitId ?? `${slug}/final`);
	const course = cd?.course;
	const unitIndex = course?.units.findIndex((u) => u.id === unitId) ?? -1;
	const label = isFinal ? 'Final quiz' : `Unit ${unitIndex + 1} quiz`;

	const [order, setOrder] = useState<Question[]>([]);
	const [pos, setPos] = useState(0);
	const [answered, setAnswered] = useState(false);
	const [results, setResults] = useState<Record<string, boolean>>({});
	const [report, setReport] = useState<ReportTarget | null>(null);
	const begin = () => {
		setOrder([...questions].sort(() => Math.random() - 0.5));
		setPos(0);
		setAnswered(false);
		setResults({});
	};
	useEffect(begin, [questions]);

	const finished = order.length > 0 && pos >= order.length;
	const right = Object.values(results).filter(Boolean).length;
	const score = order.length ? right / order.length : 0;

	useEffect(() => {
		if (finished) track({ kind: 'quiz_result', courseSlug: slug, quizId, score: right, total: order.length });
	}, [finished]);

	if (!data && fetching) return <Loading label="Getting your questions…" />;
	const q = order[pos];
	const missed = [...new Set(order.filter((x) => results[x.id] === false && x.lessonId).map((x) => x.lessonId!))]
		.map((id) => course?.units.flatMap((u) => u.lessons).find((l) => l.id === id))
		.filter((l): l is NonNullable<typeof l> => !!l);

	return (
		<View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 56 }}>
				<Press onPress={() => router.back()} hitSlop={10} accessibilityLabel="Close the quiz">
					<X size={24} color={t.fg} />
				</Press>
				<View style={{ flex: 1 }}>
					<Meter value={finished ? 1 : order.length ? (pos + (answered ? 1 : 0)) / order.length : 0} color={hue.base} height={8} />
				</View>
				<T v="label">{finished ? 'Done' : order.length ? `${pos + 1}/${order.length}` : ''}</T>
			</View>

			{errorCode(error) === 'PAYWALL' ? (
				<View style={{ padding: 20, gap: 12 }}>
					<T v="title">Quizzes come with a plan.</T>
					<T>One plan opens every lesson, quiz and flashcard in every course.</T>
					<Button title="See the plan" onPress={() => router.push('/plan')} />
				</View>
			) : error && !data ? (
				<View style={{ padding: 20 }}>
					<ErrorBox message={errorText(error)} onRetry={() => refetch({ requestPolicy: 'network-only' })} />
				</View>
			) : finished ? (
				<ScrollView contentContainerStyle={{ padding: 22, gap: 18, alignItems: 'center', paddingBottom: insets.bottom + 30 }}>
					<T v="label">{label}</T>
					<Ring value={score} size={150} stroke={12} color={score >= 0.7 ? t.success : hue.base} track={t.surface2} duration={1300}>
						<Text style={{ fontFamily: fonts.display, fontSize: 34, color: t.fg }}>{Math.round(score * 100)}%</Text>
						<T v="small">
							{right} of {order.length}
						</T>
					</Ring>
					<T v="title" style={{ textAlign: 'center' }}>
						{score >= 0.9 ? 'Outstanding.' : score >= 0.7 ? 'Strong work.' : score >= 0.5 ? 'Getting there.' : 'A good start.'}
					</T>
					<T style={{ textAlign: 'center' }}>
						{score >= 0.7 ? 'You know this. Keep it fresh with flashcards.' : 'Go back over the lessons below, then try again. Every try counts.'}
					</T>
					{missed.length ? (
						<View style={{ alignSelf: 'stretch', gap: 8 }}>
							<T v="label">Worth another look</T>
							{missed.map((l) => (
								<Press key={l.id} onPress={() => router.push(lessonHref(slug, l.id) as never)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: radius.md, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line }}>
									<BookOpen size={18} color={hue.base} />
									<Text style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: t.fg }}>{plain(l.title)}</Text>
								</Press>
							))}
						</View>
					) : null}
					<View style={{ alignSelf: 'stretch', gap: 10 }}>
						<Button kind="hue" hue={hue} title="Try again" icon={<RotateCcw size={16} color={t.onHue} />} onPress={begin} />
						<Button kind="ghost" title="Back to the course" onPress={() => router.back()} />
					</View>
					{score >= 0.7 ? <Confetti /> : null}
				</ScrollView>
			) : q ? (
				<ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 30, gap: 16 }}>
					<Animated.View key={q.id} entering={SlideInRight.springify().damping(20)} exiting={SlideOutLeft.duration(200)} style={{ backgroundColor: t.surface, borderRadius: radius.lg, padding: 18, borderWidth: hair, borderColor: t.line }}>
						<QuestionCard
							q={q}
							hue={hue}
							onAnswer={(ok, response) => {
								setAnswered(true);
								setResults((r) => ({ ...r, [q.id]: ok }));
								track({ kind: 'attempt', courseSlug: slug, lessonId: q.lessonId, questionId: q.id, context: isFinal ? 'final_quiz' : 'unit_quiz', correct: ok, response });
							}}
							onReport={() => setReport({ courseSlug: slug, questionId: q.id, what: 'this question' })}
						/>
					</Animated.View>
					{answered ? (
						<Animated.View entering={FadeIn}>
							<Button
								kind="hue"
								hue={hue}
								title={pos + 1 >= order.length ? 'See my score' : 'Next question'}
								onPress={() => {
									setPos(pos + 1);
									setAnswered(false);
								}}
							/>
						</Animated.View>
					) : null}
				</ScrollView>
			) : (
				<View style={{ padding: 20 }}>
					<T>This quiz has no questions yet.</T>
				</View>
			)}
			<ReportSheet target={report} onClose={() => setReport(null)} />
		</View>
	);
}
