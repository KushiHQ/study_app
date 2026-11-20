// Courses: every course, live search, department and level filters (web /courses).
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useQuery } from 'urql';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X } from 'lucide-react-native';
import { CATALOGUE, SEARCH } from '../../lib/api/queries';
import type { CourseCard as Card, Department, Level } from '../../lib/api/types';
import { errorText } from '../../lib/api/client';
import { useSession } from '../../lib/session';
import { fonts, radius, useTheme } from '../../lib/theme';
import { Chip, ErrorBox, Eyebrow, Press, T, hair } from '../../components/ui';
import { CourseCard } from '../../components/CourseCard';

export default function Courses() {
	const t = useTheme();
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

	const header = (
		<View style={{ gap: 14, marginBottom: 14 }}>
			<View style={{ marginTop: 8 }}>
				<Eyebrow>Courses</Eyebrow>
				<T v="display">Find your course.</T>
			</View>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: radius.pill, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2, paddingHorizontal: 16 }}>
				<Search size={18} color={t.muted} />
				<TextInput
					value={q}
					onChangeText={setQ}
					placeholder="Search by title or code"
					placeholderTextColor={t.muted}
					style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: t.fg, height: 48 }}
					returnKeyType="search"
					autoCorrect={false}
					accessibilityLabel="Search courses"
				/>
				{q ? (
					<Press onPress={() => setQ('')} hitSlop={10} accessibilityLabel="Clear search">
						<X size={18} color={t.muted} />
					</Press>
				) : null}
			</View>
			{debounced.length < 2 ? (
				<>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
						<Chip label="All departments" active={!d} onPress={() => (setD(null), setL(null))} />
						{depts.map((x) => (
							<Chip key={x.id} label={x.name} active={d === x.slug} onPress={() => (setD(x.slug), setL(null))} />
						))}
					</ScrollView>
					{d && data?.levels.length ? (
						<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
							<Chip label="All levels" active={!l} onPress={() => setL(null)} />
							{data.levels.map((x) => (
								<Chip key={x.code} label={x.name} active={l === x.code} onPress={() => setL(x.code)} />
							))}
						</ScrollView>
					) : null}
				</>
			) : null}
			{error ? <ErrorBox message={errorText(error)} onRetry={() => refetch({ requestPolicy: 'network-only' })} /> : null}
		</View>
	);

	return (
		<FlatList
			style={{ flex: 1, backgroundColor: t.bg }}
			contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: insets.bottom + 110, gap: 12 }}
			data={list}
			keyExtractor={(c) => c.slug}
			ListHeaderComponent={header}
			keyboardShouldPersistTaps="handled"
			keyboardDismissMode="on-drag"
			refreshControl={<RefreshControl refreshing={false} tintColor={t.amber} onRefresh={() => refetch({ requestPolicy: 'network-only' })} />}
			renderItem={({ item, index }) => (
				<Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(380)}>
					<CourseCard card={item} />
				</Animated.View>
			)}
			ListEmptyComponent={
				fetching || searching ? (
					<T v="small">Loading…</T>
				) : (
					<View style={{ gap: 6, paddingVertical: 20 }}>
						<T v="h3">Uncharted territory.</T>
						<T>No course matches yet. You can ask for one on study.kushi.ng/request.</T>
					</View>
				)
			}
		/>
	);
}
