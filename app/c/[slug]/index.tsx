// Course: hero in the course's colour, progress, plan, units and lessons (web /c/[slug]).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from 'urql';
import Animated, { FadeInDown, Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, ChevronDown, Layers, Lock, PenLine, Play, Target, Trophy } from 'lucide-react-native';
import { COURSE, ENROLL, UPDATE_ENROLLMENT } from '../../../lib/api/queries';
import type { CourseOutline, CourseProgress, Plan, Today } from '../../../lib/api/types';
import { errorText, gql } from '../../../lib/api/client';
import { isCompleted, useProgress } from '../../../lib/progress';
import { fonts, radius, useTheme, useTint } from '../../../lib/theme';
import { lessonHref, quizHref } from '../../../lib/nav';
import { plain } from '../../../lib/html';
import { addDays, lagosToday } from '../../../lib/study/srs';
import { shortDate } from '../../../lib/study/ids';
import { Html } from '../../../components/Html';
import { Button, Card, ErrorBox, Loading, Press, T, hair } from '../../../components/ui';
import { Ring } from '../../../components/Ring';
import { CourseIcon } from '../../../components/CourseIcon';

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
	const y = useSharedValue(0);
	const onScroll = useAnimatedScrollHandler((e) => (y.value = e.contentOffset.y));
	const heroStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: interpolate(y.value, [-120, 0, 200], [-60, 0, 80], Extrapolation.CLAMP) }, { scale: interpolate(y.value, [-120, 0], [1.15, 1], Extrapolation.CLAMP) }],
		opacity: interpolate(y.value, [0, 200], [1, 0.3], Extrapolation.CLAMP)
	}));
	const barStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [120, 180], [0, 1], Extrapolation.CLAMP) }));

	useEffect(() => {
		refetch({ requestPolicy: 'network-only' });
	}, [synced]);
	useFocusEffect(useCallback(() => refetch({ requestPolicy: 'cache-and-network' }), []));

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
	const covered = allLessons.length ? allLessons.filter((l) => done(l.id)).length / allLessons.length : 0;
	const next = p?.nextLesson ?? allLessons.find((l) => !done(l.id) && !l.locked) ?? allLessons[0];

	return (
		<View style={{ flex: 1, backgroundColor: t.bg }}>
			<Animated.ScrollView
				onScroll={onScroll}
				scrollEventThrottle={16}
				contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
				refreshControl={<RefreshControl refreshing={false} tintColor={hue.base} onRefresh={() => refetch({ requestPolicy: 'network-only' })} />}
			>
				<Animated.View style={[{ backgroundColor: hue.wash, paddingTop: insets.top + 60, paddingHorizontal: 20, paddingBottom: 28, gap: 12 }, heroStyle]}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
						<View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: hue.soft, alignItems: 'center', justifyContent: 'center' }}>
							<CourseIcon name={c.card.icon} size={32} color={hue.ink} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={{ fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1.4, color: hue.ink }}>{c.card.code}</Text>
							<Text style={{ fontFamily: fonts.serif, fontSize: 26, lineHeight: 31, color: t.fg }}>{c.card.title}</Text>
						</View>
					</View>
					{c.card.nickname ? <T style={{ fontFamily: fonts.serifItalic, fontSize: 17, color: t.fg2 }}>{c.card.nickname}</T> : null}
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 }}>
						<Ring value={covered} size={64} stroke={7} color={hue.base} track={t.surface}>
							<Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: t.fg }}>{Math.round(covered * 100)}%</Text>
						</Ring>
						<View style={{ flex: 1, gap: 2 }}>
							<T v="bodyStrong">
								{allLessons.filter((l) => done(l.id)).length} of {allLessons.length} lessons
							</T>
							<T v="small">Exam ready {Math.round((p?.examReady ?? 0) * 100)}% · about {Math.max(1, Math.round(c.card.minutes / 60))} h in all</T>
						</View>
					</View>
					{next ? (
						<Button
							kind="hue"
							hue={hue}
							title={p?.startedLessons.length || covered > 0 ? 'Continue' : 'Start the first lesson'}
							icon={<Play size={16} color={t.onHue} fill={t.onHue} />}
							onPress={() => router.push(lessonHref(c.card.slug, next.id) as never)}
						/>
					) : null}
				</Animated.View>

				<View style={{ padding: 18, gap: 16 }}>
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

					<PlanCard slug={c.card.slug} p={p} onSaved={() => refetch({ requestPolicy: 'network-only' })} />

					<T v="h2" style={{ marginTop: 6 }}>
						Units
					</T>
					{c.units.map((u, ui) => {
						const isOpen = open[u.id] ?? u.id === firstOpenUnit;
						const doneCount = u.lessons.filter((l) => done(l.id)).length;
						return (
							<Animated.View key={u.id} entering={FadeInDown.delay(Math.min(ui, 6) * 50)} style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: hair, borderColor: t.line, overflow: 'hidden' }}>
								<Press scaleTo={0.99} onPress={() => setOpen({ ...open, [u.id]: !isOpen })} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} style={{ padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
									<View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: doneCount === u.lessons.length && u.lessons.length ? hue.base : hue.soft, alignItems: 'center', justifyContent: 'center' }}>
										{doneCount === u.lessons.length && u.lessons.length ? <Check size={18} color={t.onHue} /> : <Text style={{ fontFamily: fonts.bodyBold, color: hue.ink }}>{ui + 1}</Text>}
									</View>
									<View style={{ flex: 1 }}>
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
									<Animated.View entering={FadeInDown.duration(250)} style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 4 }}>
										{u.summary ? <Html html={u.summary} read={false} style={{ fontSize: 14, lineHeight: 20, color: t.muted }} /> : null}
										{u.lessons.map((l) => {
											const d = done(l.id);
											const here = p?.nextLesson?.id === l.id;
											return (
												<Press
													key={l.id}
													scaleTo={0.98}
													onPress={() => router.push(lessonHref(c.card.slug, l.id) as never)}
													accessibilityRole="button"
													accessibilityLabel={`${l.title}${l.locked ? ', locked' : d ? ', done' : ''}`}
													style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, backgroundColor: here ? hue.wash : 'transparent' }}
												>
													<View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: d ? 0 : 1.5, borderColor: t.line2, backgroundColor: d ? t.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
														{d ? <Check size={14} color="#fff" /> : l.locked ? <Lock size={12} color={t.muted} /> : null}
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
									</Animated.View>
								) : null}
							</Animated.View>
						);
					})}
					{c.labs.length ? (
						<Card style={{ gap: 6 }}>
							<T v="bodyStrong">Labs</T>
							<T>Labs open on the website for now: study.kushi.ng/c/{c.card.slug}.</T>
						</Card>
					) : null}
				</View>
			</Animated.ScrollView>
			<Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 56, backgroundColor: t.bg, borderBottomWidth: hair, borderColor: t.line }, barStyle]}>
				<Text numberOfLines={1} style={{ position: 'absolute', bottom: 16, left: 64, right: 20, fontFamily: fonts.bodyBold, fontSize: 16, color: t.fg }}>
					{c.card.title}
				</Text>
			</Animated.View>
			<Press onPress={() => router.back()} accessibilityLabel="Back" hitSlop={10} style={{ position: 'absolute', top: insets.top + 8, left: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', borderWidth: hair, borderColor: t.line }}>
				<ArrowLeft size={20} color={t.fg} />
			</Press>
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
			<T v="small">When is the exam? Today's plan spreads the lessons out before it.</T>
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
