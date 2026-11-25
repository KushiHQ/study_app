// Course Overview: matches Figma 03 · Course Overview (dual progress rings + inset-grouped unit checklist).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from 'urql';
import * as Sentry from '@sentry/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronDown, ChevronLeft, Layers, Lock, PenLine, Target, Trophy } from 'lucide-react-native';
import { COURSE, ENROLL, UPDATE_ENROLLMENT } from '../../../lib/api/queries';
import type { CourseOutline, CourseProgress, Plan, Today } from '../../../lib/api/types';
import { errorText, gql } from '../../../lib/api/client';
import { isCompleted, useProgress } from '../../../lib/progress';
import { alpha, fonts, radius, useTheme, useTint } from '../../../lib/theme';
import { lessonHref, quizHref } from '../../../lib/nav';
import { plain } from '../../../lib/html';
import { addDays, lagosToday } from '../../../lib/study/srs';
import { shortDate } from '../../../lib/study/ids';
import { Button, Card, ErrorBox, Loading, Press, Reveal, T, hair } from '../../../components/ui';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { Ring } from '../../../components/Ring';

type Data = { course: CourseOutline; courseProgress: CourseProgress | null; today: Today; plans: Plan[] };

export default function CourseScreen() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
	return (
		<ErrorBoundary context={`course:${slug ?? 'unknown'}`}>
			<CourseScreenInner slug={slug} />
		</ErrorBoundary>
	);
}

function CourseScreenInner({ slug }: { slug: string }) {
	const t = useTheme();
	const hue = useTint(slug);
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const overlay = useProgress((s) => s.completed);
	const synced = useProgress((s) => s.synced);
	const [{ data, error, fetching }, refetch] = useQuery<Data>({ query: COURSE, variables: { slug, signedIn: true, preview: null } });
	const [open, setOpen] = useState<Record<string, boolean>>({});

	useEffect(() => {
		if (slug) Sentry.addBreadcrumb({ category: 'navigation', message: `Open course ${slug}`, level: 'info' });
	}, [slug]);

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
			<View style={{ flex: 1, backgroundColor: t.bg, padding: 20, paddingTop: insets.top + 50 }}>
				<ErrorBox message={error ? errorText(error) : "We couldn't find that course."} onRetry={() => refetch({ requestPolicy: 'network-only' })} />
			</View>
		);

	const done = (id: string) => isCompleted(id, p?.completedLessons, overlay);
	const allLessons = c.units.flatMap((u) => u.lessons);
	const completed = allLessons.filter((l) => done(l.id)).length;
	const covered = allLessons.length ? completed / allLessons.length : 0;
	const next = p?.nextLesson ?? allLessons.find((l) => !done(l.id) && !l.locked) ?? allLessons[0];
	const started = Boolean(p?.startedLessons.length || completed);

	return (
		<View style={{ flex: 1, backgroundColor: t.bg }}>
			<ScrollView
				contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 20, width: '100%', maxWidth: 680, alignSelf: 'center', gap: 18 }}
				refreshControl={<RefreshControl refreshing={false} tintColor={hue.base} onRefresh={() => refetch({ requestPolicy: 'network-only' })} />}
			>
				{/* Back Nav */}
				<Press
					onPress={() => (router.canGoBack() ? router.back() : router.replace('/courses'))}
					accessibilityRole="button"
					style={{ minHeight: 36, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: -4 }}
				>
					<ChevronLeft size={20} color={t.muted} />
					<Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: t.muted }}>Courses</Text>
				</Press>

				{/* Course Code Pill + Title */}
				<Reveal style={{ gap: 10 }}>
					<View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: alpha(hue.base, 0.16) }}>
						<Text style={{ fontFamily: fonts.mono, fontSize: 12, color: hue.ink, letterSpacing: 0.6 }}>{c.card.code}</Text>
					</View>
					<Text accessibilityRole="header" style={{ fontFamily: fonts.bodyBold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5, color: t.fg }}>
						{plain(c.card.title)}
					</Text>
				</Reveal>

				{/* Dual Progress Rings + Full-Width Continue Card */}
				<Reveal follow>
					<Card tint={hue.base} tintStrength={t.name === 'night' ? 10 : 6} style={{ padding: 20, borderRadius: 24, gap: 18, alignItems: 'center' }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 36 }}>
							<RingStat value={covered} label="Covered" color={t.amber} track={t.line2} />
							<RingStat value={p?.examReady ?? 0} label="Exam-ready" color={t.success} track={t.line2} />
						</View>
						{next ? (
							<Button
								title={started ? 'Continue' : 'Start course'}
								onPress={() => router.push(lessonHref(c.card.slug, next.id))}
								style={{ alignSelf: 'stretch', borderRadius: 16 }}
							/>
						) : null}
					</Card>
				</Reveal>

				{!c.viewerHasAccess ? (
					<Card tint={t.amber} tintStrength={12} style={{ gap: 8 }}>
						<T v="bodyStrong">The first lesson is free.</T>
						<T v="small">One plan opens every lesson, quiz and flashcard in every course.</T>
						<Button small title="See the plan" onPress={() => router.push('/plan')} style={{ alignSelf: 'flex-start' }} />
					</Card>
				) : null}

				{/* Quick Study Tools */}
				<View style={{ flexDirection: 'row', gap: 10 }}>
					<Tool label="Flashcards" sub={p?.cardsDue ? `${p.cardsDue} due` : `${c.flashcardCount}`} Icon={Layers} onPress={() => router.push(`/c/${c.card.slug}/cards` as never)} disabled={!c.flashcardCount} />
					<Tool label="Practice" sub={`${c.practiceCount} Qs`} Icon={PenLine} onPress={() => router.push(`/c/${c.card.slug}/practice` as never)} disabled={!c.practiceCount} />
					<Tool label="Final quiz" sub={p?.finalQuizBest != null ? `${Math.round(p.finalQuizBest * 100)}%` : `${c.finalQuizCount} Qs`} Icon={Trophy} onPress={() => router.push(quizHref(c.card.slug, 'final') as never)} disabled={!c.finalQuizCount} />
				</View>

				{/* Units — Inset-Grouped Checklist */}
				{c.units.map((u, ui) => {
					const isOpen = open[u.id] ?? u.id === firstOpenUnit;
					return (
						<View key={u.id} style={{ gap: 10 }}>
							<Press
								onPress={() => setOpen({ ...open, [u.id]: !isOpen })}
								accessibilityRole="button"
								accessibilityState={{ expanded: isOpen }}
								style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
							>
								<Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 17, color: t.fg }}>
									Unit {ui + 1} · {plain(u.title)}
								</Text>
								<View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
									<ChevronDown size={18} color={t.muted} />
								</View>
							</Press>

							{isOpen ? (
								<Card padded={false} style={{ borderRadius: 20 }}>
									{u.lessons.map((l, li) => {
										const d = done(l.id);
										const here = !d && next?.id === l.id;
										return (
											<Press
												key={l.id}
												haptic
												onPress={() => router.push(lessonHref(c.card.slug, l.id) as never)}
												accessibilityRole="button"
												accessibilityLabel={`${l.title}${l.locked ? ', locked' : d ? ', done' : ''}`}
												style={{
													flexDirection: 'row',
													alignItems: 'center',
													gap: 12,
													paddingVertical: 14,
													paddingHorizontal: 16,
													borderTopWidth: li === 0 ? 0 : hair,
													borderColor: t.line
												}}
											>
												{d ? (
													<View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.success, alignItems: 'center', justifyContent: 'center' }}>
														<Check size={13} color={t.onHue} strokeWidth={2.6} />
													</View>
												) : here ? (
													<View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: alpha(t.amber, 0.22), alignItems: 'center', justifyContent: 'center' }}>
														<View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.amber }} />
													</View>
												) : l.locked ? (
													<View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
														<Lock size={15} color={t.muted} />
													</View>
												) : (
													<View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: t.line2 }} />
												)}
												<Text
													numberOfLines={1}
													style={{
														flex: 1,
														fontFamily: here ? fonts.bodySemi : fonts.bodyMedium,
														fontSize: 14.5,
														color: here ? t.accent : l.locked ? t.muted : t.fg
													}}
												>
													{ui + 1}.{li + 1} {plain(l.title)}
												</Text>
											</Press>
										);
									})}
									{u.quizCount ? (
										<Press
											haptic
											onPress={() => router.push(quizHref(c.card.slug, u.id) as never)}
											style={{
												flexDirection: 'row',
												alignItems: 'center',
												gap: 12,
												paddingVertical: 14,
												paddingHorizontal: 16,
												borderTopWidth: hair,
												borderColor: t.line
											}}
										>
											<Target size={18} color={hue.base} />
											<Text style={{ fontFamily: fonts.bodySemi, fontSize: 14.5, color: hue.ink }}>
												Unit {ui + 1} quiz · {u.quizCount} questions
											</Text>
										</Press>
									) : null}
								</Card>
							) : null}
						</View>
					);
				})}

				<PlanCard slug={c.card.slug} p={p} onSaved={() => refetch({ requestPolicy: 'network-only' })} />
				{c.labs.length ? (
					<Card style={{ gap: 6 }}>
						<T v="bodyStrong">Labs</T>
						<T v="small">Interactive labs open on study.kushi.ng/c/{c.card.slug}.</T>
					</Card>
				) : null}
			</ScrollView>
		</View>
	);
}

function RingStat({ value, label, color, track }: { value: number; label: string; color: string; track: string }) {
	const t = useTheme();
	return (
		<View style={{ alignItems: 'center', gap: 8 }}>
			<Ring value={value} size={82} stroke={7} color={color} track={track} duration={350}>
				<Text style={{ fontFamily: fonts.bodyBold, fontSize: 19, color: t.fg }}>{Math.round(value * 100)}%</Text>
			</Ring>
			<Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: t.muted }}>{label}</Text>
		</View>
	);
}

function Tool({ label, sub, Icon, onPress, disabled }: { label: string; sub: string; Icon: typeof Layers; onPress: () => void; disabled?: boolean }) {
	const t = useTheme();
	return (
		<Card onPress={disabled ? undefined : onPress} style={{ flex: 1, padding: 12, borderRadius: 16, gap: 5, opacity: disabled ? 0.45 : 1 }}>
			<Icon size={18} color={t.accent} />
			<Text style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: t.fg }}>{label}</Text>
			<Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.muted }}>{sub}</Text>
		</Card>
	);
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
				<T v="small">{p?.enrollment?.examDate ? `Exam on ${shortDate(p.enrollment.examDate)}. Today's plan paces you to it.` : 'No exam date yet. Add one and Today paces you to it.'}</T>
				<Button small kind="solid" title="Change plan" onPress={() => setEdit(true)} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
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
