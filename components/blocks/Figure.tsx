// A lesson figure (matches study_web_app Figure.svelte): a picture with numbered hotspots.
// Tap a numbered dot on the picture OR a numbered chip below to read its note.
// Arrows, lines and labels are drawn with crisp white halos for legibility over any image.
// A figure never animates/steps: everything shows at once (legacy `steps` are ignored just like web).
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Svg, { G, Line, Polygon, Text as SText } from 'react-native-svg';
import type { Block, FigureMark } from '../../lib/api/types';
import { alpha, fonts, mix, radius, useTheme, type Hue, type HueSet } from '../../lib/theme';
import { Html } from '../Html';
import { LuminousBg, Press, T, hair } from '../ui';
import { SmallBtn } from './Blocks';

type FigureBlock = Extract<Block, { type: 'figure' }>;

export function Figure({ block, hue, width }: { block: FigureBlock; hue: HueSet; width: number }) {
	const t = useTheme();
	const { image, spots = [], marks = [], caption } = block;
	const [active, setActive] = useState<number | null>(null);
	const [failed, setFailed] = useState(false);
	const [attempt, setAttempt] = useState(0);

	const innerW = Math.max(1, width - 24 - 2 * hair);
	const imgW = image?.width && Number.isFinite(image.width) && image.width > 0 ? image.width : 1;
	const imgH = image?.height && Number.isFinite(image.height) && image.height > 0 ? image.height : 1;
	const scale = innerW / imgW;
	const h = Math.max(1, imgH * scale);
	/** Picture pixels per screen pixel so marks stay crisp at any image resolution. */
	const k = imgW / Math.max(1, innerW);

	const colorOf = (m: FigureMark) =>
		m.hue === 'accent' || !m.hue ? hue.base : m.hue === 'ink' ? '#1d2430' : (t.hues[m.hue as Hue]?.base ?? hue.base);

	const head = (x1: number, y1: number, x2: number, y2: number) => {
		const a = Math.atan2(y2 - y1, x2 - x1);
		const L = 13 * k;
		const W = 6.5 * k;
		const bx = x2 - L * Math.cos(a);
		const by = y2 - L * Math.sin(a);
		const px = -Math.sin(a) * W;
		const py = Math.cos(a) * W;
		return `${x2},${y2} ${bx + px},${by + py} ${bx - px},${by - py}`;
	};

	const trim = (x1: number, y1: number, x2: number, y2: number): [number, number] => {
		const d = Math.hypot(x2 - x1, y2 - y1) || 1;
		const ratio = Math.max(0, (d - 10 * k) / d);
		return [x1 + (x2 - x1) * ratio, y1 + (y2 - y1) * ratio];
	};

	const labelAt = (m: FigureMark) => {
		if (m.kind === 'label') return { x: m.x1, y: m.y1, anchor: 'middle' as const };
		const x2 = m.x2 ?? m.x1;
		const y2 = m.y2 ?? m.y1;
		const a = Math.atan2(y2 - m.y1, x2 - m.x1);
		const dx = Math.cos(a);
		const dy = Math.sin(a);
		const pad = 10 * k;
		const x = Math.max(4 * k, Math.min(imgW - 4 * k, x2 + dx * pad));
		const y = Math.max(16 * k, Math.min(imgH - 6 * k, y2 + dy * pad + (dy > 0.5 ? 12 * k : dy < -0.5 ? 0 : 5 * k)));
		const anchor: 'start' | 'end' | 'middle' = dx > 0.5 ? 'start' : dx < -0.5 ? 'end' : 'middle';
		return { x, y, anchor };
	};

	const imgSrc = attempt ? `${image.src}${image.src.includes('?') ? '&' : '?'}r=${attempt}` : image.src;
	const toggleSpot = (i: number) => {
		Haptics.selectionAsync().catch(() => {});
		setActive((cur) => (cur === i ? null : i));
	};

	return (
		<View
			style={{
				backgroundColor: t.surface,
				borderRadius: radius.md,
				borderWidth: hair,
				borderColor: alpha(hue.base, 0.24),
				padding: 12,
				gap: 12,
				overflow: 'hidden'
			}}
		>
			<LuminousBg from={mix(hue.base, t.name === 'night' ? 8 : 5, t.surface)} to={t.surface} borderRadius={radius.md} />

			{/* Image stage with crisp light backing matching web Figure.svelte */}
			<View style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: t.name === 'night' ? '#eae6de' : '#f8f6f1', width: innerW, height: h }}>
				{failed ? (
					<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 10 }}>
						<T v="small" style={{ textAlign: 'center', color: '#475569' }}>
							The picture couldn’t load. Check your connection and try again.
						</T>
						<SmallBtn
							label="Try again"
							strong
							hue={hue}
							onPress={() => {
								setFailed(false);
								setAttempt((n) => n + 1);
							}}
						/>
					</View>
				) : (
					<Image
						source={{ uri: imgSrc }}
						style={{ width: innerW, height: h }}
						contentFit="contain"
						transition={220}
						accessibilityLabel={image.alt}
						onError={() => setFailed(true)}
					/>
				)}

				{marks.length && !failed ? (
					<Svg width={innerW} height={h} viewBox={`0 0 ${imgW} ${imgH}`} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
						{marks.map((m, i) => {
							const c = colorOf(m);
							const x2 = m.x2 ?? m.x1;
							const y2 = m.y2 ?? m.y1;
							const end = m.kind === 'arrow' ? trim(m.x1, m.y1, x2, y2) : ([x2, y2] as [number, number]);
							const start = m.kind === 'arrow' && m.both ? trim(x2, y2, m.x1, m.y1) : ([m.x1, m.y1] as [number, number]);
							const at = m.label ? labelAt(m) : null;
							return (
								<G key={i}>
									{m.kind !== 'label' ? (
										<>
											<Line
												x1={start[0]}
												y1={start[1]}
												x2={end[0]}
												y2={end[1]}
												stroke="rgba(255,255,255,0.86)"
												strokeWidth={4.8 * k}
												strokeLinecap="round"
												strokeDasharray={m.dashed ? `${9 * k} ${7 * k}` : undefined}
											/>
											<Line
												x1={start[0]}
												y1={start[1]}
												x2={end[0]}
												y2={end[1]}
												stroke={c}
												strokeWidth={2.5 * k}
												strokeLinecap="round"
												strokeDasharray={m.dashed ? `${9 * k} ${7 * k}` : undefined}
											/>
											{m.kind === 'arrow' ? (
												<>
													<Polygon points={head(m.x1, m.y1, x2, y2)} fill={c} stroke="rgba(255,255,255,0.86)" strokeWidth={1.1 * k} strokeLinejoin="round" />
													{m.both ? <Polygon points={head(x2, y2, m.x1, m.y1)} fill={c} stroke="rgba(255,255,255,0.86)" strokeWidth={1.1 * k} strokeLinejoin="round" /> : null}
												</>
											) : null}
										</>
									) : null}
									{m.label && at ? (
										<>
											<SText x={at.x} y={at.y} fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth={3.6 * k} strokeLinejoin="round" fontSize={13.5 * k} fontFamily={fonts.readHeavy} textAnchor={at.anchor}>
												{m.label}
											</SText>
											<SText x={at.x} y={at.y} fill={m.kind === 'label' ? '#1d2430' : c} fontSize={13.5 * k} fontFamily={fonts.readHeavy} textAnchor={at.anchor}>
												{m.label}
											</SText>
										</>
									) : null}
								</G>
							);
						})}
					</Svg>
				) : null}

				{!failed &&
					spots.map((s, i) => {
						const isOn = active === i;
						return (
							<View key={i} style={{ position: 'absolute', left: s.x * scale - 14, top: s.y * scale - 14 }}>
								<Press
									onPress={() => toggleSpot(i)}
									accessibilityRole="button"
									accessibilityLabel={s.title}
									hitSlop={10}
									style={{
										width: 28,
										height: 28,
										borderRadius: 14,
										backgroundColor: isOn ? t.fg : hue.base,
										borderWidth: 2.5,
										borderColor: '#ffffff',
										alignItems: 'center',
										justifyContent: 'center'
									}}
								>
									<Text style={{ color: isOn ? t.bg : t.onHue, fontFamily: fonts.readHeavy, fontSize: 12 }}>{i + 1}</Text>
								</Press>
							</View>
						);
					})}
			</View>

			{/* Active spot note */}
			{active != null && spots[active] ? (
				<View style={{ backgroundColor: hue.wash, borderRadius: 14, padding: 12, gap: 4, borderLeftWidth: 3, borderLeftColor: hue.base }}>
					<Text style={{ fontFamily: fonts.readHeavy, fontSize: 15, color: hue.ink }}>
						{active + 1}. {spots[active].title}
					</Text>
					{spots[active].html ? <Html html={spots[active].html} hue={hue} style={{ fontSize: 15, lineHeight: 23 }} /> : null}
				</View>
			) : null}

			{/* Tappable numbered part chips (matching web Figure.svelte .parts) */}
			{spots.length ? (
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
					<Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.muted, marginRight: 2 }}>Tap a point:</Text>
					{spots.map((s, i) => {
						const isOn = active === i;
						return (
							<Press
								key={i}
								onPress={() => toggleSpot(i)}
								accessibilityRole="button"
								accessibilityState={{ selected: isOn }}
								style={{
									flexDirection: 'row',
									alignItems: 'center',
									gap: 5,
									paddingHorizontal: 10,
									paddingVertical: 5,
									borderRadius: radius.pill,
									backgroundColor: isOn ? alpha(hue.base, 0.16) : t.surface2,
									borderWidth: hair,
									borderColor: isOn ? hue.base : t.line2
								}}
							>
								<Text style={{ fontFamily: fonts.mono, fontSize: 11, color: hue.ink }}>{i + 1}</Text>
								<Text style={{ fontFamily: isOn ? fonts.bodyBold : fonts.bodyMedium, fontSize: 12.5, color: isOn ? t.fg : t.fg2 }}>
									{s.title.replace(/<[^>]+>/g, '')}
								</Text>
							</Press>
						);
					})}
				</View>
			) : null}

			{caption ? (
				<View style={{ borderTopWidth: hair, borderStyle: 'dashed', borderColor: t.line2, paddingTop: 10 }}>
					<Html html={caption} hue={hue} style={{ fontSize: 14, lineHeight: 21, color: t.muted, textAlign: 'center' }} />
				</View>
			) : null}
		</View>
	);
}
