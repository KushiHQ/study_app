// Practice: exam-style questions. Think it through, reveal the approach and the
// model answer, then mark "Got it" (web /c/[slug]/practice).
import { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from 'urql';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check } from 'lucide-react-native';
import { COURSE, PRACTICE } from '../../../lib/api/queries';
import type { CourseProgress, PracticeItem } from '../../../lib/api/types';
import { errorCode, errorText } from '../../../lib/api/client';
import { track, useProgress } from '../../../lib/progress';
import { practiceOf } from '../../../lib/study/payload';
import { fonts, radius, useTheme, useTint } from '../../../lib/theme';
import { Html } from '../../../components/Html';
import { Eye, SmallBtn } from '../../../components/blocks/Blocks';
import { Button, ErrorBox, Loading, Meter, Press, T, hair } from '../../../components/ui';

export default function Practice() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
	const t = useTheme();
	const hue = useTint(slug);
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const overlay = useProgress((s) => s.practice);
	const [{ data: cd }] = useQuery<{ courseProgress: CourseProgress | null }>({ query: COURSE, variables: { slug, signedIn: true, preview: null } });
	const [{ data, error, fetching }, refetch] = useQuery<{ practice: unknown }>({ query: PRACTICE, variables: { slug, preview: null } });
	const items = useMemo(() => (data ? practiceOf(data.practice) : []), [data]);
	const gotIt = (id: string) => overlay[id] ?? !!cd?.courseProgress?.practiceDone.includes(id);
	const doneCount = items.filter((i) => gotIt(i.id)).length;

	if (!data && fetching) return <Loading />;
	return (
		<View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 56 }}>
				<Press onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
					<ArrowLeft size={22} color={t.fg} />
				</Press>
				<Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: t.fg }}>Practice</Text>
				<T v="label">
					{doneCount}/{items.length}
				</T>
			</View>
			<View style={{ paddingHorizontal: 16, marginBottom: 6 }}>
				<Meter value={items.length ? doneCount / items.length : 0} color={hue.base} />
			</View>
			{errorCode(error) === 'PAYWALL' ? (
				<View style={{ padding: 20, gap: 12 }}>
					<T v="title">Practice comes with a plan.</T>
					<Button title="See the plan" onPress={() => router.push('/plan')} />
				</View>
			) : error && !data ? (
				<View style={{ padding: 20 }}>
					<ErrorBox message={errorText(error)} onRetry={() => refetch({ requestPolicy: 'network-only' })} />
				</View>
			) : (
				<FlatList
					data={items}
					keyExtractor={(i) => i.id}
					contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 30 }}
					renderItem={({ item, index }) => <Item item={item} index={index} got={gotIt(item.id)} hue={hue} slug={slug} />}
					ListEmptyComponent={<T>No practice questions yet.</T>}
				/>
			)}
		</View>
	);
}

function Item({ item, index, got, hue, slug }: { item: PracticeItem; index: number; got: boolean; hue: ReturnType<typeof useTint>; slug: string }) {
	const t = useTheme();
	const [open, setOpen] = useState(false);
	return (
		<Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 50)} style={{ backgroundColor: t.surface, borderRadius: radius.md, padding: 16, gap: 10, borderWidth: got ? 1.5 : hair, borderColor: got ? t.success : t.line }}>
			<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
				<Eye hue={hue}>{item.label}</Eye>
				{item.marks ? <T v="micro">{item.marks}</T> : null}
			</View>
			<Html html={item.question} hue={hue} style={{ fontFamily: fonts.readBold, fontSize: 17, lineHeight: 26 }} />
			{open ? (
				<Animated.View entering={FadeInDown.duration(300)} style={{ gap: 10 }}>
					<View style={{ backgroundColor: hue.wash, borderRadius: 14, padding: 12, gap: 4 }}>
						<Eye hue={hue}>How to approach it</Eye>
						<Html html={item.approach} hue={hue} style={{ fontSize: 15, lineHeight: 23 }} />
					</View>
					<View style={{ backgroundColor: t.surface2, borderRadius: 14, padding: 12, gap: 4 }}>
						<Eye hue={hue}>A model answer</Eye>
						<Html html={item.answer} hue={hue} style={{ fontSize: 15, lineHeight: 23 }} />
					</View>
				</Animated.View>
			) : null}
			<View style={{ flexDirection: 'row', gap: 8 }}>
				<SmallBtn label={open ? 'Hide the answer' : 'Show the answer'} onPress={() => setOpen(!open)} />
				<SmallBtn label={got ? 'Got it' : 'Mark as got it'} strong={got} hue={{ ...hue, soft: t.successSoft, ink: t.success }} icon={got ? <Check size={14} color={t.success} /> : undefined} onPress={() => track({ kind: 'practice_mark', courseSlug: slug, itemId: item.id, gotIt: !got })} />
			</View>
		</Animated.View>
	);
}
