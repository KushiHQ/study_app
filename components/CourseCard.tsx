import { View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { CourseCard as Card, CourseProgress } from '../lib/api/types';
import { alpha, mix, radius, useTheme, useTint } from '../lib/theme';
import { plain } from '../lib/html';
import { courseHref } from '../lib/nav';
import { LuminousBg, Press, T, hair } from './ui';
import { Ring } from './Ring';
import { CourseHalo } from './CourseHalo';
import { CourseIcon } from './CourseIcon';

export function CourseCard({ card, progress, compact }: { card?: Card; progress?: CourseProgress; compact?: boolean }) {
	const t = useTheme();
	const router = useRouter();
	const slug = card?.slug ?? progress!.courseSlug;
	const hue = useTint(slug);
	const code = card?.code ?? progress?.courseCode ?? '';
	const title = plain(card?.title ?? progress?.courseTitle ?? '');
	const time = card && (card.minutes >= 90 ? `${Math.round(card.minutes / 60)} h` : `${card.minutes} min`);

	return (
		<Press
			onPress={() => router.push(courseHref(slug))}
			accessibilityRole="button"
			accessibilityLabel={`${code} ${title}`}
			style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: hair, borderColor: alpha(hue.base, 0.30), overflow: 'hidden', padding: 17, gap: 10 }}
		>
			<LuminousBg from={mix(hue.base, t.name === 'night' ? 16 : 11, t.surface)} to={t.surface} borderRadius={radius.md} />
			<CourseHalo color={hue.base} />
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
				<View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: hue.soft, alignItems: 'center', justifyContent: 'center' }}>
					<CourseIcon name={card?.icon} size={22} color={hue.ink} />
				</View>
				<T v="micro" color={hue.ink} style={{ backgroundColor: hue.soft, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 9 }}>{code}</T>
				<View style={{ flex: 1 }} />
				<ArrowRight size={18} color={hue.ink} />
			</View>
			<T v="h2">{title}</T>
			{!compact && card?.nickname ? <T numberOfLines={2}>{plain(card.nickname)}</T> : null}
			{!compact && card && !progress ? (
				<T v="micro">{card.unitCount} {card.unitCount === 1 ? 'unit' : 'units'} · {card.lessonCount} lessons · {time}</T>
			) : null}
			{progress ? (
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: hair, borderColor: alpha(hue.base, 0.23) }}>
					<Ring value={progress.covered} size={42} stroke={4} color={hue.base} track={hue.soft} duration={250} />
					<View style={{ flex: 1, gap: 2 }}>
						<T v="bodyStrong">{Math.round(progress.covered * 100)}% covered · {Math.round(progress.examReady * 100)}% exam-ready</T>
						{progress.nextLesson ? <T v="small" numberOfLines={1}>Next: {plain(progress.nextLesson.title)}</T> : null}
					</View>
				</View>
			) : null}
		</Press>
	);
}
