// Course: hero in the course's colour, progress, plan, units and lessons (web /c/[slug]).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from 'urql';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Layers, Lock, PenLine, Target, Trophy } from 'lucide-react-native';
import { COURSE, ENROLL, UPDATE_ENROLLMENT } from '../../../lib/api/queries';
import type { CourseOutline, CourseProgress, Plan, Today } from '../../../lib/api/types';
import { errorText, gql } from '../../../lib/api/client';
import { isCompleted, useProgress } from '../../../lib/progress';
import { alpha, fonts, radius, useTheme, useTint } from '../../../lib/theme';
import { lessonHref, quizHref } from '../../../lib/nav';
import { plain } from '../../../lib/html';
import { addDays, lagosToday } from '../../../lib/study/srs';
import { shortDate } from '../../../lib/study/ids';
import { Html } from '../../../components/Html';
import { Button, Card, ErrorBox, Loading, Press, T, hair } from '../../../components/ui';
import { Ring } from '../../../components/Ring';
import { CourseIcon } from '../../../components/CourseIcon';
import { CourseHalo } from '../../../components/CourseHalo';

type Data = { course: CourseOutline; courseProgress: CourseProgress | null; today: Today; plans: Plan[] };

export default function CourseScreen() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
	const t = useTheme();
	const hue = useTint(slug);
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const overlay = useProgress((s) => s.completed);
	const synced = useProgress((s) => s.synced);
	const [{ data, error, fetching }, refetch] = useQuery<Data>({ query: COURSE, variables: { slug, signedIn: true, preview: null } });
	const [open, setOpen] = useState<Record<string, boolean>>({});

	useEffect(() => {
		refetch({ requestPolicy: 'network-only' });
	}, [refetch, synced]);
	useFocusEffect(useCallback(() => refetch({ requestPolicy: 'cache-and-network' }), [refetch]));

	const c = data?.course;
	const p = data?.courseProgress ?? null;
	const firstOpenUnit = useMemo(() => {
		if (!c) return null;
		const next = p?.nextLesson?.id;
		return c.units.find((u) => u.lessons.some((l) => l.id === next))?.id ?? c.units[0]?.id;
	}, [c, p]);

	if (!data && fetching) return <Loading />;
	if (!c)
		return (
			<View style={{ flex: 1, backgroundColor: t.bg, padding: 18, paddingTop: insets.top + 50 }}>
				<ErrorBox message={error ? errorText(error) : "We couldn't find that course."} onRetry={() => refetch({ requestPolicy: 'network-only' })} />
			</View>
		);

	const done = (id: string) => isCompleted(id, p?.completedLessons, overlay);
	const allLessons = c.units.flatMap((u) => u.lessons);
	const completed = allLessons.filter((l) => done(l.id)).length;
	const covered = allLessons.length ? completed / allLessons.length : 0;
	const next = p?.nextLesson ?? allLessons.find((l) => !done(l.id) && !l.locked) ?? allLessons[0];
	const started = Boolean(p?.startedLessons.length || completed);
	const time = c.card.minutes >= 90 ? `${Math.round(c.card.minutes / 60)} h` : `${c.card.minutes} min`;

	return (
		<View style={{ flex: 1, backgroundColor: t.bg }}>
			<ScrollView
				contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 18, width: '100%', maxWidth: 760, alignSelf: 'center', gap: 16 }}
				refreshControl={<RefreshControl refreshing={false} tintColor={hue.base} onRefresh={() => refetch({ requestPolicy: 'network-only' })} />}
			>
				<Press onPress={() => router.canGoBack() ? router.back() : router.replace('/courses')} accessibilityRole="button" style={{ minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
					<ArrowLeft size={18} color={t.accent} />
					<T v="bodyStrong">Back</T>
				</Press>
				<View style={{ backgroundColor: hue.wash, borderWidth: hair, borderColor: alpha(hue.base, 0.28), borderRadius: radius.lg, padding: 20, gap: 14, overflow: 'hidden' }}>
					<CourseHalo color={hue.base} />
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
						<View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: hue.soft, alignItems: 'center', justifyContent: 'center' }}>
							<CourseIcon name={c.card.icon} size={25} color={hue.ink} />
						</View>
						<View style={{ flex: 1, gap: 3 }}>
							<T v="label" color={hue.ink}>{c.card.code}</T>
							<T v="small">{c.units.length} {c.units.length === 1 ? 'unit' : 'units'} · {allLessons.length} lessons · {time}</T>
						</View>
					</View>
					<T v="display" accessibilityRole="header">{plain(c.card.title)}</T>
					{c.card.nickname ? <T>{plain(c.card.nickname)}</T> : null}
					{next ? (
						<View style={{ gap: 8 }}>
							<T v="small">{started ? 'Next' : 'First'}: {plain(next.title)}</T>
							<Button title={started ? 'Continue' : 'Start the course'} icon={<ArrowRight size={17} color={t.onAmber} />} onPress={() => router.push(lessonHref(c.card.slug, next.id))} />
						</View>
					) : null}
					{started || p ? (
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, borderTopWidth: hair, borderColor: alpha(hue.base, 0.26), paddingTop: 14 }}>
							<ProgressStat value={covered} label="Covered" color={hue.base} track={hue.soft} />
							<ProgressStat value={p?.examReady ?? 0} label="Exam-ready" color={t.success} track={hue.soft} />
						</View>
					) : null}
				</View>

				<View style={{ gap: 16 }}>
					{!c.viewerHasAccess ? (
						<Card style={{ gap: 8, backgroundColor: t.accentSoft, borderColor: 'transparent' }}>
							<T v="bodyStrong">The first lesson is free.</T>
							<T>One plan opens every lesson, quiz and flashcard in every course.</T>
							<Button small title="See the plan" onPress={() => router.push('/plan')} style={{ alignSelf: 'flex-start' }} />
						</Card>
					) : null}

					<View style={{ flexDirection: 'row', gap: 10 }}>
						<Tool label="Flashcards" sub={p?.cardsDue ? `${p.cardsDue} due` : `${c.flashcardCount} cards`} Icon={Layers} onPress={() => router.push(`/c/${c.card.slug}/cards` as never)} disabled={!c.flashcardCount} />
						<Tool label="Practice" sub={`${c.practiceCount} questions`} Icon={PenLine} onPress={() => router.push(`/c/${c.card.slug}/practice` as never)} disabled={!c.practiceCount} />
						<Tool label="Final quiz" sub={p?.finalQuizBest != null ? `Best ${Math.round(p.finalQuizBest * 100)}%` : `${c.finalQuizCount} questions`} Icon={Trophy} onPress={() => router.push(quizHref(c.card.slug, 'final') as never)} disabled={!c.finalQuizCount} />
					</View>

					<T v="title" accessibilityRole="header" style={{ marginTop: 6 }}>
						The route
					</T>
					{c.units.map((u, ui) => {
						const isOpen = open[u.id] ?? u.id === firstOpenUnit;
						const doneCount = u.lessons.filter((l) => done(l.id)).length;
						return (
							<View key={u.id} style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: hair, borderColor: t.line, overflow: 'hidden' }}>
								<Press onPress={() => setOpen({ ...open, [u.id]: !isOpen })} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} style={{ padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
									<Ring value={u.lessons.length ? doneCount / u.lessons.length : 0} size={44} stroke={4} color={hue.base} track={hue.soft} duration={250}>
										{doneCount > 0 && doneCount === u.lessons.length ? <Check size={17} color={t.success} /> : <T v="micro" color={hue.ink}>{doneCount}/{u.lessons.length}</T>}
									</Ring>
									<View style={{ flex: 1 }}>
										<T v="micro" color={hue.ink}>Unit {ui + 1}</T>
										<Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: t.fg }}>{plain(u.title)}</Text>
										<T v="small">
											{doneCount}/{u.lessons.length} lessons{u.quizCount ? ` · quiz of ${u.quizCount}` : ''}
										</T>
									</View>
									<View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
										<ChevronDown size={20} color={t.muted} />
									</View>
								</Press>
								{isOpen ? (
									<View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 4 }}>
										{u.summary ? <Html html={u.summary} read={false} style={{ fontSize: 14, lineHeight: 20, color: t.muted }} /> : null}
										{u.lessons.map((l) => {
											const d = done(l.id);
											const here = !d && next?.id === l.id;
											return (
												<Press
													key={l.id}
													onPress={() => router.push(lessonHref(c.card.slug, l.id) as never)}
													accessibilityRole="button"
													accessibilityLabel={`${l.title}${l.locked ? ', locked' : d ? ', done' : ''}`}
													style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, backgroundColor: here ? hue.wash : 'transparent' }}
												>
													<View style={{ width: 25, height: 25, borderRadius: 13, borderWidth: 1.5, borderColor: d ? t.success : here ? hue.base : t.line2, backgroundColor: d ? t.successSoft : here ? hue.soft : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
														{d ? <Check size={14} color={t.success} /> : l.locked ? <Lock size={12} color={t.muted} /> : here ? <ArrowRight size={13} color={hue.ink} /> : null}
													</View>
													<View style={{ flex: 1 }}>
														<Text style={{ fontFamily: here ? fonts.bodyBold : fonts.bodyMedium, fontSize: 15, color: l.locked ? t.muted : t.fg }}>{plain(l.title)}</Text>
														{l.tagline ? (
															<T v="small" numberOfLines={1}>
																{plain(l.tagline)}
															</T>
														) : null}
													</View>
													<T v="small">{l.minutes}m</T>
												</Press>
											);
										})}
										{u.quizCount ? (
											<Press onPress={() => router.push(quizHref(c.card.slug, u.id) as never)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 }}>
												<Target size={22} color={hue.base} />
												<Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: hue.ink }}>Unit quiz · {u.quizCount} questions</Text>
											</Press>
										) : null}
									</View>
								) : null}
							</View>
						);
					})}
					<PlanCard slug={c.card.slug} p={p} onSaved={() => refetch({ requestPolicy: 'network-only' })} />
					{c.labs.length ? (
						<Card style={{ gap: 6 }}>
							<T v="bodyStrong">Labs</T>
							<T>Labs open on the website for now: study.kushi.ng/c/{c.card.slug}.</T>
						</Card>
					) : null}
				</View>
			</ScrollView>
		</View>
	);
}

function ProgressStat({ value, label, color, track }: { value: number; label: string; color: string; track: string }) {
	return (
		<View style={{ flex: 1, minWidth: 112, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
			<Ring value={value} size={46} stroke={4.5} color={color} track={track} duration={300}>
				<T v="micro">{Math.round(value * 100)}%</T>
			</Ring>
			<T v="small" style={{ flexShrink: 1 }}>{label}</T>
		</View>
	);
}

function Tool({ label, sub, Icon, onPress, disabled }: { label: string; sub: string; Icon: typeof Layers; onPress: () => void; disabled?: boolean }) {
	const t = useTheme();
	return (
		<Press haptic onPress={onPress} disabled={disabled} accessibilityRole="button" style={{ flex: 1, backgroundColor: t.surface, borderRadius: radius.md, borderWidth: hair, borderColor: t.line, padding: 12, gap: 6, opacity: disabled ? 0.45 : 1 }}>
			<Icon size={20} color={t.accent} />
			<Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: t.fg }}>{label}</Text>
			<T v="small">{sub}</T>
		</Press>
	);
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Add to my courses / exam date / study days (web course page "plan" card). */
function PlanCard({ slug, p, onSaved }: { slug: string; p: CourseProgress | null; onSaved: () => void }) {
	const t = useTheme();
	const hue = useTint(slug);
	const [edit, setEdit] = useState(false);
	const [exam, setExam] = useState<string | null>(p?.enrollment?.examDate ?? null);
	const [days, setDays] = useState<number[]>(p?.enrollment?.studyDays ?? [1, 2, 3, 4, 5]);
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState('');
	const enrolled = !!p?.enrollment;

	const save = async () => {
		setBusy(true);
		setErr('');
		try {
			await gql(enrolled ? UPDATE_ENROLLMENT : ENROLL, { slug, examDate: exam, studyDays: days });
			setEdit(false);
			onSaved();
		} catch (e) {
			setErr(errorText(e));
		} finally {
			setBusy(false);
		}
	};

	if (enrolled && !edit)
		return (
			<Card style={{ gap: 6 }}>
				<T v="bodyStrong">In your courses</T>
				<T>{p?.enrollment?.examDate ? `Exam on ${shortDate(p.enrollment.examDate)}. Today's plan paces you to it.` : 'No exam date yet. Add one and Today paces you to it.'}</T>
				<Button small kind="solid" title="Change plan" onPress={() => setEdit(true)} style={{ alignSelf: 'flex-start' }} />
			</Card>
		);

	const today = lagosToday();
	return (
		<Card style={{ gap: 12 }}>
			<T v="bodyStrong">{enrolled ? 'Your plan' : 'Add to my courses'}</T>
			<T v="small">When is the exam? Your study plan spreads the lessons out before that date.</T>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
				<Button small kind="solid" title="−1 week" onPress={() => setExam(addDays(exam ?? addDays(today, 42), -7) < addDays(today, 1) ? addDays(today, 1) : addDays(exam ?? addDays(today, 42), -7))} />
				<Text style={{ flex: 1, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 15, color: t.fg }}>{exam ? shortDate(exam) : 'No date'}</Text>
				<Button small kind="solid" title="+1 week" onPress={() => setExam(addDays(exam ?? today, 7))} />
			</View>
			{exam ? <Button small kind="ghost" title="No exam date" onPress={() => setExam(null)} style={{ alignSelf: 'center' }} /> : null}
			<T v="small">Study days</T>
			<View style={{ flexDirection: 'row', gap: 6 }}>
				{DAYS.map((d, i) => {
					const on = days.includes(i);
					return (
						<Press key={d} haptic onPress={() => setDays(on ? days.filter((x) => x !== i) : [...days, i].sort())} style={{ flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? hue.soft : t.surface2, borderWidth: on ? 1.5 : 0, borderColor: hue.base }}>
							<Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: on ? hue.ink : t.muted }}>{d}</Text>
						</Press>
					);
				})}
			</View>
			{err ? <T color={t.danger}>{err}</T> : null}
			<Button kind="hue" hue={hue} title={enrolled ? 'Update plan' : 'Add to my courses'} onPress={save} busy={busy} disabled={!days.length} />
		</Card>
	);
}
