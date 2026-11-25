// Transparent top navigation bar with Kushi Study brand mark or Back pill,
// optional right actions (e.g. A−/A+, Contents), and flat circular User Profile avatar.
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import Svg, { Path, Polygon } from 'react-native-svg';
import { useSession } from '../lib/session';
import { alpha, fonts, useTheme } from '../lib/theme';
import { Press, hair } from './ui';

export function TopBar({
	backLabel,
	onBack,
	right,
	showProfile = true
}: {
	/** When set, shows a flat Back pill on the left instead of the Kushi Study wordmark. */
	backLabel?: string;
	onBack?: () => void;
	/** Optional controls placed immediately left of the Profile avatar. */
	right?: ReactNode;
	showProfile?: boolean;
}) {
	const t = useTheme();
	const router = useRouter();
	const name = useSession((s) => s.user?.name?.trim() || s.user?.email?.trim() || 'S');
	const initial = (name[0] || 'S').toUpperCase();

	return (
		<View
			style={{
				minHeight: 46,
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 10,
				backgroundColor: 'transparent'
			}}
		>
			{backLabel ? (
				<Press
					haptic
					onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/courses')))}
					accessibilityRole="button"
					accessibilityLabel={`Back to ${backLabel}`}
					style={{
						height: 36,
						paddingHorizontal: 12,
						borderRadius: 999,
						flexDirection: 'row',
						alignItems: 'center',
						gap: 6,
						backgroundColor: t.name === 'night' ? 'rgba(19, 27, 50, 0.78)' : alpha(t.surface, 0.9),
						borderWidth: hair,
						borderColor: t.name === 'night' ? 'rgba(210, 224, 255, 0.12)' : t.line2
					}}
				>
					<ArrowLeft size={15} color={t.fg2} />
					<Text numberOfLines={1} style={{ fontFamily: fonts.mono, fontSize: 12, color: t.fg, letterSpacing: 0.4 }}>
						{backLabel}
					</Text>
				</Press>
			) : (
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
					<KushiMark color={t.fg} amber={t.amber} />
					<Text style={{ fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.4, color: t.fg }}>Kushi</Text>
					<Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: t.muted }}>Study</Text>
				</View>
			)}

			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
				{right}
				{showProfile ? (
					<Press
						haptic
						onPress={() => router.push('/account')}
						accessibilityRole="button"
						accessibilityLabel="Account and settings"
						style={{
							width: 36,
							height: 36,
							borderRadius: 18,
							alignItems: 'center',
							justifyContent: 'center',
							backgroundColor: alpha(t.amber, t.name === 'night' ? 0.14 : 0.16),
							borderWidth: hair,
							borderColor: alpha(t.amber, 0.42)
						}}
					>
						<Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: t.accent }}>{initial}</Text>
					</Press>
				) : null}
			</View>
		</View>
	);
}

function KushiMark({ color, amber }: { color: string; amber: string }) {
	return (
		<Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
			<Path d="M12 4.5V12.5M12 12.5L5.2 17.8M12 12.5L18.8 17.8" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
			<Polygon points="15.5,5 20.5,5 20.5,10" fill={amber} />
		</Svg>
	);
}
