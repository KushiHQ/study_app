import { useCallback, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useClient, useQuery } from 'urql';
import { ArrowLeft, ArrowRight, BookOpen, Check, GraduationCap, Layers, SquareCheck, type LucideIcon } from 'lucide-react-native';
import { AccountField } from '../components/AccountPage';
import { CourseHalo } from '../components/CourseHalo';
import { CourseIcon } from '../components/CourseIcon';
import { Button, Card, Chip, ErrorBox, Press, Reveal, Screen, T, hair } from '../components/ui';
import { gql, errorText } from '../lib/api/client';
import { CATALOGUE, COURSE, LEVELS_FOR, UPDATE_PROFILE } from '../lib/api/queries';
import type { CourseCard, CourseOutline, Department, Level, User } from '../lib/api/types';
import { plain } from '../lib/html';
import { courseHref, lessonHref } from '../lib/nav';
import { skipStudySetup } from '../lib/onboarding';
import { useSession } from '../lib/session';
import { alpha, fonts, radius, useTheme, useTint } from '../lib/theme';

const DEPARTMENTS = 'query StudyDepartments { departments { id slug name courseCount } }';
const METHOD = [
	{ Icon: BookOpen, label: 'Read', detail: 'Work through a short lesson for your course.' },
	{ Icon: SquareCheck, label: 'Recall', detail: 'Try a question from memory while it’s fresh.' },
	{ Icon: Layers, label: 'Review', detail: 'Use flashcards to revisit what you miss.' }
];

export default function Onboarding() {
	const t = useTheme();
	const router = useRouter();
	const client = useClient();
	const insets = useSafeAreaInsets();
	const { edit } = useLocalSearchParams<{ edit?: string }>();
	const editing = edit === '1';
	const user = useSession((s) => s.user);
	const [step, setStep] = useState(editing ? 1 : 0);
	const [department, setDepartment] = useState(user?.department ?? null);
	const [level, setLevel] = useState(user?.level?.code ?? null);
	const [course, setCourse] = useState<string | null>(null);
	const [search, setSearch] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const saving = useRef(false);
	const [depts, loadDepts] = useQuery<{ departments: Department[] }>({ query: DEPARTMENTS });
	const [levels, loadLevels] = useQuery<{ levels: Level[] }>({ query: LEVELS_FOR, variables: { d: department?.slug ?? null }, pause: !department || step < 1 });
	const [matches, loadCourses] = useQuery<{ courses: CourseCard[] }>({
		query: CATALOGUE, variables: { d: department?.slug ?? null, l: level, withCourses: true }, pause: editing || step !== 2 || !department || !level
	});
	const searchTerm = search.trim().toLocaleLowerCase();
	const allDepartments = depts.data?.departments ?? [];
	const departments = allDepartments.filter((item) => item.name.toLocaleLowerCase().includes(searchTerm));
	const availableLevels = levels.fetching ? [] : levels.data?.levels ?? [];
	const matchedCourses = matches.fetching ? [] : matches.data?.courses ?? [];
	const selectedLevel = availableLevels.find((item) => item.code === level);

	const moveTo = (next: number) => {
		setError('');
		setStep(next);
	};
	const back = useCallback(() => {
		if (saving.current) return true;
		if (editing) {
			if (router.canGoBack()) router.back();
			else router.replace('/account');
			return true;
		}
		if (step === 0) return false;
		setError('');
		setStep(step - 1);
		return true;
	}, [editing, router, step]);

	useFocusEffect(useCallback(() => {
		if (Platform.OS !== 'android') return;
		const subscription = BackHandler.addEventListener('hardwareBackPress', back);
		return () => subscription.remove();
	}, [back]));

	const skip = () => {
		if (saving.current) return;
		if (user) skipStudySetup(user.id);
		router.replace('/courses');
	};

	const finish = async (slug?: string) => {
		if (!department || !selectedLevel || saving.current) return;
		saving.current = true;
		setError('');
		setBusy(true);
		try {
			const outline = slug ? await client.query<{ course: CourseOutline | null }>(COURSE, { slug, signedIn: true, preview: null }).toPromise() : null;
			if (outline?.error && !outline.data?.course) throw outline.error;
			const r = await gql<{ updateProfile: User }>(UPDATE_PROFILE, { departmentId: department.id, levelCode: selectedLevel.code });
			useSession.getState().setUser(r.updateProfile);
			if (editing) {
				if (router.canGoBack()) router.back();
				else router.replace('/account');
				return;
			}
			const first = outline?.data?.course?.units.flatMap((unit) => unit.lessons).find((lesson) => !lesson.locked);
			if (slug && first) router.replace(lessonHref(slug, first.id));
			else router.replace(slug ? courseHref(slug) : '/courses');
		} catch (e) {
			setError(errorText(e));
		} finally {
			saving.current = false;
			setBusy(false);
		}
	};

	return (
		<View style={{ flex: 1, backgroundColor: t.bg }}>
			<Screen key={step} contentContainerStyle={{ maxWidth: 560, width: '100%', alignSelf: 'center', paddingHorizontal: 22, paddingBottom: 24, gap: 18 }}>
				<View style={{ minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
					{step > 0 ? (
						<Press onPress={back} accessibilityRole="button" accessibilityLabel="Back" disabled={busy}
							style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}><ArrowLeft size={21} color={t.accent} /></Press>
					) : (
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
							<View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: t.amber, transform: [{ rotate: '45deg' }] }} />
							<T v="bodyStrong" style={{ fontFamily: fonts.display }}>Kushi Study</T>
						</View>
					)}
					{!editing ? <Press accessibilityRole="button" accessibilityLabel="Skip setup" disabled={busy} onPress={skip} style={{ minHeight: 44, justifyContent: 'center' }}>
						<T v="small">Skip setup</T>
					</Press> : null}
				</View>

				{!editing ? (
					<View accessible accessibilityLabel={`Step ${step + 1} of 3`} style={{ flexDirection: 'row', gap: 5 }}>
						{[0, 1, 2].map((item) => <View key={item} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: item <= step ? t.amber : t.surface2 }} />)}
					</View>
				) : null}

				{step === 0 ? (
					<>
						<Card style={{ marginTop: 16, padding: 18, gap: 9, paddingRight: '38%', backgroundColor: t.accentSoft, borderColor: alpha(t.amber, 0.32) }}>
							<View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { overflow: 'hidden', borderRadius: radius.md }]}><CourseHalo color={t.amber} /></View>
							<Image source={require('../assets/ollie/hello.webp')} style={{ position: 'absolute', width: '43%', maxWidth: 158, height: 146, right: 0, top: -23 }}
								contentFit="contain" autoplay={false} accessible={false} pointerEvents="none" />
							<T v="display" accessibilityRole="header">Study for your next exam.</T>
							<T>Start with one lesson from your course.</T>
						</Card>
						<Card style={{ paddingVertical: 4 }}>
							{METHOD.map(({ Icon, label, detail }, i) => (
								<View key={label} style={{ minHeight: 57, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: i ? hair : 0, borderColor: t.line }}>
									<Icon size={20} color={t.accent} />
									<View style={{ flex: 1, gap: 2 }}><T v="bodyStrong">{label}</T><T v="small">{detail}</T></View>
								</View>
							))}
						</Card>
					</>
				) : null}

				{step === 1 ? (
					<>
						<Reveal style={{ gap: 7 }}>
							<T v="display" accessibilityRole="header">{editing ? 'Department and level' : 'What do you study?'}</T>
							<T>We’ll match courses to your department and level.</T>
						</Reveal>
						<View style={{ gap: 9 }}>
							<T v="h3">Department</T>
							{allDepartments.length > 6 ? <AccountField label="Search departments" value={search} onChangeText={setSearch} autoCorrect={false} /> : null}
							{depts.error ? <ErrorBox message={errorText(depts.error)} onRetry={() => loadDepts({ requestPolicy: 'network-only' })} /> : null}
							{depts.fetching && !depts.data ? <T v="small">Loading departments…</T> : null}
							{departments.map((item) => (
								<Choice key={item.id} title={item.name} detail={`${item.courseCount} ${item.courseCount === 1 ? 'course' : 'courses'}`} Icon={GraduationCap}
									selected={department?.id === item.id} disabled={busy} onPress={() => {
										if (department?.id !== item.id) { setLevel(null); setCourse(null); }
										setDepartment(item);
										setSearch('');
									}} />
							))}
							{searchTerm && !departments.length ? <T v="small">No departments match that search.</T> : null}
							{!editing ? <Button small kind="ghost" title="Request a course" disabled={busy} onPress={() => router.push('/request')} style={{ alignSelf: 'flex-start' }} /> : null}
						</View>
						{department ? <View style={{ gap: 9 }}>
							<T v="h3">Level</T>
							{levels.error ? <ErrorBox message={errorText(levels.error)} onRetry={() => loadLevels({ requestPolicy: 'network-only' })} /> : null}
							{levels.fetching ? <T v="small">Loading levels…</T> : null}
							{!levels.fetching && levels.data && !availableLevels.length ? <T v="small">There are no levels listed for this department yet.</T> : null}
							<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
								{availableLevels.map((item) => <Chip key={item.code} label={item.name} active={level === item.code} onPress={() => {
									if (saving.current) return;
									if (level !== item.code) setCourse(null);
									setLevel(item.code);
								}} />)}
							</View>
						</View> : null}
					</>
				) : null}

				{step === 2 ? (
					<>
						<Reveal style={{ gap: 8 }}>
							<T v="label" color={t.accent}>{department?.name} · {selectedLevel?.name}</T>
							<T v="display" accessibilityRole="header">Pick your first course.</T>
							<T>We’ll open a lesson you can start now.</T>
						</Reveal>
						{matches.error ? <ErrorBox message={errorText(matches.error)} onRetry={() => loadCourses({ requestPolicy: 'network-only' })} /> : null}
						{matches.fetching ? <T v="small">Finding your courses…</T> : null}
						{matchedCourses.map((item) => <CourseChoice key={item.slug} item={item} selected={course === item.slug} disabled={busy} onPress={() => setCourse(item.slug)} />)}
						{matches.data && !matches.fetching && !matchedCourses.length ? (
							<Card style={{ gap: 10 }}>
								<T v="h3">Your course may be on the way.</T>
								<T>Browse all courses or tell us what’s missing.</T>
								<Button small kind="ghost" title="Request a course" onPress={() => router.push('/request')} style={{ alignSelf: 'flex-start' }} />
							</Card>
						) : null}
					</>
				) : null}
				{error ? <ErrorBox message={error} /> : null}
			</Screen>

			<View style={{ borderTopWidth: hair, borderColor: t.line, backgroundColor: t.bg, paddingHorizontal: 22, paddingTop: 10, paddingBottom: Math.max(12, insets.bottom) }}>
				<View style={{ width: '100%', maxWidth: 516, alignSelf: 'center', gap: 7 }}>
					{step === 0 ? <Button title="Find my courses" icon={<ArrowRight size={18} color={t.onAmber} />} onPress={() => moveTo(1)} /> : null}
					{step === 1 ? <Button title={editing ? 'Save changes' : 'See my courses'} disabled={!selectedLevel} busy={busy}
						onPress={() => { if (editing) void finish(); else moveTo(2); }} /> : null}
					{step === 2 ? (
						<>
							<Button title="Start lesson" disabled={!course || !matchedCourses.some((item) => item.slug === course)} busy={busy}
								icon={<ArrowRight size={17} color={t.onAmber} />} onPress={() => void finish(course ?? undefined)} />
							<Button kind="ghost" small title="Browse all courses" disabled={busy} onPress={() => void finish()} />
						</>
					) : null}
				</View>
			</View>
		</View>
	);
}

function Choice({ title, detail, selected, disabled, onPress, Icon }: { title: string; detail: string; selected: boolean; disabled: boolean; onPress: () => void; Icon?: LucideIcon }) {
	const t = useTheme();
	return (
		<Press accessibilityRole="radio" accessibilityState={{ checked: selected }} disabled={disabled} onPress={onPress} style={{
			flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: radius.sm,
			backgroundColor: selected ? t.accentSoft : t.surface, borderWidth: hair, borderColor: selected ? t.accent : t.line2
		}}>
			{Icon ? <Icon size={20} color={selected ? t.accent : t.muted} /> : null}
			<View style={{ flex: 1, gap: 2 }}><T v="bodyStrong">{title}</T><T v="small">{detail}</T></View>
			{selected ? <Check size={18} color={t.accent} /> : null}
		</Press>
	);
}

function CourseChoice({ item, selected, disabled, onPress }: { item: CourseCard; selected: boolean; disabled: boolean; onPress: () => void }) {
	const t = useTheme();
	const hue = useTint(item.slug);
	return (
		<Press accessibilityRole="radio" accessibilityState={{ checked: selected }} disabled={disabled} onPress={onPress} style={{
			flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: radius.md,
			backgroundColor: hue.wash, borderWidth: hair, borderColor: selected ? hue.base : t.line2
		}}>
			<View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: hue.soft, alignItems: 'center', justifyContent: 'center' }}>
				<CourseIcon name={item.icon} size={21} color={hue.ink} />
			</View>
			<View style={{ flex: 1, gap: 2 }}>
				<T v="micro" color={hue.ink}>{item.code} · {item.lessonCount} {item.lessonCount === 1 ? 'lesson' : 'lessons'}</T>
				<T v="h3">{plain(item.title)}</T>
			</View>
			{selected ? <Check size={18} color={hue.ink} /> : null}
		</Press>
	);
}
