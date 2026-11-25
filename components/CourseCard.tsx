import { Text, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { CourseCard as Card, CourseProgress } from '../lib/api/types';
import { alpha, fonts, mix, useTheme, useTint } from '../lib/theme';
import { plain } from '../lib/html';
import { courseHref } from '../lib/nav';
import { LuminousBg, Meter, Press, hair } from './ui';

export function CourseCard({ card, progress, compact }: { card?: Card; progress?: CourseProgress; compact?: boolean }) {
	const t = useTheme();
	const router = useRouter();
	const slug = card?.slug ?? progress!.courseSlug;
	const hue = useTint(slug);
	const code = card?.code ?? progress?.courseCode ?? '';
	const title = plain(card?.title ?? progress?.courseTitle ?? '');
	const coveredPct = progress ? Math.round(progress.covered * 100) : null;
	const readyPct = progress ? Math.round(progress.examReady * 100) : null;
	const meta = progress
		? `${coveredPct}% covered · ${readyPct}% exam-ready`
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
				borderColor: alpha(hue.base, t.name === 'night' ? 0.3 : 0.24),
				overflow: 'hidden',
				padding: compact ? 15 : 18,
				gap: compact ? 9 : 11
			}}
		>
			<LuminousBg from={mix(hue.base, t.name === 'night' ? 14 : 9, t.surface)} to={t.surface} borderRadius={20} />

			{/* Top Row: Flat Code Pill + Hue Arrow */}
			<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
				{code ? (
					<View
						style={{
							paddingHorizontal: 10,
							paddingVertical: 4,
							borderRadius: 8,
							backgroundColor: alpha(hue.base, t.name === 'night' ? 0.16 : 0.13),
							borderWidth: hair,
							borderColor: alpha(hue.base, 0.32)
						}}
					>
						<Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.9, color: hue.ink, textTransform: 'uppercase' }}>
							{code}
						</Text>
					</View>
				) : (
					<View />
				)}
				<View
					style={{
						width: 30,
						height: 30,
						borderRadius: 15,
						backgroundColor: alpha(hue.base, t.name === 'night' ? 0.14 : 0.1),
						alignItems: 'center',
						justifyContent: 'center'
					}}
				>
					<ArrowRight size={15} color={hue.ink} />
				</View>
			</View>

			{/* Course Title */}
			<Text
				numberOfLines={2}
				style={{
					fontFamily: fonts.display,
					fontSize: compact ? 16 : 17,
					lineHeight: compact ? 22 : 24,
					letterSpacing: -0.4,
					color: t.fg
				}}
			>
				{title}
			</Text>

			{/* Progress Meter (when enrolled) + Meta */}
			{progress ? (
				<View style={{ gap: 6 }}>
					<Meter value={progress.covered} color={hue.base} height={6} />
					<Text numberOfLines={1} style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.4, color: t.muted }}>
						{meta}
					</Text>
				</View>
			) : meta ? (
				<Text numberOfLines={1} style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.4, color: t.muted }}>
					{meta}
				</Text>
			) : null}
		</Press>
	);
}
