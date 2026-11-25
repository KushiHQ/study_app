// Practice: exam-style questions. Think it through, reveal the approach and the
// model answer, then mark "Got it" (web /c/[slug]/practice).
import { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from 'urql';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { COURSE, PRACTICE } from '../../../lib/api/queries';
import type { CourseOutline, CourseProgress, PracticeItem } from '../../../lib/api/types';
import { errorCode, errorText } from '../../../lib/api/client';
import { track, useProgress } from '../../../lib/progress';
import { practiceOf } from '../../../lib/study/payload';
import { alpha, fonts, radius, useTheme, useTint } from '../../../lib/theme';
import { Html } from '../../../components/Html';
import { Eye, SmallBtn } from '../../../components/blocks/Blocks';
import { TopBar } from '../../../components/TopBar';
import { Button, Card, ErrorBox, Loading, Meter, T, TopGlow, hair } from '../../../components/ui';

export default function Practice() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
	const t = useTheme();
	const hue = useTint(slug);
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const overlay = useProgress((s) => s.practice);
	const [{ data: cd }] = useQuery<{ course: CourseOutline; courseProgress: CourseProgress | null }>({ query: COURSE, variables: { slug, signedIn: true, preview: null } });
	const [{ data, error, fetching }, refetch] = useQuery<{ practice: unknown }>({ query: PRACTICE, variables: { slug, preview: null } });
	const items = useMemo(() => (data ? practiceOf(data.practice) : []), [data]);
	const gotIt = (id: string) => overlay[id] ?? !!cd?.courseProgress?.practiceDone.includes(id);
	const doneCount = items.filter((i) => gotIt(i.id)).length;

	if (!data && fetching) return <Loading />;
	return (
		<View style={{ flex: 1, backgroundColor: t.bg }}>
			<TopGlow color={hue.base} height={260} />
			<View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, gap: 10, paddingBottom: 8 }}>
				<TopBar
					backLabel={cd?.course?.card.code || 'Course'}
					onBack={() => router.back()}
					showProfile={false}
					right={
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
								{doneCount} / {items.length}
							</Text>
						</View>
					}
				/>
				<Meter value={items.length ? doneCount / items.length : 0} color={hue.base} height={5} />
			</View>

			{errorCode(error) === 'PAYWALL' ? (
				<View style={{ padding: 20, gap: 12 }}>
					<T v="title">Practice comes with a plan.</T>
					<Button title="See the plan" onPress={() => router.push('/plan')} style={{ borderRadius: 16 }} />
				</View>
			) : error && !data ? (
				<View style={{ padding: 20 }}>
					<ErrorBox message={errorText(error)} onRetry={() => refetch({ requestPolicy: 'network-only' })} />
				</View>
			) : (
				<FlatList
					data={items}
					keyExtractor={(i) => i.id}
					contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, gap: 14, paddingBottom: insets.bottom + 32, maxWidth: 680, width: '100%', alignSelf: 'center' }}
					renderItem={({ item }) => <Item item={item} got={gotIt(item.id)} hue={hue} slug={slug} />}
					ListEmptyComponent={<T>No practice questions yet.</T>}
				/>
			)}
		</View>
	);
}

function Item({ item, got, hue, slug }: { item: PracticeItem; got: boolean; hue: ReturnType<typeof useTint>; slug: string }) {
	const t = useTheme();
	const [open, setOpen] = useState(false);
	return (
		<Card
			tint={got ? t.success : hue.base}
			tintStrength={got ? (t.name === 'night' ? 10 : 6) : (t.name === 'night' ? 7 : 4)}
			style={{
				borderRadius: 20,
				padding: 18,
				gap: 12,
				borderWidth: got ? 1.5 : hair,
				borderColor: got ? alpha(t.success, 0.55) : t.line
			}}
		>
			<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
				<Eye hue={hue}>{item.label}</Eye>
				{item.marks ? (
					<View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: t.surface2 }}>
						<Text style={{ fontFamily: fonts.mono, fontSize: 10, color: t.muted }}>{item.marks}</Text>
					</View>
				) : null}
			</View>
			<Html html={item.question} hue={hue} style={{ fontFamily: fonts.readBold, fontSize: 16.5, lineHeight: 26 }} />
			{open ? (
				<View style={{ gap: 10 }}>
					<View style={{ backgroundColor: alpha(hue.base, t.name === 'night' ? 0.1 : 0.08), borderRadius: 14, padding: 14, gap: 4, borderWidth: hair, borderColor: alpha(hue.base, 0.25) }}>
						<Eye hue={hue}>How to approach it</Eye>
						<Html html={item.approach} hue={hue} style={{ fontSize: 15, lineHeight: 23 }} />
					</View>
					<View style={{ backgroundColor: t.surface2, borderRadius: 14, padding: 14, gap: 4, borderWidth: hair, borderColor: t.line2 }}>
						<Eye hue={hue}>Model answer</Eye>
						<Html html={item.answer} hue={hue} style={{ fontSize: 15, lineHeight: 23 }} />
					</View>
				</View>
			) : null}
			<View style={{ flexDirection: 'row', gap: 8 }}>
				<SmallBtn label={open ? 'Hide the answer' : 'Show the answer'} onPress={() => setOpen(!open)} />
				<SmallBtn
					label={got ? 'Got it' : 'Mark as got it'}
					strong={got}
					hue={{ ...hue, soft: t.successSoft, ink: t.success }}
					icon={got ? <Check size={14} color={t.success} /> : undefined}
					onPress={() => track({ kind: 'practice_mark', courseSlug: slug, itemId: item.id, gotIt: !got })}
				/>
			</View>
		</Card>
	);
}
