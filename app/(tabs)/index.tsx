import { useCallback, useEffect, useRef } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useQuery } from 'urql';
import { ArrowRight, BookOpen, CalendarDays, Flame, Layers, PenLine, Target } from 'lucide-react-native';
import { HOME } from '../../lib/api/queries';
import type { Access, CourseProgress, Today, TodayItem } from '../../lib/api/types';
import { errorText } from '../../lib/api/client';
import { plain } from '../../lib/html';
import { courseHref, greeting, lessonHref, todayHref } from '../../lib/nav';
import { useSession } from '../../lib/session';
import { daysLeft } from '../../lib/study/trial';
import { useProgress } from '../../lib/progress';
import { alpha, radius, useTheme, useTint } from '../../lib/theme';
import { Button, Card, ErrorBox, Meter, Press, Reveal, Screen, T, hair } from '../../components/ui';
import { LoadingDots } from '../../components/LoadingDots';
import { CourseCard } from '../../components/CourseCard';
import { CourseHalo } from '../../components/CourseHalo';

type Home = { today: Today; myCourses: CourseProgress[]; access: Access };

const ACTIVITY = {
	lesson: { icon: BookOpen, label: 'Lesson' },
	cards: { icon: Layers, label: 'Flashcards' },
	quiz: { icon: Target, label: 'Quiz' },
	mock: { icon: Target, label: 'Mock exam' },
	review: { icon: PenLine, label: 'Practice' }
};

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
	const hue = useTint(first?.courseSlug ?? active?.courseSlug ?? recent?.courseSlug);
	const firstCourse = !first && !active && !recent;
	const leadColor = firstCourse ? t.amber : hue.base;
	const leadBackground = firstCourse ? t.accentSoft : hue.wash;
	const leadInk = firstCourse ? t.accent : hue.ink;
	const LeadIcon = first ? activity(first).icon : BookOpen;
	const leadTitle = first ? plain(first.title) : next ? plain(next.title) : recent ? plain(recent.courseTitle) : 'Find your first course';
	const leadDetail = first ? first.courseTitle : next ? active?.courseTitle : recent ? 'Review a lesson or practise what you’ve learned.' : 'Browse lessons by department, level or course code.';
	const leadHref = first ? todayHref(first) : active && next ? lessonHref(active.courseSlug, next.id) : recent ? courseHref(recent.courseSlug) : '/courses';
	const date = new Intl.DateTimeFormat('en-NG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' }).format(new Date());

	return (
		<Screen refreshControl={<RefreshControl refreshing={fetching && !!data} tintColor={t.accent} onRefresh={() => refetch({ requestPolicy: 'network-only' })} />}
			contentContainerStyle={{ gap: 28, paddingHorizontal: 22, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
			<Reveal style={{ gap: 9, paddingTop: 12 }}>
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
					<CalendarDays color={t.accent} size={15} />
					<T v="label">{date}</T>
				</View>
				<T v="display" accessibilityRole="header">{greeting()}{firstName ? `, ${firstName}` : ''}.</T>
			</Reveal>
			{error && !data ? <ErrorBox message={errorText(error)} onRetry={() => refetch({ requestPolicy: 'network-only' })} /> : null}
			{fetching && !data ? <LoadingDots label="Loading your study plan" /> : null}
			{data ? (
				<Reveal follow>
					<Card style={{ padding: 19, marginTop: firstCourse ? 10 : 0, backgroundColor: leadBackground, borderColor: alpha(leadColor, 0.32), gap: 12 }}>
						<View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius.md, overflow: 'hidden' }]}>
							<CourseHalo color={leadColor} />
						</View>
						{firstCourse ? <Image source={require('../../assets/ollie/notes.webp')} style={{ position: 'absolute', width: '43%', maxWidth: 165, height: 154, right: 0, top: -28 }} contentFit="contain" autoplay={false} accessible={false} pointerEvents="none" /> : null}
						<View style={{ gap: 8, paddingRight: firstCourse ? '39%' : 0 }}>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
								<LeadIcon size={15} color={leadInk} />
								<T v="label" color={leadInk}>{first ? 'Up next' : next ? 'Continue reading' : recent ? 'Review' : 'Get started'}</T>
							</View>
							<T v="title" accessibilityRole="header">{leadTitle}</T>
							<T>{leadDetail}{first ? ` · ${first.minutes} min` : ''}</T>
						</View>
						{!first && active ? <Meter value={active.covered} height={3} /> : null}
						<Button title={first ? `Open ${activity(first).label.toLowerCase()}` : next ? 'Open lesson' : recent ? 'Open course' : 'Browse courses'} onPress={() => router.push(leadHref as never)} style={{ alignSelf: 'flex-start' }} />
					</Card>
				</Reveal>
			) : null}

			{today && (today.streakDays > 0 || today.daysToExam !== null) ? (
				<View style={{ flexDirection: 'row', gap: 10 }}>
					<Card style={{ flex: 1, gap: 5, padding: 14, backgroundColor: today.studiedToday ? t.accentSoft : t.surface }}>
						<Flame size={21} color={t.accent} />
						<T v="label">Study streak</T>
						<T v="h2">{today.streakDays} {today.streakDays === 1 ? 'day' : 'days'}</T>
						{today.studiedToday ? <T v="small" color={t.success}>Studied today</T> : null}
					</Card>
					{today.daysToExam !== null ? (
						<Card style={{ flex: 1, gap: 5, padding: 14, backgroundColor: t.signalSoft }}>
							<CalendarDays size={21} color={t.signal} />
							<T v="label">Next exam</T>
							<T v="h2">{today.daysToExam === 0 ? 'Today' : `${today.daysToExam} ${today.daysToExam === 1 ? 'day' : 'days'} left`}</T>
							<T v="small" color={today.behindBy > 0 ? t.danger : t.success}>{today.behindBy > 0 ? `${today.behindBy} behind plan` : 'On track'}</T>
						</Card>
					) : null}
				</View>
			) : null}
			{remaining.length ? (
				<View style={{ gap: 8 }}>
					<T v="title" accessibilityRole="header">Later today</T>
					{remaining.map((item, index) => <PlanRow key={`${item.kind}-${item.refId}-${index}`} item={item} />)}
				</View>
			) : null}

			{data?.myCourses.length ? (
				<View style={{ gap: 10 }}>
					<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
						<T v="title" accessibilityRole="header">Your courses</T>
						<Press accessibilityRole="button" onPress={() => router.push('/courses')} style={{ paddingVertical: 10 }}><T v="bodyStrong" color={t.accent}>Browse all</T></Press>
					</View>
					{data.myCourses.map((item) => <CourseCard key={item.courseSlug} progress={item} />)}
				</View>
			) : null}
			{data && (data.access.source === 'trial' || !data.access.hasAccess) ? (
				<Press accessibilityRole="button" onPress={() => router.push('/plan')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: hair, borderColor: t.line2, paddingVertical: 14 }}>
					<View style={{ flex: 1, gap: 3 }}>
						<T v="bodyStrong">{data.access.source === 'trial' ? `${daysLeft(data.access.until)} days left in your trial` : 'Explore the Study plan'}</T>
						<T v="small">Full access to lessons, quizzes and flashcards</T>
					</View>
					<ArrowRight size={18} color={t.accent} />
				</Press>
			) : null}
		</Screen>
	);
}

function activity(item: TodayItem) {
	return ACTIVITY[item.kind as keyof typeof ACTIVITY] ?? ACTIVITY.lesson;
}

function PlanRow({ item }: { item: TodayItem }) {
	const t = useTheme();
	const router = useRouter();
	const { icon: Icon, label } = activity(item);
	return (
		<Press accessibilityRole="button" onPress={() => router.push(todayHref(item) as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingVertical: 10, borderBottomWidth: hair, borderColor: t.line }}>
			<Icon size={19} color={t.accent} />
			<View style={{ flex: 1, gap: 3 }}>
				<T v="small">{label} · {item.courseTitle}</T>
				<T v="bodyStrong">{plain(item.title)}</T>
			</View>
			<T v="small">{item.minutes} min</T>
			<ArrowRight size={16} color={t.muted} />
		</Press>
	);
}
