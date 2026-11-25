// Flashcards with spaced repetition (srs.ts, SM-2). Tap to flip (3D), then
// swipe right for "Good", left for "Again", or tap a grade. The card flies off
// in the direction of its grade.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from 'urql';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Shuffle } from 'lucide-react-native';
import { COURSE, FLASHCARDS } from '../../../lib/api/queries';
import type { CourseOutline, CourseProgress, Flashcard } from '../../../lib/api/types';
import { errorCode, errorText } from '../../../lib/api/client';
import { isCompleted, track, useProgress } from '../../../lib/progress';
import { deckOf } from '../../../lib/study/payload';
import { GRADES, addDays, freshCard, intervalLabel, lagosToday, review, type CardState } from '../../../lib/study/srs';
import { plain } from '../../../lib/html';
import { alpha, fonts, mix, radius, useTheme, useTint } from '../../../lib/theme';
import { Html } from '../../../components/Html';
import { TopBar } from '../../../components/TopBar';
import { Button, ErrorBox, Loading, LuminousBg, Meter, Press, T, TopGlow, hair } from '../../../components/ui';

type Sched = CardState & { dueOn: string };

export default function Cards() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
	const t = useTheme();
	const hue = useTint(slug);
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const overlay = useProgress((s) => s.completed);
	const [{ data: cd }] = useQuery<{ course: CourseOutline; courseProgress: CourseProgress | null }>({ query: COURSE, variables: { slug, signedIn: true, preview: null } });
	const [{ data, error, fetching }, refetch] = useQuery<{ flashcards: unknown }>({ query: FLASHCARDS, variables: { slug, preview: null }, requestPolicy: 'network-only' });
	const deck = useMemo(() => (data ? deckOf(data.flashcards) : { cards: [] as Flashcard[], schedule: [] as never[], today: undefined }), [data]);
	const today = deck.today ?? lagosToday();
	const lessons = cd?.course.units.flatMap((u) => u.lessons) ?? [];

	const [sched, setSched] = useState<Record<string, Sched>>({});
	const [queue, setQueue] = useState<Flashcard[]>([]);
	const [pos, setPos] = useState(0);
	const [flipped, setFlipped] = useState(false);
	const [cram, setCram] = useState(false);
	const [reviewed, setReviewed] = useState(0);
	const againOnce = useRef(new Set<string>());

	const build = (all = false, s = sched) => {
		setCram(all);
		againOnce.current = new Set();
		const done = (id?: string) => !!id && isCompleted(id, cd?.courseProgress?.completedLessons, overlay);
		const due = deck.cards.filter((c) => s[c.id] && s[c.id].dueOn <= today);
		const fresh = deck.cards
			.filter((c) => !s[c.id])
			.sort((a, b) => Number(done(b.lessonId)) - Number(done(a.lessonId)))
			.slice(0, 10);
		setQueue(all ? [...deck.cards].sort(() => Math.random() - 0.5) : [...due, ...fresh]);
		setPos(0);
		setFlipped(false);
		setReviewed(0);
	};
	useEffect(() => {
		const s: Record<string, Sched> = Object.fromEntries(deck.schedule.map((x: any) => [x.cardId, { intervalDays: x.intervalDays, ease: x.ease ?? 2.5, reps: x.reps, lapses: x.lapses ?? 0, dueOn: x.dueOn }]));
		setSched(s);
		build(false, s);
	}, [deck]);

	const current = queue[pos];
	const finished = queue.length > 0 && pos >= queue.length;
	const from = current?.lessonId ? lessons.find((l) => l.id === current.lessonId)?.title : '';
	const previews = current ? GRADES.map((g) => intervalLabel(review(sched[current.id] ?? freshCard(), g.grade).intervalDays)) : [];

	// ---- motion
	const flip = useSharedValue(0);
	const x = useSharedValue(0);
	const y = useSharedValue(0);
	useEffect(() => {
		flip.value = 0;
		x.value = 0;
		y.value = 0;
	}, [pos]);

	const grade = (g: number) => {
		if (!current) return;
		const c = current;
		Haptics.impactAsync(g === 0 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
		if (!cram) {
			const next = review(sched[c.id] ?? freshCard(), g);
			setSched((s) => ({ ...s, [c.id]: { ...next, dueOn: addDays(today, next.intervalDays) } }));
			track({ kind: 'card_review', courseSlug: slug, cardId: c.id, lessonId: c.lessonId, grade: g });
		}
		if (g === 0 && !againOnce.current.has(c.id)) {
			againOnce.current.add(c.id);
			setQueue((q) => [...q, c]);
		}
		setReviewed((n) => n + 1);
		setFlipped(false);
		setPos((p) => p + 1);
	};
	const fly = (g: number) => {
		const dir = g === 0 ? -1 : g === 1 ? -1 : 1;
		x.value = withTiming(dir * width * 1.3, { duration: 260 });
		y.value = withTiming(g === 3 ? -200 : 40, { duration: 260 }, () => runOnJS(grade)(g));
	};
	const doFlip = () => {
		Haptics.selectionAsync().catch(() => {});
		flip.value = withTiming(flipped ? 0 : 1, { duration: 190 });
		setFlipped(!flipped);
	};

	const pan = Gesture.Pan()
		.enabled(flipped)
		.onUpdate((e) => {
			x.value = e.translationX;
			y.value = e.translationY * 0.3;
		})
		.onEnd((e) => {
			if (e.translationX > width * 0.3 || e.velocityX > 900) {
				x.value = withTiming(width * 1.3, { duration: 220 }, () => runOnJS(grade)(2));
			} else if (e.translationX < -width * 0.3 || e.velocityX < -900) {
				x.value = withTiming(-width * 1.3, { duration: 220 }, () => runOnJS(grade)(0));
			} else {
				x.value = withTiming(0, { duration: 160 });
				y.value = withTiming(0, { duration: 160 });
			}
		});
	const tap = Gesture.Tap().onEnd(() => runOnJS(doFlip)());

	const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${x.value / 25}deg` }] }));
	const front = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }], opacity: flip.value < 0.5 ? 1 : 0 }));
	const back = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` }], opacity: flip.value >= 0.5 ? 1 : 0 }));
	const goodHint = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [20, 120], [0, 1], Extrapolation.CLAMP) }));
	const againHint = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-120, -20], [1, 0], Extrapolation.CLAMP) }));

	if (!data && fetching) return <Loading label="Shuffling your cards…" />;

	const face = {
		position: 'absolute' as const,
		inset: 0,
		backfaceVisibility: 'hidden' as const,
		borderRadius: 24,
		padding: 24,
		justifyContent: 'center' as const,
		borderWidth: hair,
		borderColor: alpha(hue.base, 0.32),
		overflow: 'hidden' as const
	};

	const gradeStyle = (g: number) => {
		if (g === 0) return { bg: t.dangerSoft, border: alpha(t.danger, 0.42), text: t.danger };
		if (g === 1) return { bg: alpha(t.amber, 0.14), border: alpha(t.amber, 0.42), text: t.accent };
		if (g === 2) return { bg: alpha(hue.base, 0.16), border: alpha(hue.base, 0.44), text: hue.ink };
		return { bg: t.successSoft, border: alpha(t.success, 0.42), text: t.success };
	};

	return (
		<View style={{ flex: 1, backgroundColor: t.bg }}>
			<TopGlow color={hue.base} height={280} />
			<View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, gap: 10 }}>
				<TopBar
					backLabel={cd?.course.card.code || 'Course'}
					onBack={() => router.back()}
					showProfile={false}
					right={
						queue.length ? (
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
									{Math.min(pos + 1, queue.length)} / {queue.length}
								</Text>
							</View>
						) : undefined
					}
				/>
				<Meter value={queue.length ? pos / queue.length : 0} color={hue.base} height={5} />
			</View>

			{errorCode(error) === 'PAYWALL' ? (
				<View style={{ padding: 20, gap: 12 }}>
					<T v="title">Flashcards come with a plan.</T>
					<Button title="See the plan" onPress={() => router.push('/plan')} style={{ borderRadius: 16 }} />
				</View>
			) : error && !data ? (
				<View style={{ padding: 20 }}>
					<ErrorBox message={errorText(error)} onRetry={() => refetch({ requestPolicy: 'network-only' })} />
				</View>
			) : !queue.length || finished ? (
				<View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 14, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
					<T v="display" style={{ fontSize: 24, lineHeight: 32, textAlign: 'center' }}>
						{finished ? `${reviewed} card${reviewed === 1 ? '' : 's'} reviewed.` : 'Nothing due right now.'}
					</T>
					<T style={{ textAlign: 'center' }}>
						{finished ? 'Spaced out like this, they stick for the exam. Come back when more are due.' : 'Your cards are resting. Come back tomorrow, or go through the whole deck now.'}
					</T>
					<Button title="Go through every card" icon={<Shuffle size={16} color={t.onAmber} />} onPress={() => build(true)} style={{ alignSelf: 'stretch', borderRadius: 16 }} />
					<Button kind="solid" title="Back to the course" onPress={() => router.back()} style={{ alignSelf: 'stretch', borderRadius: 16 }} />
				</View>
			) : current ? (
				<View style={{ flex: 1, padding: 20, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
					<Text numberOfLines={1} style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.7, color: t.muted, textAlign: 'center' }}>
						{cram ? 'CRAM MODE · ALL CARDS' : from ? plain(from).toUpperCase() : 'ACTIVE RECALL'}
					</Text>
					<GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
						<Animated.View style={[{ flex: 1, maxHeight: 460 }, cardStyle]}>
							<Animated.View style={[face, { backgroundColor: t.surface }, front]}>
								<LuminousBg from={mix(hue.base, t.name === 'night' ? 12 : 7, t.surface)} to={t.surface} borderRadius={24} />
								<Text style={{ position: 'absolute', top: 18, left: 20, fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 1.3, textTransform: 'uppercase', color: hue.ink }}>
									Question
								</Text>
								<Html html={current.front} hue={hue} style={{ fontFamily: fonts.serif, fontSize: 22, lineHeight: 30, textAlign: 'center' }} />
								<T v="small" style={{ position: 'absolute', bottom: 18, alignSelf: 'center' }}>
									Tap card to reveal answer
								</T>
							</Animated.View>
							<Animated.View style={[face, { backgroundColor: t.surface, borderColor: alpha(hue.base, 0.55) }, back]}>
								<LuminousBg from={mix(hue.base, t.name === 'night' ? 18 : 11, t.surface)} to={t.surface} borderRadius={24} />
								<Text style={{ position: 'absolute', top: 18, left: 20, fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 1.3, textTransform: 'uppercase', color: hue.ink }}>
									Answer
								</Text>
								<Html html={current.back} hue={hue} style={{ fontSize: 18, lineHeight: 27 }} />
							</Animated.View>
							<Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 20, right: 20, backgroundColor: t.success, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, transform: [{ rotate: '12deg' }] }, goodHint]}>
								<Text style={{ fontFamily: fonts.mono, fontSize: 12, color: '#fff' }}>GOOD</Text>
							</Animated.View>
							<Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 20, left: 20, backgroundColor: t.danger, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, transform: [{ rotate: '-12deg' }] }, againHint]}>
								<Text style={{ fontFamily: fonts.mono, fontSize: 12, color: '#fff' }}>AGAIN</Text>
							</Animated.View>
						</Animated.View>
					</GestureDetector>
					{flipped ? (
						<View style={{ gap: 10, paddingBottom: insets.bottom + 8 }}>
							<T v="small" style={{ textAlign: 'center' }}>
								How well did you recall it?
							</T>
							<View style={{ flexDirection: 'row', gap: 8 }}>
								{GRADES.map((g, i) => {
									const gs = gradeStyle(g.grade);
									return (
										<Press
											key={g.grade}
											haptic
											onPress={() => fly(g.grade)}
											accessibilityRole="button"
											accessibilityLabel={`${g.label}, next in ${previews[i]}`}
											style={{
												flex: 1,
												paddingVertical: 11,
												borderRadius: 14,
												alignItems: 'center',
												gap: 2,
												backgroundColor: gs.bg,
												borderWidth: hair,
												borderColor: gs.border
											}}
										>
											<Text style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: gs.text }}>{g.label}</Text>
											<Text style={{ fontFamily: fonts.mono, fontSize: 10, color: t.muted }}>{cram ? g.hint : previews[i]}</Text>
										</Press>
									);
								})}
							</View>
						</View>
					) : (
						<Button title="Show the answer" onPress={doFlip} style={{ marginBottom: insets.bottom + 8, borderRadius: 16 }} />
					)}
				</View>
			) : null}
		</View>
	);
}
