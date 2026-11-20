// Today: greeting, streak, today's plan, trial banner, my courses (web /).
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from 'urql';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { ArrowRight, BookOpen, Flame, Layers, PenLine, Target } from 'lucide-react-native';
import { HOME } from '../../lib/api/queries';
import type { Access, CourseProgress, Today } from '../../lib/api/types';
import { errorText } from '../../lib/api/client';
import { useSession } from '../../lib/session';
import { useProgress } from '../../lib/progress';
import { fonts, radius, useTheme, tintOf } from '../../lib/theme';
import { greeting, todayHref } from '../../lib/nav';
import { daysLeft } from '../../lib/study/trial';
import { shortDate } from '../../lib/study/ids';
import { Button, Card, ErrorBox, Eyebrow, Press, Screen, T, hair } from '../../components/ui';
import { CourseCard } from '../../components/CourseCard';
import { RollingNumber } from '../../components/RollingNumber';

type Home = { today: Today; myCourses: CourseProgress[]; access: Access };

const KIND: Record<string, { Icon: typeof BookOpen; label: string }> = {
	lesson: { Icon: BookOpen, label: 'Lesson' },
	cards: { Icon: Layers, label: 'Flashcards' },
	quiz: { Icon: Target, label: 'Quiz' },
	review: { Icon: PenLine, label: 'Practice' }
};

export default function TodayScreen() {
	const t = useTheme();
	const router = useRouter();
	const user = useSession((s) => s.user);
	const synced = useProgress((s) => s.synced);
	const [{ data, fetching, error }, refetch] = useQuery<Home>({ query: HOME });
	const [pulling, setPulling] = useState(false);
	const seen = useRef(synced);

	useEffect(() => {
		if (synced !== seen.current) {
			seen.current = synced;
			refetch({ requestPolicy: 'network-only' });
		}
	}, [synced]);
	useFocusEffect(useCallback(() => refetch({ requestPolicy: 'cache-and-network' }), []));

	const firstName = (user?.name ?? '').split(' ')[0];
	const today = data?.today;
	const totalMin = today?.items.reduce((s, i) => s + i.minutes, 0) ?? 0;

	return (
		<Screen
			refreshControl={
				<RefreshControl
					refreshing={pulling}
					tintColor={t.amber}
					onRefresh={async () => {
						setPulling(true);
						refetch({ requestPolicy: 'network-only' });
						setTimeout(() => setPulling(false), 700);
					}}
				/>
			}
		>
			<Animated.View entering={FadeInDown.duration(500)} style={{ marginTop: 8, marginBottom: 18 }}>
				<Eyebrow>{new Intl.DateTimeFormat('en-NG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' }).format(new Date())}</Eyebrow>
				<T v="display">
					{greeting()}
					{firstName ? `, ${firstName}` : ''}.
				</T>
				<T style={{ marginTop: 8 }}>
					{today?.items.length
						? `${today.items.length} thing${today.items.length === 1 ? '' : 's'} on today's plan, about ${totalMin} minutes. Small steps, every day.`
						: data?.myCourses.length
							? 'Nothing due today. Read ahead, or rest: both count.'
							: 'Pick a course to start your plan.'}
				</T>
			</Animated.View>

			{error && !data ? <ErrorBox message={errorText(error)} onRetry={() => refetch({ requestPolicy: 'network-only' })} /> : null}

			{today ? (
				<Animated.View entering={FadeInDown.delay(80).duration(500)} style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
					<Streak days={today.streakDays} lit={today.studiedToday} />
					{today.daysToExam !== null ? (
						<Card style={{ flex: 1, gap: 2 }}>
							<T v="label">Exam</T>
							<View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
								<RollingNumber value={today.daysToExam} style={{ fontFamily: fonts.display, fontSize: 28, color: t.fg }} />
								<T v="small">day{today.daysToExam === 1 ? '' : 's'} left</T>
							</View>
							<T v="small" color={today.behindBy > 0 ? t.danger : t.success}>
								{today.behindBy > 0 ? `${today.behindBy} behind plan` : 'On track'}
							</T>
						</Card>
					) : null}
				</Animated.View>
			) : null}

			{today && today.behindBy > 0 ? (
				<Card style={{ marginBottom: 16, backgroundColor: t.accentSoft, borderColor: 'transparent' }}>
					<T color={t.fg}>
						You're {today.behindBy} lesson{today.behindBy === 1 ? '' : 's'} behind your plan. No stress: one extra lesson a day for a few days closes the gap.
					</T>
				</Card>
			) : null}

			{today?.items.length ? (
				<View style={{ marginBottom: 22 }}>
					<View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
						<T v="h2">Your plan for today</T>
						<T v="small">about {totalMin} min</T>
					</View>
					<View style={{ gap: 10 }}>
						{today.items.map((item, i) => {
							const k = KIND[item.kind] ?? KIND.lesson;
							const hue = t.hues[tintOf(item.courseSlug)];
							return (
								<Animated.View key={`${item.kind}-${item.refId}-${i}`} entering={FadeInDown.delay(120 + i * 60).duration(450)}>
									<Press
										haptic
										onPress={() => router.push(todayHref(item) as never)}
										accessibilityRole="button"
										style={{
											flexDirection: 'row',
											alignItems: 'center',
											gap: 12,
											padding: 14,
											borderRadius: radius.md,
											backgroundColor: i === 0 ? hue.wash : t.surface,
											borderWidth: i === 0 ? 1.5 : hair,
											borderColor: i === 0 ? hue.base : t.line
										}}
									>
										<View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: hue.soft, alignItems: 'center', justifyContent: 'center' }}>
											<k.Icon size={20} color={hue.ink} />
										</View>
										<View style={{ flex: 1, gap: 2 }}>
											<Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: hue.ink, textTransform: 'uppercase' }}>
												{k.label} · {item.courseTitle}
											</Text>
											<Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: t.fg }} numberOfLines={2}>
												{item.title}
											</Text>
										</View>
										<View style={{ alignItems: 'flex-end', gap: 4 }}>
											<T v="small">{item.minutes} min</T>
											{i === 0 ? (
												<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.amber, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
													<Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: t.onAmber }}>Start</Text>
													<ArrowRight size={13} color={t.onAmber} />
												</View>
											) : (
												<ArrowRight size={16} color={t.muted} />
											)}
										</View>
									</Press>
								</Animated.View>
							);
						})}
					</View>
				</View>
			) : data?.myCourses.length ? (
				<Card style={{ marginBottom: 18, gap: 6 }}>
					<T v="h2">All clear for today.</T>
					<T>You're on track. Read ahead, flip a few flashcards, or rest: both count.</T>
				</Card>
			) : null}

			{data?.access.source === 'trial' ? (
				<Card style={{ marginBottom: 18, gap: 10, backgroundColor: t.accentSoft, borderColor: 'transparent' }}>
					<Eyebrow>Free trial</Eyebrow>
					<T color={t.fg}>
						<Text style={{ fontFamily: fonts.bodyBold }}>
							{daysLeft(data.access.until)} day{daysLeft(data.access.until) === 1 ? '' : 's'} left.
						</Text>{' '}
						Every lesson, quiz and flashcard in every course is open until {data.access.until ? shortDate(data.access.until) : 'then'}.
					</T>
					<Button small title="Keep it going" onPress={() => router.push('/plan')} style={{ alignSelf: 'flex-start' }} />
				</Card>
			) : data && !data.access.hasAccess ? (
				<Card style={{ marginBottom: 18, gap: 10 }}>
					<Eyebrow>One plan</Eyebrow>
					<T>One plan opens every lesson, quiz and flashcard in every course.</T>
					<Button small title="See the plan" onPress={() => router.push('/plan')} style={{ alignSelf: 'flex-start' }} />
				</Card>
			) : null}

			<View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
				<T v="h2">Your courses</T>
				<Press onPress={() => router.push('/courses')} hitSlop={10}>
					<T v="small" color={t.accent}>
						Browse all
					</T>
				</Press>
			</View>
			{data?.myCourses.length ? (
				<View style={{ gap: 12 }}>
					{data.myCourses.map((p, i) => (
						<Animated.View key={p.courseSlug} entering={FadeInDown.delay(160 + i * 60).duration(450)}>
							<CourseCard progress={p} />
						</Animated.View>
					))}
				</View>
			) : data ? (
				<Card style={{ gap: 10, alignItems: 'flex-start' }}>
					<T v="h2">Pick your first course.</T>
					<T>Find it by department and level, or search by its title.</T>
					<Button title="Find my course" onPress={() => router.push('/courses')} />
				</Card>
			) : fetching ? (
				<T v="small">Loading your courses…</T>
			) : null}
		</Screen>
	);
}

function Streak({ days, lit }: { days: number; lit: boolean }) {
	const t = useTheme();
	const s = useSharedValue(1);
	useEffect(() => {
		if (lit) s.value = withRepeat(withSequence(withTiming(1.12, { duration: 700, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) })), -1);
		else s.value = 1;
	}, [lit]);
	const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
	return (
		<Card style={{ flex: 1, gap: 2 }}>
			<T v="label">Streak</T>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
				<Animated.View style={a}>
					<Flame size={26} color={lit ? t.amber : t.muted} fill={lit ? t.amber : 'transparent'} />
				</Animated.View>
				<RollingNumber value={days} style={{ fontFamily: fonts.display, fontSize: 28, color: t.fg }} />
				<T v="small">day{days === 1 ? '' : 's'}</T>
			</View>
			<T v="small">{lit ? 'Done for today. Nice.' : days ? 'Study today to keep it going' : 'Start one today'}</T>
		</Card>
	);
}
