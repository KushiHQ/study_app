// A course card in the course's own hue (web CourseCard.svelte).
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { CourseCard as Card, CourseProgress } from '../lib/api/types';
import { fonts, radius, useTheme, useTint } from '../lib/theme';
import { plain } from '../lib/html';
import { courseHref } from '../lib/nav';
import { Press, T, hair } from './ui';
import { Ring } from './Ring';
import { CourseIcon } from './CourseIcon';

export function CourseCard({ card, progress, compact }: { card?: Card; progress?: CourseProgress; compact?: boolean }) {
	const t = useTheme();
	const router = useRouter();
	const slug = card?.slug ?? progress!.courseSlug;
	const hue = useTint(slug);
	const code = card?.code ?? progress?.courseCode ?? '';
	const title = card?.title ?? progress?.courseTitle ?? '';
	return (
		<Press
			haptic
			onPress={() => router.push(courseHref(slug))}
			accessibilityRole="button"
			accessibilityLabel={`${code} ${title}`}
			style={{
				backgroundColor: t.surface,
				borderRadius: radius.md,
				borderWidth: hair,
				borderColor: t.line,
				overflow: 'hidden',
				shadowColor: t.shadow.color,
				shadowOpacity: t.shadow.opacity * 0.7,
				shadowRadius: t.shadow.radius,
				shadowOffset: { width: 0, height: t.shadow.y / 2 }
			}}
		>
			<View style={{ height: 6, backgroundColor: hue.base }} />
			<View style={{ padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
				<View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: hue.soft, alignItems: 'center', justifyContent: 'center' }}>
					<CourseIcon name={card?.icon} size={24} color={hue.ink} />
				</View>
				<View style={{ flex: 1, gap: 3 }}>
					<Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, color: hue.ink }}>{code}</Text>
					<Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21, color: t.fg }} numberOfLines={2}>
						{title}
					</Text>
					{!compact && card ? (
						<T v="small" numberOfLines={2}>
							{card.nickname ? `${card.nickname} · ` : ''}
							{card.lessonCount} lessons · {Math.max(1, Math.round(card.minutes / 60))} h
						</T>
					) : null}
					{progress?.nextLesson ? (
						<T v="small" numberOfLines={1}>
							Next: {plain(progress.nextLesson.title)}
						</T>
					) : null}
				</View>
				{progress ? (
					<Ring value={progress.covered} size={50} stroke={5} color={hue.base} track={t.surface2}>
						<Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: t.fg }}>{Math.round(progress.covered * 100)}%</Text>
					</Ring>
				) : null}
			</View>
		</Press>
	);
}
