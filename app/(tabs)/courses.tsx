// Courses: every course, live search, department and level filters (Figma 02 · Courses).
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from 'urql';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X } from 'lucide-react-native';
import { CATALOGUE, SEARCH } from '../../lib/api/queries';
import type { CourseCard as Card, Department, Level } from '../../lib/api/types';
import { errorText } from '../../lib/api/client';
import { useSession } from '../../lib/session';
import { fonts, mix, radius, useTheme } from '../../lib/theme';
import { Button, ErrorBox, Press, Reveal, T, hair } from '../../components/ui';
import { CourseCard } from '../../components/CourseCard';
import { LoadingDots } from '../../components/LoadingDots';

export default function Courses() {
	const t = useTheme();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const user = useSession((s) => s.user);
	const [d, setD] = useState<string | null>(null);
	const [l, setL] = useState<string | null>(null);
	const [q, setQ] = useState('');
	const [debounced, setDebounced] = useState('');
	useEffect(() => {
		const id = setTimeout(() => setDebounced(q.trim()), 250);
		return () => clearTimeout(id);
	}, [q]);

	const [{ data, fetching, error }, refetch] = useQuery<{ departments: Department[]; levels: Level[]; courses?: Card[] }>({
		query: CATALOGUE,
		variables: { d, l, withCourses: true }
	});
	const [{ data: found, fetching: searching }] = useQuery<{ searchCourses: Card[] }>({ query: SEARCH, variables: { q: debounced, limit: 40 }, pause: debounced.length < 2 });

	const list = debounced.length >= 2 ? (found?.searchCourses ?? []) : (data?.courses ?? []);
	const depts = useMemo(() => {
		const all = data?.departments ?? [];
		const mine = user?.department?.id;
		return [...all].sort((a, b) => (a.id === mine ? -1 : b.id === mine ? 1 : a.name.localeCompare(b.name)));
	}, [data?.departments, user?.department?.id]);

	const activeDept = depts.find((x) => x.slug === d);

	const header = (
		<View style={{ gap: 14, marginBottom: 14 }}>
			<Reveal style={{ marginTop: 6 }}>
				<Text accessibilityRole="header" style={{ fontFamily: fonts.bodyBold, fontSize: 30, lineHeight: 35, letterSpacing: -0.6, color: t.fg }}>
					Courses
				</Text>
			</Reveal>

			{/* Search Bar */}
			<Reveal
				follow
				style={{
					flexDirection: 'row',
					alignItems: 'center',
					gap: 10,
					height: 46,
					borderRadius: 14,
					backgroundColor: t.name === 'night' ? mix(t.bg, 30, t.surface) : t.surface,
					borderWidth: hair,
					borderColor: t.line2,
					paddingHorizontal: 14
				}}
			>
				<Search size={18} color={t.muted} />
				<TextInput
					value={q}
					onChangeText={setQ}
					placeholder="Search title or code..."
					placeholderTextColor={t.muted}
					style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: t.fg, height: 44 }}
					returnKeyType="search"
					autoCorrect={false}
					accessibilityLabel="Search courses"
				/>
				{q ? (
					<Press onPress={() => setQ('')} hitSlop={10} accessibilityLabel="Clear search">
						<X size={17} color={t.muted} />
					</Press>
				) : null}
			</Reveal>

			{/* Department & Level Filter Pills */}
			{debounced.length < 2 ? (
				<View style={{ gap: 8 }}>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
						<FilterPill label="All" active={!d} onPress={() => (setD(null), setL(null))} />
						{depts.map((x) => (
							<FilterPill key={x.id} label={x.name} active={d === x.slug} onPress={() => (setD(x.slug), setL(null))} />
						))}
					</ScrollView>
					{d && data?.levels.length ? (
						<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
							<FilterPill label="All levels" active={!l} onPress={() => setL(null)} />
							{data.levels.map((x) => (
								<FilterPill key={x.code} label={x.name} active={l === x.code} onPress={() => setL(x.code)} />
							))}
						</ScrollView>
					) : null}
				</View>
			) : null}

			{debounced.length < 2 && list.length > 0 ? (
				<Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: t.fg, marginTop: 2 }}>
					{activeDept ? activeDept.name : 'All courses'}
				</Text>
			) : null}
			{error ? <ErrorBox message={errorText(error)} onRetry={() => refetch({ requestPolicy: 'network-only' })} /> : null}
		</View>
	);

	return (
		<FlatList
			style={{ flex: 1, backgroundColor: t.bg }}
			contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 24, gap: 10, width: '100%', maxWidth: 680, alignSelf: 'center' }}
			data={list}
			keyExtractor={(c) => c.slug}
			ListHeaderComponent={header}
			keyboardShouldPersistTaps="handled"
			keyboardDismissMode="on-drag"
			refreshControl={<RefreshControl refreshing={false} tintColor={t.amber} onRefresh={() => refetch({ requestPolicy: 'network-only' })} />}
			renderItem={({ item }) => <CourseCard card={item} />}
			ListEmptyComponent={
				fetching || searching ? (
					<LoadingDots label="Loading courses" />
				) : (
					<View style={{ gap: 6, paddingVertical: 20 }}>
						<T v="h3">No courses found</T>
						<T>Try a different title or course code.</T>
						<Button small kind="ghost" title="Request a course" onPress={() => router.push({ pathname: '/request', params: { title: q.trim() } })} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
					</View>
				)
			}
		/>
	);
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
	const t = useTheme();
	return (
		<Press
			haptic
			onPress={onPress}
			accessibilityRole="button"
			accessibilityState={{ selected: active }}
			style={{
				paddingHorizontal: 16,
				height: 34,
				borderRadius: radius.pill,
				justifyContent: 'center',
				backgroundColor: active ? t.fg : t.surface,
				borderWidth: active ? 0 : hair,
				borderColor: t.line2
			}}
		>
			<Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: active ? t.bg : t.fg2 }}>{label}</Text>
		</Press>
	);
}
