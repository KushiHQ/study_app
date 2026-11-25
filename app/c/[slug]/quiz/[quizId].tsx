// Unit quiz and final quiz: one question per card, a progress bar, haptics,
// and an upgraded 14 · Quiz Summary result screen with score ring, stat tiles, and lessons to revisit.
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from 'urql';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, BookOpen, RotateCcw } from 'lucide-react-native';
import { COURSE, FINAL_QUIZ, UNIT_QUIZ } from '../../../../lib/api/queries';
import type { CourseOutline, Question } from '../../../../lib/api/types';
import { errorCode, errorText } from '../../../../lib/api/client';
import { track } from '../../../../lib/progress';
import { useSession } from '../../../../lib/session';
import { questionsOf, quizIdOf } from '../../../../lib/study/payload';
import { fullId } from '../../../../lib/study/ids';
import { lessonHref } from '../../../../lib/nav';
import { plain } from '../../../../lib/html';
import { alpha, fonts, radius, useTheme, useTint } from '../../../../lib/theme';
import { QuestionCard } from '../../../../components/QuestionCard';
import { Ring } from '../../../../components/Ring';
import { ReportSheet, type ReportTarget } from '../../../../components/ReportSheet';
import { TopBar } from '../../../../components/TopBar';
import { Button, Card, ErrorBox, Eyebrow, Loading, Meter, Press, T, TopGlow, hair } from '../../../../components/ui';

export default function Quiz() {
	const { slug, quizId: qp } = useLocalSearchParams<{ slug: string; quizId: string }>();
	const isFinal = qp === 'final';
	const unitId = isFinal ? null : fullId(slug, qp);
	const t = useTheme();
	const hue = useTint(slug);
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const firstName = useSession((s) => s.user?.name?.trim().split(/\s+/)[0]);
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
	const wrong = Math.max(0, order.length - right);
	const score = order.length ? right / order.length : 0;
	const passed = score >= 0.7;

	useEffect(() => {
		if (finished) track({ kind: 'quiz_result', courseSlug: slug, quizId, score: right, total: order.length });
	}, [finished]);

	if (!data && fetching) return <Loading label="Getting your questions…" />;
	const q = order[pos];
	const missed = [...new Set(order.filter((x) => results[x.id] === false && x.lessonId).map((x) => x.lessonId!))]
		.map((id) => course?.units.flatMap((u) => u.lessons).find((l) => l.id === id))
		.filter((l): l is NonNullable<typeof l> => !!l);

	return (
		<View style={{ flex: 1, backgroundColor: t.bg }}>
			<TopGlow color={finished ? (passed ? t.success : t.amber) : hue.base} height={finished ? 320 : 260} />

			<View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, gap: 10, paddingBottom: 8 }}>
				<TopBar
					backLabel={course?.card.code || 'Course'}
					onBack={() => router.back()}
					showProfile={false}
					right={
						order.length ? (
							<View
								style={{
									height: 32,
									paddingHorizontal: 11,
									borderRadius: radius.pill,
									justifyContent: 'center',
									backgroundColor: t.name === 'night' ? 'rgba(19, 27, 50, 0.78)' : alpha(t.surface, 0.9),
									borderWidth: hair,
									borderColor: t.line2
								}}
							>
								<Text style={{ fontFamily: fonts.mono, fontSize: 11.5, color: t.fg }}>
									{finished ? 'DONE' : `${pos + 1} / ${order.length}`}
								</Text>
							</View>
						) : undefined
					}
				/>
				<Meter value={finished ? 1 : order.length ? (pos + (answered ? 1 : 0)) / order.length : 0} color={finished && passed ? t.success : hue.base} height={5} />
			</View>

			{errorCode(error) === 'PAYWALL' ? (
				<View style={{ padding: 20, gap: 12 }}>
					<T v="title">Quizzes come with a plan.</T>
					<T>One plan opens every lesson, quiz and flashcard in every course.</T>
					<Button title="See the plan" onPress={() => router.push('/plan')} style={{ borderRadius: 16 }} />
				</View>
			) : error && !data ? (
				<View style={{ padding: 20 }}>
					<ErrorBox message={errorText(error)} onRetry={() => refetch({ requestPolicy: 'network-only' })} />
				</View>
			) : finished ? (
				<ScrollView
					contentContainerStyle={{
						padding: 22,
						gap: 18,
						alignItems: 'center',
						paddingBottom: insets.bottom + 36,
						maxWidth: 560,
						width: '100%',
						alignSelf: 'center'
					}}
				>
					<Ring value={score} size={156} stroke={12} color={passed ? t.success : t.amber} track={t.surface2} duration={900}>
						<Text style={{ fontFamily: fonts.display, fontSize: 32, color: t.fg }}>{Math.round(score * 100)}%</Text>
						<Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.1, color: passed ? t.success : t.accent, marginTop: 2 }}>
							{passed ? 'EXAM READY' : 'KEEP GOING'}
						</Text>
					</Ring>

					<View style={{ alignItems: 'center', gap: 6 }}>
						<Eyebrow color={passed ? t.success : t.accent}>
							{course?.card.code ? `${course.card.code} · ${label}` : label}
						</Eyebrow>
						<Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 31, letterSpacing: -0.6, color: t.fg, textAlign: 'center' }}>
							{passed ? `Strong work${firstName ? `, ${firstName}` : ''}.` : `Good effort${firstName ? `, ${firstName}` : ''}.`}
						</Text>
						<T style={{ textAlign: 'center', maxWidth: 340 }}>
							{passed ? 'You know this material well. Keep it fresh with flashcards.' : 'Revisit the lessons below, then take another shot. Every pass locks it in.'}
						</T>
					</View>

					{/* 3 Flat Stat Tiles */}
					<View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
						<SummaryTile label="Correct" value={String(right)} color={t.success} />
						<SummaryTile label="Missed" value={String(wrong)} color={wrong > 0 ? t.danger : t.muted} />
						<SummaryTile label="Total" value={String(order.length)} color={t.fg} />
					</View>

					{missed.length ? (
						<View style={{ alignSelf: 'stretch', gap: 8 }}>
							<Eyebrow>Worth another look</Eyebrow>
							{missed.map((l) => (
								<Card
									key={l.id}
									onPress={() => router.push(lessonHref(slug, l.id) as never)}
									tint={hue.base}
									tintStrength={t.name === 'night' ? 8 : 5}
									style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 16 }}
								>
									<View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: alpha(hue.base, 0.16), alignItems: 'center', justifyContent: 'center' }}>
										<BookOpen size={16} color={hue.ink} />
									</View>
									<Text style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 14.5, color: t.fg }}>{plain(l.title)}</Text>
									<ArrowRight size={15} color={t.muted} />
								</Card>
							))}
						</View>
					) : null}

					<View style={{ alignSelf: 'stretch', gap: 10, marginTop: 4 }}>
						<Button title="Back to course" icon={<ArrowRight size={17} color={t.onAmber} />} onPress={() => router.back()} style={{ borderRadius: 16 }} />
						<Button kind="solid" title="Try again" icon={<RotateCcw size={16} color={t.fg} />} onPress={begin} style={{ borderRadius: 16 }} />
					</View>
				</ScrollView>
			) : q ? (
				<ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 32, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
					<Card tint={hue.base} tintStrength={t.name === 'night' ? 8 : 4} style={{ borderRadius: 22, padding: 18 }}>
						<QuestionCard
							key={q.id}
							q={q}
							hue={hue}
							onAnswer={(ok, response) => {
								setAnswered(true);
								setResults((r) => ({ ...r, [q.id]: ok }));
								track({ kind: 'attempt', courseSlug: slug, lessonId: q.lessonId, questionId: q.id, context: isFinal ? 'final_quiz' : 'unit_quiz', correct: ok, response });
							}}
							onReport={() => setReport({ courseSlug: slug, questionId: q.id, what: 'this question' })}
						/>
					</Card>
					{answered ? (
						<Button
							title={pos + 1 >= order.length ? 'See my score' : 'Next question'}
							icon={<ArrowRight size={17} color={t.onAmber} />}
							onPress={() => {
								setPos(pos + 1);
								setAnswered(false);
							}}
							style={{ borderRadius: 16 }}
						/>
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

function SummaryTile({ label, value, color }: { label: string; value: string; color: string }) {
	const t = useTheme();
	return (
		<Card style={{ flex: 1, padding: 14, borderRadius: 18, alignItems: 'center', gap: 4 }}>
			<Text style={{ fontFamily: fonts.display, fontSize: 22, color }}>{value}</Text>
			<Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: t.muted }}>{label}</Text>
		</Card>
	);
}
