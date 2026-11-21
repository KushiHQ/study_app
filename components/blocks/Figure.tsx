// A picture with numbered hotspots (study_web_app Figure.svelte): tap a dot to
// read about that part. Arrows, lines and labels are drawn over the picture in
// the picture's own pixels. Figures with steps reveal spots and marks in turn.
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, Line, Marker, Path, Text as SText } from 'react-native-svg';
import type { Block, FigureMark } from '../../lib/api/types';
import { fonts, radius, useTheme, type Hue, type HueSet } from '../../lib/theme';
import { Html } from '../Html';
import { Press, T, hair } from '../ui';
import { SmallBtn } from './Blocks';

type FigureBlock = Extract<Block, { type: 'figure' }>;

export function Figure({ block, hue, width }: { block: FigureBlock; hue: HueSet; width: number }) {
	const t = useTheme();
	const { image, spots, steps = [], marks = [], caption } = block;
	const [active, setActive] = useState<number | null>(null);
	const [cur, setCur] = useState(-1); // -1: everything shown
	const [failed, setFailed] = useState(false);
	const w = Math.max(1, width - 2 * hair);
	const scale = w / (image.width || 1);
	const h = (image.height || 1) * scale;
	const visible = (step?: number) => cur < 0 || step == null || step <= cur;
	const colorOf = (m: FigureMark) => (m.hue === 'accent' || !m.hue ? hue.base : m.hue === 'ink' ? t.fg : t.hues[m.hue as Hue].base);
	const shownMarks = useMemo(() => marks.filter((m) => visible(m.step)), [marks, cur]);

	return (
		<View style={{ gap: 10 }}>
			<View style={{ borderRadius: radius.md, overflow: 'hidden', borderWidth: hair, borderColor: t.line, backgroundColor: t.surface2 }}>
				<View style={{ width: w, height: h }}>
					{failed ? (
						<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
							<T v="small">The picture didn’t load. Check your connection.</T>
						</View>
					) : (
						<Image source={{ uri: image.src }} style={{ width: w, height: h }} contentFit="contain" transition={250} accessibilityLabel={image.alt} onError={() => setFailed(true)} />
					)}
					{shownMarks.length ? (
						<Svg width={w} height={h} viewBox={`0 0 ${image.width} ${image.height}`} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
							<Defs>
								{shownMarks.map((m, i) => (
									<Marker key={i} id={`fa${i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
										<Path d="M1 1.5 L8.5 5 L1 8.5 Q2.6 5 1 1.5Z" fill={colorOf(m)} />
									</Marker>
								))}
							</Defs>
							{shownMarks.map((m, i) =>
								m.kind === 'label' ? (
									<SText key={i} x={m.x1} y={m.y1} fill={colorOf(m)} fontSize={Math.max(14, image.width / 40)} fontFamily={fonts.readHeavy} textAnchor="middle" stroke={t.bg} strokeWidth={0.6}>
										{m.label ?? ''}
									</SText>
								) : (
									<Line
										key={i}
										x1={m.x1}
										y1={m.y1}
										x2={m.x2 ?? m.x1}
										y2={m.y2 ?? m.y1}
										stroke={colorOf(m)}
										strokeWidth={Math.max(3, image.width / 260)}
										strokeLinecap="round"
										strokeDasharray={m.dashed ? `${image.width / 80} ${image.width / 80}` : undefined}
										markerEnd={m.kind === 'arrow' ? `url(#fa${i})` : undefined}
										markerStart={m.kind === 'arrow' && m.both ? `url(#fa${i})` : undefined}
									/>
								)
							)}
						</Svg>
					) : null}
					{spots.map((s, i) =>
						visible(s.step) ? (
							<Animated.View key={i} entering={ZoomIn.delay(i * 40)} style={{ position: 'absolute', left: s.x * scale - 15, top: s.y * scale - 15 }}>
								<Press
									haptic
									onPress={() => setActive(active === i ? null : i)}
									accessibilityRole="button"
									accessibilityLabel={s.title}
									hitSlop={8}
									style={{
										width: 30,
										height: 30,
										borderRadius: 15,
										backgroundColor: active === i ? t.amber : hue.base,
										borderWidth: 2,
										borderColor: '#ffffff',
										alignItems: 'center',
										justifyContent: 'center'
									}}
								>
									<Text style={{ color: active === i ? t.onAmber : t.onHue, fontFamily: fonts.readHeavy, fontSize: 13 }}>{i + 1}</Text>
								</Press>
							</Animated.View>
						) : null
					)}
				</View>
			</View>
			{active != null && spots[active] ? (
				<Animated.View key={active} entering={FadeIn.duration(200)} style={{ backgroundColor: hue.wash, borderRadius: 14, padding: 12, gap: 4 }}>
					<Text style={{ fontFamily: fonts.readHeavy, fontSize: 15, color: hue.ink }}>
						{active + 1}. {spots[active].title}
					</Text>
					<Html html={spots[active].html} hue={hue} style={{ fontSize: 15, lineHeight: 23 }} />
				</Animated.View>
			) : spots.length ? (
				<T v="small">Tap a numbered dot to learn about that part.</T>
			) : null}
			{steps.length ? (
				<View style={{ gap: 6 }}>
					<View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
						<SmallBtn label={cur < 0 ? 'Step through' : 'Back'} onPress={() => (Haptics.selectionAsync().catch(() => {}), setCur(cur < 0 ? 0 : Math.max(0, cur - 1)))} />
						{cur >= 0 && cur < steps.length - 1 ? <SmallBtn label="Next" strong hue={hue} onPress={() => setCur(cur + 1)} /> : null}
						{cur >= 0 ? <T v="label" style={{ marginLeft: 'auto' }}>{`Step ${cur + 1} of ${steps.length}`}</T> : null}
					</View>
					{cur >= 0 ? (
						<Animated.View key={cur} entering={FadeIn}>
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
