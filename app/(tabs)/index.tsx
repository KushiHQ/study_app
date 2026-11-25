import { useCallback, useEffect, useRef } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from 'urql';
import { BookOpen, ChevronRight, Flame, Layers, PenLine, PlayCircle, Target } from 'lucide-react-native';
import { HOME } from '../../lib/api/queries';
import type { Access, CourseProgress, Today, TodayItem } from '../../lib/api/types';
import { errorText } from '../../lib/api/client';
import { plain } from '../../lib/html';
import { courseHref, greeting, lessonHref, todayHref } from '../../lib/nav';
import { useSession } from '../../lib/session';
import { daysLeft } from '../../lib/study/trial';
import { useProgress } from '../../lib/progress';
import { alpha, fonts, radius, useTheme, useTint } from '../../lib/theme';
import { Button, Card, ErrorBox, Meter, Press, Reveal, Screen, T, hair } from '../../components/ui';
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

	return (
		<Screen
			refreshControl={<RefreshControl refreshing={fetching && !!data} tintColor={t.accent} onRefresh={() => refetch({ requestPolicy: 'network-only' })} />}
			contentContainerStyle={{ gap: 20, paddingHorizontal: 20, width: '100%', maxWidth: 680, alignSelf: 'center' }}
		>
			{/* Header: Greeting + Streak Pill */}
			<Reveal style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
				<View style={{ gap: 2 }}>
					<Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: t.muted }}>{greeting()},</Text>
					<Text accessibilityRole="header" style={{ fontFamily: fonts.bodyBold, fontSize: 28, lineHeight: 33, letterSpacing: -0.5, color: t.fg }}>
						{firstName || 'Student'}
					</Text>
				</View>
				{today && today.streakDays > 0 ? (
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							gap: 5,
							paddingHorizontal: 12,
							paddingVertical: 6,
							borderRadius: radius.pill,
							backgroundColor: alpha(t.amber, 0.14),
							borderWidth: hair,
							borderColor: alpha(t.amber, 0.36)
						}}
					>
						<KushiEmoji name="fire" size={16} />
						<Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: t.accent }}>{today.streakDays}d</Text>
					</View>
				) : null}
			</Reveal>

			{error && !data ? <ErrorBox message={errorText(error)} onRetry={() => refetch({ requestPolicy: 'network-only' })} /> : null}
			{fetching && !data ? <LoadingDots label="Loading your study plan" /> : null}

			{/* Hero Resume Card */}
			{data ? (
				<Reveal follow>
					<Card
						tint={leadColor}
						tintStrength={t.name === 'night' ? 16 : 11}
						style={{ padding: 20, borderRadius: 24, borderWidth: 1.25, borderColor: alpha(leadColor, 0.42), gap: 14 }}
					>
						{heroCode ? (
							<Text style={{ fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1, color: leadInk, textTransform: 'uppercase' }}>
								{heroCode}{first ? ` · ${first.minutes} min` : ''}
							</Text>
						) : null}
						<Text accessibilityRole="header" style={{ fontFamily: fonts.bodyBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: t.fg }}>
							{leadTitle}
						</Text>
						{heroCourse ? (
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
								<View style={{ flex: 1 }}>
									<Meter value={heroCourse.covered} color={leadColor} height={8} />
								</View>
								<Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: t.muted }}>{pct}%</Text>
							</View>
						) : (
							<T v="body">Browse lessons by department, level or course code.</T>
						)}
						<Button
							title={first ? `Continue ${activity(first).label.toLowerCase()}` : next ? 'Continue lesson' : recent ? 'Open course' : 'Browse courses'}
							onPress={() => router.push(leadHref as never)}
							style={{ borderRadius: 16 }}
						/>
					</Card>
				</Reveal>
			) : null}

			{/* Today's Plan */}
			{planItems.length ? (
				<View style={{ gap: 10 }}>
					<Text accessibilityRole="header" style={{ fontFamily: fonts.bodyBold, fontSize: 18, color: t.fg }}>
						Today&apos;s plan
					</Text>
					{planItems.map((item, index) => (
						<PlanRow key={`${item.kind}-${item.refId}-${index}`} item={item} />
					))}
				</View>
			) : null}

			{/* Enrolled Courses */}
			{data?.myCourses.length ? (
				<View style={{ gap: 10 }}>
					<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
						<Text accessibilityRole="header" style={{ fontFamily: fonts.bodyBold, fontSize: 18, color: t.fg }}>
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
				<Card tint={t.amber} tintStrength={10} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
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

function PlanRow({ item }: { item: TodayItem }) {
	const t = useTheme();
	const router = useRouter();
	const hue = useTint(item.courseSlug);
	const { icon: Icon, label } = activity(item);
	const tint = item.kind === 'cards' ? t.signal : item.kind === 'quiz' || item.kind === 'mock' ? t.amber : hue.base;
	return (
		<Card onPress={() => router.push(todayHref(item) as never)} style={{ padding: 14, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
			<View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: alpha(tint, 0.14), alignItems: 'center', justifyContent: 'center' }}>
				<Icon size={20} color={tint} />
			</View>
			<View style={{ flex: 1, gap: 2 }}>
				<Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: t.fg }}>
					{plain(item.title)}
				</Text>
				<Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 12, color: t.muted }}>
					{label} · {item.minutes} min · {item.courseTitle}
				</Text>
			</View>
			<ChevronRight size={17} color={t.muted} />
		</Card>
	);
}

function activity(item: TodayItem) {
	return ACTIVITY[item.kind as keyof typeof ACTIVITY] ?? { icon: BookOpen, label: 'Study' };
}
