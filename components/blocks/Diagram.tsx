// A lesson diagram: tap a part to read about it; diagrams with steps get a
// player (play, back, next) that shows a change step by step. Before the student
// starts, the finished picture shows (same rules as the web's Diagram.svelte).
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react-native';
import { alpha, fonts, mix, radius, useTheme, type HueSet } from '../../lib/theme';
import { useStudyPrefs } from '../../lib/prefs';
import { Html } from '../Html';
import { InfoTip, LuminousBg, Press, T, hair } from '../ui';
import { SvgTree } from '../SvgTree';

type Note = { title: string; html: string };

export function Diagram({ svg, caption, parts = [], steps = [], hue, width, autoplay }: { svg: string; caption: string; parts?: (Note & { id: string })[]; steps?: Note[]; hue: HueSet; width: number; autoplay?: boolean }) {
	const t = useTheme();
	const animSpeed = useStudyPrefs((s) => s.animSpeed);
	const byId = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts]);
	const [active, setActive] = useState<string | null>(null);
	const [cur, setCur] = useState(-1);
	const [playing, setPlaying] = useState(false);
	const interacted = useRef(false);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const last = steps.length - 1;

	useEffect(() => {
		if (!autoplay || interacted.current) return;
		interacted.current = true;
		setCur(0);
		setPlaying(last > 0);
	}, [autoplay, last]);

	useEffect(() => {
		if (!playing) return;
		if (cur >= last) {
			setPlaying(false);
			return;
		}
		timer.current = setTimeout(() => setCur((c) => Math.min(last, c + 1)), Math.round(2600 / animSpeed));
		return () => clearTimeout(timer.current);
	}, [playing, cur, last, animSpeed]);

	const go = (n: number) => {
		interacted.current = true;
		setPlaying(false);
		setCur(Math.max(0, Math.min(last, n)));
		Haptics.selectionAsync().catch(() => {});
	};
	const shown = cur < 0 ? last : cur;
	const note = active ? byId.get(active) : null;

	return (
		<View
			style={{
				position: 'relative',
				backgroundColor: t.surface,
				borderRadius: radius.md,
				borderWidth: hair,
				borderColor: alpha(hue.base, 0.24),
				padding: 12,
				gap: 10,
				overflow: 'hidden'
			}}
		>
			<LuminousBg from={mix(hue.base, t.name === 'night' ? 8 : 5, t.surface)} to={t.surface} borderRadius={radius.md} />
			<View style={{ alignItems: 'center' }}>
				<SvgTree
					svg={svg}
					hue={hue}
					maxWidth={Math.max(1, width - 24 - 2 * hair)}
					step={steps.length ? { cur, last } : undefined}
					activePart={active}
					onPart={
						parts.length
							? (id) => {
									Haptics.selectionAsync().catch(() => {});
									setActive((a) => (a === id ? null : byId.has(id) ? id : null));
								}
							: undefined
					}
				/>
			</View>
			{parts.length ? (
				<View style={{ position: 'absolute', top: 8, right: 8 }}>
					<InfoTip text="Tap any highlighted part of this diagram to inspect it." label="Interactive diagram hint" />
				</View>
			) : null}
			{note ? (
				<Animated.View entering={FadeIn.duration(200)} style={{ backgroundColor: hue.wash, borderRadius: 14, padding: 12, gap: 4 }}>
					<Text style={{ fontFamily: fonts.readHeavy, fontSize: 15, color: hue.ink }}>{note.title}</Text>
					<Html html={note.html} hue={hue} style={{ fontSize: 15, lineHeight: 23 }} />
				</Animated.View>
			) : null}
			{steps.length ? (
				<View style={{ gap: 8 }}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
						<Ctl label="Back" onPress={() => go(shown - 1)} disabled={cur === 0}>
							<ChevronLeft size={18} color={t.fg2} />
						</Ctl>
						<Ctl
							label={playing ? 'Pause' : 'Play'}
							strong
							hue={hue}
							onPress={() => {
								interacted.current = true;
								if (playing) return setPlaying(false);
								if (cur < 0 || cur >= last) setCur(0);
								setPlaying(true);
							}}
						>
							{playing ? <Pause size={18} color={t.onHue} /> : <Play size={18} color={t.onHue} />}
						</Ctl>
						<Ctl label="Next" onPress={() => go(cur < 0 ? 0 : shown + 1)} disabled={cur >= last}>
							<ChevronRight size={18} color={t.fg2} />
						</Ctl>
						<T v="label" style={{ marginLeft: 'auto' }}>
							{cur < 0 ? `${steps.length} steps` : `Step ${cur + 1} of ${steps.length}`}
						</T>
					</View>
					{cur >= 0 ? (
						<Animated.View key={cur} entering={FadeIn.duration(250)} style={{ gap: 2 }}>
							<Html html={steps[cur].title} hue={hue} style={{ fontFamily: fonts.readHeavy, fontSize: 15 }} />
							<Html html={steps[cur].html} hue={hue} style={{ fontSize: 15, lineHeight: 23 }} />
						</Animated.View>
					) : null}
				</View>
			) : null}
			{caption ? <Html html={caption} hue={hue} style={{ fontSize: 14, lineHeight: 21, color: t.muted }} /> : null}
		</View>
	);
}

function Ctl({ children, onPress, label, strong, hue, disabled }: { children: React.ReactNode; onPress: () => void; label: string; strong?: boolean; hue?: HueSet; disabled?: boolean }) {
	const t = useTheme();
	return (
		<Press
			onPress={onPress}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityLabel={label}
			style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: strong ? (hue?.base ?? t.amber) : t.surface2, opacity: disabled ? 0.4 : 1 }}
		>
			{children}
		</Press>
	);
}
