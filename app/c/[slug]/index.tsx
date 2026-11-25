// Course Overview: matches OpenPencil 08 · Course Overview
// (uninterrupted course-hue top glow, dual progress rings, numbered syllabus unit cards with inline progress & Unit Quiz strip).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from 'urql';
import * as Sentry from '@sentry/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Check, ChevronDown, Layers, Lock, PenLine, Target, Trophy } from 'lucide-react-native';
import { COURSE, ENROLL, UPDATE_ENROLLMENT } from '../../../lib/api/queries';
import type { CourseOutline, CourseProgress, Plan, Today } from '../../../lib/api/types';
import { errorText, gql } from '../../../lib/api/client';
import { isCompleted, useProgress } from '../../../lib/progress';
import { alpha, fonts, mix, radius, useTheme, useTint } from '../../../lib/theme';
import { lessonHref, quizHref } from '../../../lib/nav';
import { plain } from '../../../lib/html';
import { addDays, lagosToday } from '../../../lib/study/srs';
import { shortDate } from '../../../lib/study/ids';
import { Button, Card, ErrorBox, Eyebrow, Loading, Meter, Press, Reveal, T, TopGlow, hair } from '../../../components/ui';
import { TopBar } from '../../../components/TopBar';
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
	const completedUnitsCount = c.units.filter((u) => u.lessons.length > 0 && u.lessons.every((l) => done(l.id))).length;

	return (
		<View style={{ flex: 1, backgroundColor: t.bg }}>
			<TopGlow color={hue.base} height={290} />
			<ScrollView
				contentContainerStyle={{
					paddingTop: insets.top + 8,
					paddingBottom: insets.bottom + 40,
					paddingHorizontal: 20,
					width: '100%',
					maxWidth: 680,
					alignSelf: 'center',
					gap: 18
				}}
				refreshControl={<RefreshControl refreshing={false} tintColor={hue.base} onRefresh={() => refetch({ requestPolicy: 'network-only' })} />}
			>
				{/* Transparent Back + Profile Top Bar */}
				<TopBar
					backLabel="Courses"
					onBack={() => (router.canGoBack() ? router.back() : router.replace('/courses'))}
				/>

				{/* Course Code Pill + Meta + Title */}
				<Reveal style={{ gap: 10 }}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
						<View
							style={{
								paddingHorizontal: 10,
								paddingVertical: 5,
								borderRadius: 8,
								backgroundColor: alpha(hue.base, 0.16),
								borderWidth: hair,
								borderColor: alpha(hue.base, 0.34)
							}}
						>
							<Text style={{ fontFamily: fonts.mono, fontSize: 11.5, color: hue.ink, letterSpacing: 0.8 }}>{c.card.code}</Text>
						</View>
						<Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, color: t.muted, textTransform: 'uppercase' }}>
							{c.units.length} {c.units.length === 1 ? 'unit' : 'units'} · {allLessons.length} lessons
						</Text>
					</View>
					<Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 31, letterSpacing: -0.6, color: t.fg }}>
						{plain(c.card.title)}
					</Text>
				</Reveal>

				{/* Dual Progress Rings + Full-Width Continue Card */}
				<Reveal follow>
					<Card tint={hue.base} tintStrength={t.name === 'night' ? 12 : 7} style={{ padding: 20, borderRadius: 24, gap: 18, alignItems: 'center' }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 36 }}>
							<RingStat value={covered} label="Covered" color={t.amber} track={t.line2} />
							<RingStat value={p?.examReady ?? 0} label="Exam-ready" color={t.success} track={t.line2} />
						</View>
						{next ? (
							<Button
								title={started ? `Continue · ${plain(next.title)}` : 'Start course'}
								icon={<ArrowRight size={16} color={t.onAmber} />}
								onPress={() => router.push(lessonHref(c.card.slug, next.id))}
								style={{ alignSelf: 'stretch', borderRadius: 16 }}
							/>
						) : null}
					</Card>
				</Reveal>

				{!c.viewerHasAccess ? (
					<Card tint={t.amber} tintStrength={12} style={{ gap: 8, borderRadius: 20 }}>
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

				{/* Syllabus Header */}
				<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
					<Eyebrow>Syllabus</Eyebrow>
					<Text style={{ fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 1, color: t.muted, textTransform: 'uppercase', marginBottom: 8 }}>
						{completedUnitsCount} of {c.units.length} units done
					</Text>
				</View>

				{/* Redesigned Numbered Unit Cards */}
				<View style={{ gap: 12 }}>
					{c.units.map((u, ui) => {
						const isOpen = open[u.id] ?? u.id === firstOpenUnit;
						const unitDoneCount = u.lessons.filter((l) => done(l.id)).length;
						const unitTotal = u.lessons.length;
						const unitComplete = unitTotal > 0 && unitDoneCount === unitTotal;
						const unitActive = u.lessons.some((l) => !done(l.id) && next?.id === l.id);
						const unitPct = unitTotal ? unitDoneCount / unitTotal : 0;
						const unitNum = String(ui + 1).padStart(2, '0');
						const unitTint = unitComplete ? t.success : unitActive ? hue.base : undefined;

						return (
							<Card
								key={u.id}
								padded={false}
								tint={unitTint}
								tintStrength={unitComplete ? (t.name === 'night' ? 9 : 6) : unitActive ? (t.name === 'night' ? 11 : 6) : 4}
								style={{
									borderRadius: 22,
									borderColor: unitComplete
										? alpha(t.success, 0.36)
										: unitActive
											? alpha(hue.base, 0.4)
											: t.line
								}}
							>
								{/* Unit Card Header */}
								<Press
									haptic
									onPress={() => setOpen({ ...open, [u.id]: !isOpen })}
									accessibilityRole="button"
									accessibilityState={{ expanded: isOpen }}
									style={{ padding: 16, gap: 10 }}
								>
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
										{/* Numbered Badge (01, 02...) or Sage Check */}
										<View
											style={{
												width: 36,
												height: 36,
												borderRadius: 11,
												backgroundColor: unitComplete
													? t.successSoft
													: unitActive
														? alpha(hue.base, 0.18)
														: t.surface2,
												borderWidth: hair,
												borderColor: unitComplete
													? alpha(t.success, 0.45)
													: unitActive
														? alpha(hue.base, 0.45)
														: t.line2,
												alignItems: 'center',
												justifyContent: 'center'
											}}
										>
											{unitComplete ? (
												<Check size={16} color={t.success} strokeWidth={2.6} />
											) : (
												<Text style={{ fontFamily: fonts.mono, fontSize: 12.5, color: unitActive ? hue.ink : t.muted }}>
													{unitNum}
												</Text>
											)}
										</View>

										{/* Unit Title + Progress Counter */}
										<View style={{ flex: 1, minWidth: 0, gap: 3 }}>
											<Text numberOfLines={2} style={{ fontFamily: fonts.bodyBold, fontSize: 15.5, lineHeight: 20, color: t.fg }}>
												{plain(u.title)}
											</Text>
											<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
												<Text style={{ fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 0.6, color: unitComplete ? t.success : t.muted }}>
													{unitDoneCount}/{unitTotal} {unitTotal === 1 ? 'lesson' : 'lessons'}
													{u.quizCount ? ' · Quiz' : ''}
												</Text>
												{unitComplete ? (
													<View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: t.successSoft }}>
														<Text style={{ fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 0.9, color: t.success }}>DONE</Text>
													</View>
												) : null}
											</View>
										</View>

										{/* Collapse Chevron */}
										<View
											style={{
												width: 30,
												height: 30,
												borderRadius: 15,
												backgroundColor: alpha(t.fg, 0.05),
												alignItems: 'center',
												justifyContent: 'center',
												transform: [{ rotate: isOpen ? '180deg' : '0deg' }]
											}}
										>
											<ChevronDown size={16} color={t.muted} />
										</View>
									</View>

									{/* Inline Unit Progress Bar */}
									<Meter
										value={unitPct}
										color={unitComplete ? t.success : unitActive ? t.amber : hue.base}
										height={5}
									/>
								</Press>

								{/* Expanded Lesson Rows + Dedicated Unit Quiz Strip */}
								{isOpen ? (
									<View style={{ borderTopWidth: hair, borderColor: t.line }}>
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
														borderColor: t.line,
														backgroundColor: here
															? alpha(t.amber, t.name === 'night' ? 0.09 : 0.08)
															: 'transparent'
													}}
												>
													{d ? (
														<View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.successSoft, borderWidth: hair, borderColor: alpha(t.success, 0.45), alignItems: 'center', justifyContent: 'center' }}>
															<Check size={12.5} color={t.success} strokeWidth={2.6} />
														</View>
													) : here ? (
														<View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: alpha(t.amber, 0.22), alignItems: 'center', justifyContent: 'center' }}>
															<View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: t.amber }} />
														</View>
													) : l.locked ? (
														<View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
															<Lock size={14} color={t.muted} />
														</View>
													) : (
														<View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: t.line2 }} />
													)}

													<View style={{ flex: 1, minWidth: 0, gap: 2 }}>
														<Text
															numberOfLines={1}
															style={{
																fontFamily: here ? fonts.bodyBold : fonts.bodyMedium,
																fontSize: 14.5,
																color: here ? t.fg : l.locked ? t.muted : d ? t.fg2 : t.fg
															}}
														>
															{ui + 1}.{li + 1} {plain(l.title)}
														</Text>
													</View>

													{here ? (
														<View
															style={{
																paddingHorizontal: 8,
																paddingVertical: 3,
																borderRadius: radius.pill,
																backgroundColor: alpha(t.amber, 0.18),
																borderWidth: hair,
																borderColor: alpha(t.amber, 0.45)
															}}
														>
															<Text style={{ fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 0.9, color: t.accent }}>
																UP NEXT
															</Text>
														</View>
													) : d ? (
														<Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.7, color: t.success }}>
															Done
														</Text>
													) : null}
												</Press>
											);
										})}

										{/* Dedicated Unit Quiz Strip */}
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
													borderColor: t.line,
													backgroundColor: mix(hue.base, t.name === 'night' ? 9 : 5, t.surface)
												}}
											>
												<View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: alpha(hue.base, 0.18), alignItems: 'center', justifyContent: 'center' }}>
													<Target size={15} color={hue.ink} />
												</View>
												<View style={{ flex: 1 }}>
													<Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: t.fg }}>
														Unit {ui + 1} Quiz
													</Text>
													<Text style={{ fontFamily: fonts.mono, fontSize: 10.5, color: t.muted }}>
														{u.quizCount} questions
													</Text>
												</View>
												<View
													style={{
														paddingHorizontal: 10,
														paddingVertical: 5,
														borderRadius: radius.pill,
														backgroundColor: alpha(hue.base, 0.16),
														borderWidth: hair,
														borderColor: alpha(hue.base, 0.36),
														flexDirection: 'row',
														alignItems: 'center',
														gap: 4
													}}
												>
													<Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: hue.ink }}>Quiz</Text>
													<ArrowRight size={12} color={hue.ink} />
												</View>
											</Press>
										) : null}
									</View>
								) : null}
							</Card>
						);
					})}
				</View>

				<PlanCard slug={c.card.slug} p={p} onSaved={() => refetch({ requestPolicy: 'network-only' })} />
				{c.labs.length ? (
					<Card style={{ gap: 6, borderRadius: 20 }}>
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
				<Text style={{ fontFamily: fonts.display, fontSize: 17, color: t.fg }}>{Math.round(value * 100)}%</Text>
			</Ring>
			<Text style={{ fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase', color: t.muted }}>{label}</Text>
		</View>
	);
}

function Tool({ label, sub, Icon, onPress, disabled }: { label: string; sub: string; Icon: typeof Layers; onPress: () => void; disabled?: boolean }) {
	const t = useTheme();
	return (
		<Card onPress={disabled ? undefined : onPress} style={{ flex: 1, padding: 13, borderRadius: 18, gap: 6, opacity: disabled ? 0.45 : 1 }}>
			<View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: alpha(t.amber, 0.14), alignItems: 'center', justifyContent: 'center' }}>
				<Icon size={16} color={t.accent} />
			</View>
			<Text style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: t.fg }}>{label}</Text>
			<Text style={{ fontFamily: fonts.mono, fontSize: 10.5, color: t.muted }}>{sub}</Text>
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
			<Card style={{ gap: 6, borderRadius: 20 }}>
				<T v="bodyStrong">In your courses</T>
				<T v="small">{p?.enrollment?.examDate ? `Exam on ${shortDate(p.enrollment.examDate)}. Today's plan paces you to it.` : 'No exam date yet. Add one and Today paces you to it.'}</T>
				<Button small kind="solid" title="Change plan" onPress={() => setEdit(true)} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
			</Card>
		);

	const today = lagosToday();
	return (
		<Card style={{ gap: 12, borderRadius: 20 }}>
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
			<Button kind="hue" hue={hue} title={enrolled ? 'Update plan' : 'Add to my courses'} onPress={save} busy={busy} disabled={!days.length} style={{ borderRadius: 16 }} />
		</Card>
	);
}
