import { Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { CourseCard as Card, CourseProgress } from '../lib/api/types';
import { alpha, fonts, mix, radius, useTheme, useTint } from '../lib/theme';
import { plain } from '../lib/html';
import { courseHref } from '../lib/nav';
import { LuminousBg, Press, hair } from './ui';
import { CourseIcon } from './CourseIcon';

export function CourseCard({ card, progress, compact }: { card?: Card; progress?: CourseProgress; compact?: boolean }) {
	const t = useTheme();
	const router = useRouter();
	const slug = card?.slug ?? progress!.courseSlug;
	const hue = useTint(slug);
	const code = card?.code ?? progress?.courseCode ?? '';
	const title = plain(card?.title ?? progress?.courseTitle ?? '');
	const meta = progress
		? `${Math.round(progress.covered * 100)}% covered · ${Math.round(progress.examReady * 100)}% exam-ready`
		: card
			? `${card.unitCount} ${card.unitCount === 1 ? 'unit' : 'units'} · ${card.lessonCount} lessons`
			: '';

	return (
		<Press
			haptic
			onPress={() => router.push(courseHref(slug))}
			accessibilityRole="button"
			accessibilityLabel={`${code} ${title}`}
			style={{
				backgroundColor: t.surface,
				borderRadius: 20,
				borderWidth: hair,
				borderColor: alpha(hue.base, 0.28),
				overflow: 'hidden',
				padding: compact ? 14 : 16,
				flexDirection: 'row',
				alignItems: 'center',
				gap: 14
			}}
		>
			<LuminousBg from={mix(hue.base, t.name === 'night' ? 14 : 9, t.surface)} to={t.surface} borderRadius={20} />
			<View
				style={{
					width: 48,
					height: 48,
					borderRadius: 14,
					backgroundColor: hue.base,
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0
				}}
			>
				<CourseIcon name={card?.icon} size={23} color={t.onHue} />
			</View>
			<View style={{ flex: 1, minWidth: 0, gap: 2 }}>
				<Text numberOfLines={1} style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, color: hue.ink, textTransform: 'uppercase' }}>
					{code}
				</Text>
				<Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21, color: t.fg }}>
					{title}
				</Text>
				{meta ? (
					<Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 12, color: t.muted }}>
						{meta}
					</Text>
				) : null}
			</View>
			<ChevronRight size={18} color={t.muted} />
		</Press>
	);
}
