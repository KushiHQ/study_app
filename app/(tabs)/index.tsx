import { useCallback, useEffect, useMemo, useRef } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from 'urql';
import { ArrowRight, BookOpen, Calendar, ChevronRight, Layers, PenLine, PlayCircle, Target, TrendingUp } from 'lucide-react-native';
import { HOME } from '../../lib/api/queries';
import type { Access, CourseProgress, Today, TodayItem } from '../../lib/api/types';
import { errorText } from '../../lib/api/client';
import { plain } from '../../lib/html';
import { courseHref, greeting, lessonHref, todayHref } from '../../lib/nav';
import { useSession } from '../../lib/session';
import { daysLeft } from '../../lib/study/trial';
import { useProgress } from '../../lib/progress';
import { alpha, fonts, radius, useTheme, useTint } from '../../lib/theme';
import { Button, Card, ErrorBox, Eyebrow, Meter, Press, Reveal, Screen, T, hair } from '../../components/ui';
import { TopBar } from '../../components/TopBar';
import { LoadingDots } from '../../components/LoadingDots';
import { CourseCard } from '../../components/CourseCard';
import { KushiEmoji } from '../../components/KushiEmoji';

type Home = { today: Today; myCourses: CourseProgress[]; access: Access };

const ACTIVITY = {
	lesson: { icon: PlayCircle, label: 'Lesson' },
	cards: { icon: Layers, label: 'Flashcards' },
	quiz: { icon: Target, label: 'Quiz' },
	mock: { icon: Target, label: 'Mock exam' },
	review: { icon: PenLine, label: 'Practice' }
};

function formattedToday(): string {
	try {
		return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
	} catch {
		return greeting();
	}
}

export default function TodayScreen() {
	const t = useTheme();
	const router = useRouter();
	const firstName = useSession((state) => state.user?.name?.trim().split(/\s+/)[0]);
	const synced = useProgress((state) => state.synced);
	const lastSync = useRef(synced);
	const [{ data, fetching, error }, refetch] = useQuery<Home>({ query: HOME });
	useFocusEffect(useCallback(() => refetch({ requestPolicy: 'cache-and-network' }), [refetch]));
	useEffect(() => {
		if (lastSync.current === synced) return;
		lastSync.current = synced;
		refetch({ requestPolicy: 'network-only' });
	}, [refetch, synced]);

	const today = data?.today;
	const [first, ...remaining] = today?.items ?? [];
	const active = data?.myCourses.find((item) => item.nextLesson && !item.nextLesson.locked);
	const recent = data?.myCourses[0];
	const next = active?.nextLesson;
	const heroSlug = first?.courseSlug ?? active?.courseSlug ?? recent?.courseSlug;
	const hue = useTint(heroSlug);
	const firstCourse = !first && !active && !recent;
	const leadColor = firstCourse ? t.amber : hue.base;
	const leadInk = firstCourse ? t.accent : hue.ink;
	const heroCourse = data?.myCourses.find((c) => c.courseSlug === heroSlug) ?? active ?? recent;
	const heroCode = heroCourse?.courseCode ?? (firstCourse ? 'GET STARTED' : '');
	const leadTitle = first ? plain(first.title) : next ? plain(next.title) : recent ? plain(recent.courseTitle) : 'Find your first course';
	const leadHref = first ? todayHref(first) : active && next ? lessonHref(active.courseSlug, next.id) : recent ? courseHref(recent.courseSlug) : '/courses';
	const pct = Math.round((heroCourse?.covered ?? 0) * 100);
	const planItems = first ? [first, ...remaining] : remaining;
	const totalMinutes = planItems.reduce((sum, item) => sum + (item.minutes || 0), 0);

	// Nearest upcoming exam countdown or average course coverage for the right stat card
	const rightStat = useMemo(() => {
		const courses = data?.myCourses ?? [];
		const upcoming = courses
			.filter((c) => c.enrollment?.examDate)
			.map((c) => ({ code: c.courseCode, days: daysLeft(c.enrollment!.examDate!) }))
			.filter((x) => x.days >= 0)
			.sort((a, b) => a.days - b.days)[0];
		if (upcoming) {
			return {
				isExam: true,
				value: upcoming.days === 0 ? 'Today' : `${upcoming.days}d`,
				label: `To ${upcoming.code} exam`
			};
		}
		const avg = courses.length
			? Math.round((courses.reduce((s, c) => s + c.covered, 0) / courses.length) * 100)
			: 0;
		return {
			isExam: false,
			value: `${avg}%`,
			label: courses.length ? 'Courses covered' : 'Ready to start'
		};
	}, [data?.myCourses]);

	const dateLine = useMemo(() => formattedToday(), []);
	const streak = today?.streakDays ?? 0;

	return (
		<Screen
			refreshControl={<RefreshControl refreshing={fetching && !!data} tintColor={t.accent} onRefresh={() => refetch({ requestPolicy: 'network-only' })} />}
			contentContainerStyle={{ gap: 18, paddingHorizontal: 20, width: '100%', maxWidth: 680, alignSelf: 'center' }}
		>
			{/* Transparent Brand + Profile Top Bar */}
			<TopBar />

			{/* Date Eyebrow + Greeting */}
			<Reveal style={{ gap: 4 }}>
				<Eyebrow>{dateLine}</Eyebrow>
				<Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 31, letterSpacing: -0.7, color: t.fg }}>
					{greeting()}{firstName ? `, ${firstName}.` : '.'}
				</Text>
			</Reveal>

			{error && !data ? <ErrorBox message={errorText(error)} onRetry={() => refetch({ requestPolicy: 'network-only' })} /> : null}
			{fetching && !data ? <LoadingDots label="Loading your study plan" /> : null}

			{/* 2 Side-by-Side Silky-Washed Stat Cards */}
			{data ? (
				<Reveal follow style={{ flexDirection: 'row', gap: 12 }}>
					<Card tint={t.amber} tintStrength={t.name === 'night' ? 12 : 8} style={{ flex: 1, padding: 15, borderRadius: 20, gap: 6 }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
							<Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.1, textTransform: 'uppercase', color: t.accent }}>
								Streak
							</Text>
							<KushiEmoji name="fire" size={16} />
						</View>
						<Text style={{ fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.6, color: t.fg }}>
							{streak > 0 ? `${streak} ${streak === 1 ? 'day' : 'days'}` : 'Start'}
						</Text>
						<Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 12, color: t.muted }}>
							{streak > 0 ? 'Keep the chain alive' : 'Finish 1 lesson today'}
						</Text>
					</Card>

					<Card tint={t.success} tintStrength={t.name === 'night' ? 11 : 7} style={{ flex: 1, padding: 15, borderRadius: 20, gap: 6 }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
							<Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.1, textTransform: 'uppercase', color: t.success }}>
								{rightStat.isExam ? 'Countdown' : 'Progress'}
							</Text>
							{rightStat.isExam ? <Calendar size={15} color={t.success} /> : <TrendingUp size={15} color={t.success} />}
						</View>
						<Text style={{ fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.6, color: t.fg }}>
							{rightStat.value}
						</Text>
						<Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 12, color: t.muted }}>
							{rightStat.label}
						</Text>
					</Card>
				</Reveal>
			) : null}

			{/* Hero Resume Card (when no plan items yet, or quick-continue card) */}
			{data && !planItems.length ? (
				<Reveal follow>
					<Card
						tint={leadColor}
						tintStrength={t.name === 'night' ? 16 : 11}
						style={{ padding: 20, borderRadius: 24, borderWidth: 1.25, borderColor: alpha(leadColor, 0.42), gap: 14 }}
					>
						{heroCode ? (
							<Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, color: leadInk, textTransform: 'uppercase' }}>
								{heroCode}
							</Text>
						) : null}
						<Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 27, letterSpacing: -0.4, color: t.fg }}>
							{leadTitle}
						</Text>
						{heroCourse ? (
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
								<View style={{ flex: 1 }}>
									<Meter value={heroCourse.covered} color={leadColor} height={8} />
								</View>
								<Text style={{ fontFamily: fonts.mono, fontSize: 12, color: t.muted }}>{pct}%</Text>
							</View>
						) : (
							<T v="body">Browse lessons by department, level or course code.</T>
						)}
						<Button
							title={next ? 'Continue lesson' : recent ? 'Open course' : 'Browse courses'}
							onPress={() => router.push(leadHref as never)}
							style={{ borderRadius: 16 }}
						/>
					</Card>
				</Reveal>
			) : null}

			{/* Your Plan for Today */}
			{planItems.length ? (
				<View style={{ gap: 10 }}>
					<View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
						<Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3, color: t.fg }}>
							Your plan for today
						</Text>
						{totalMinutes > 0 ? (
							<Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, color: t.muted, textTransform: 'uppercase' }}>
								{totalMinutes} min total
							</Text>
						) : null}
					</View>
					{planItems.map((item, index) => (
						<PlanRow key={`${item.kind}-${item.refId}-${index}`} item={item} lead={index === 0} />
					))}
				</View>
			) : null}

			{/* Enrolled Courses */}
			{data?.myCourses.length ? (
				<View style={{ gap: 10 }}>
					<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
						<Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3, color: t.fg }}>
							Your courses
						</Text>
						<Press onPress={() => router.push('/courses')} hitSlop={8}>
							<Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: t.accent }}>See all</Text>
						</Press>
					</View>
					{data.myCourses.map((c) => (
						<CourseCard key={c.courseSlug} progress={c} compact />
					))}
				</View>
			) : null}

			{/* Trial banner */}
			{data?.access?.source === 'trial' && data.access.hasAccess ? (
				<Card tint={t.amber} tintStrength={10} style={{ padding: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
					<View style={{ flex: 1, gap: 2 }}>
						<T v="bodyStrong">Free trial · {daysLeft(data.access.until)} days left</T>
						<T v="small">Keep full access to every course.</T>
					</View>
					<Button small title="Upgrade" onPress={() => router.push('/plan')} />
				</Card>
			) : null}
		</Screen>
	);
}

function PlanRow({ item, lead }: { item: TodayItem; lead?: boolean }) {
	const t = useTheme();
	const router = useRouter();
	const hue = useTint(item.courseSlug);
	const { icon: Icon, label } = activity(item);
	const tint = item.kind === 'cards' ? t.signal : item.kind === 'quiz' || item.kind === 'mock' ? t.amber : hue.base;
	return (
		<Card
			onPress={() => router.push(todayHref(item) as never)}
			tint={lead ? tint : undefined}
			tintStrength={lead ? (t.name === 'night' ? 14 : 9) : 6}
			style={{
				padding: lead ? 16 : 14,
				borderRadius: 20,
				borderColor: lead ? alpha(tint, 0.42) : t.line,
				flexDirection: 'row',
				alignItems: 'center',
				gap: 13
			}}
		>
			<View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: alpha(tint, 0.14), alignItems: 'center', justifyContent: 'center' }}>
				<Icon size={19} color={tint} />
			</View>
			<View style={{ flex: 1, gap: 3 }}>
				<Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: t.fg }}>
					{plain(item.title)}
				</Text>
				<Text numberOfLines={1} style={{ fontFamily: fonts.mono, fontSize: 11, color: t.muted }}>
					{label} · {item.minutes} min · {item.courseTitle}
				</Text>
			</View>
			{lead ? (
				<View
					style={{
						paddingHorizontal: 12,
						paddingVertical: 7,
						borderRadius: radius.pill,
						backgroundColor: t.amber,
						flexDirection: 'row',
						alignItems: 'center',
						gap: 4
					}}
				>
					<Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: t.onAmber }}>Start</Text>
					<ArrowRight size={13} color={t.onAmber} />
				</View>
			) : (
				<ChevronRight size={17} color={t.muted} />
			)}
		</Card>
	);
}

function activity(item: TodayItem) {
	return ACTIVITY[item.kind as keyof typeof ACTIVITY] ?? { icon: BookOpen, label: 'Study' };
}
