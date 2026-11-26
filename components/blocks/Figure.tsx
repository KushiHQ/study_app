// A lesson figure (matches study_web_app Figure.svelte): a textbook illustration with
// non-obstructing outer numbered callouts connected by crisp elbow leader lines to tiny pinpoint dots.
// Tap any outer number OR a numbered chip below to highlight its leader line and read its note.
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, G, Line, Polyline, Polygon, Text as SText } from 'react-native-svg';
import type { Block, FigureMark } from '../../lib/api/types';
import { alpha, fonts, mix, radius, useTheme, type Hue, type HueSet } from '../../lib/theme';
import { Html } from '../Html';
import { LuminousBg, Press, T, hair } from '../ui';
import { SmallBtn } from './Blocks';

type FigureBlock = Extract<Block, { type: 'figure' }>;

interface CalloutLayout {
	index: number;
	side: 'left' | 'right';
	tx: number;
	ty: number;
	bx: number;
	by: number;
	elbowX: number;
}

/** Spreads badges along a vertical gutter without overlap while staying close to each target Y. */
function spreadY(items: { index: number; ty: number }[], minGap: number, minY: number, maxY: number): Map<number, number> {
	const sorted = [...items].sort((a, b) => a.ty - b.ty);
	const ys = sorted.map((it) => Math.max(minY, Math.min(maxY, it.ty)));
	for (let i = 1; i < ys.length; i++) {
		if (ys[i] < ys[i - 1] + minGap) ys[i] = ys[i - 1] + minGap;
	}
	if (ys.length && ys[ys.length - 1] > maxY) {
		ys[ys.length - 1] = maxY;
		for (let i = ys.length - 2; i >= 0; i--) {
			if (ys[i] > ys[i + 1] - minGap) ys[i] = ys[i + 1] - minGap;
		}
		if (ys[0] < minY) {
			const span = Math.max(1, maxY - minY);
			for (let i = 0; i < ys.length; i++) {
				ys[i] = minY + (ys.length === 1 ? span / 2 : (i / (ys.length - 1)) * span);
			}
		}
	}
	const out = new Map<number, number>();
	sorted.forEach((it, i) => out.set(it.index, ys[i]));
	return out;
}

export function Figure({ block, hue, width }: { block: FigureBlock; hue: HueSet; width: number }) {
	const t = useTheme();
	const { image, spots = [], marks = [], caption } = block;
	const [active, setActive] = useState<number | null>(null);
	const [failed, setFailed] = useState(false);
	const [attempt, setAttempt] = useState(0);

	const stageW = Math.max(1, width - 24 - 2 * hair);
	const hasSpots = spots.length > 0;
	const padX = hasSpots ? 36 : 0;
	const padY = hasSpots ? 12 : 0;
	const dispW = Math.max(80, stageW - padX * 2);
	const imgW = image?.width && Number.isFinite(image.width) && image.width > 0 ? image.width : 1;
	const imgH = image?.height && Number.isFinite(image.height) && image.height > 0 ? image.height : 1;
	const scale = dispW / imgW;
	const dispH = Math.max(1, imgH * scale);
	const minSideH = useMemo(() => {
		if (!hasSpots) return dispH;
		const leftN = spots.filter((s) => s.x < imgW / 2).length;
		const rightN = spots.length - leftN;
		return Math.max(dispH + padY * 2, Math.max(leftN, rightN) * 30 + 16);
	}, [hasSpots, spots, imgW, dispH, padY]);
	const stageH = minSideH;
	const imgTop = (stageH - dispH) / 2;

	/** Picture pixels per screen pixel so marks stay crisp at any image resolution. */
	const k = imgW / Math.max(1, dispW);

	const callouts = useMemo<CalloutLayout[]>(() => {
		if (!hasSpots) return [];
		const leftItems: { index: number; ty: number }[] = [];
		const rightItems: { index: number; ty: number }[] = [];
		const raw = spots.map((s, index) => {
			const side: 'left' | 'right' = s.x < imgW / 2 ? 'left' : 'right';
			const tx = padX + s.x * scale;
			const ty = imgTop + s.y * scale;
			(side === 'left' ? leftItems : rightItems).push({ index, ty });
			return { index, side, tx, ty };
		});
		const leftY = spreadY(leftItems, 28, 15, stageH - 15);
		const rightY = spreadY(rightItems, 28, 15, stageH - 15);
		return raw.map((r) => ({
			...r,
			bx: r.side === 'left' ? padX / 2 : padX + dispW + padX / 2,
			by: (r.side === 'left' ? leftY.get(r.index) : rightY.get(r.index)) ?? r.ty,
			elbowX: r.side === 'left' ? padX - 4 : padX + dispW + 4
		}));
	}, [hasSpots, spots, imgW, padX, scale, imgTop, stageH, dispW]);

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

	const paperBg = t.name === 'night' ? '#eae6de' : '#f8f6f1';

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

			{/* Textbook illustration stage with clean side gutters for non-obstructing leader-line callouts */}
			<View style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: paperBg, width: stageW, height: stageH }}>
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
						style={{ position: 'absolute', left: padX, top: imgTop, width: dispW, height: dispH }}
						contentFit="contain"
						transition={220}
						accessibilityLabel={image.alt}
						onError={() => setFailed(true)}
					/>
				)}

				{marks.length && !failed ? (
					<Svg
						width={dispW}
						height={dispH}
						viewBox={`0 0 ${imgW} ${imgH}`}
						style={{ position: 'absolute', left: padX, top: imgTop }}
						pointerEvents="none"
					>
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

				{/* Crisp elbow leader lines + tiny pinpoint target dots (zero obstruction over the drawing) */}
				{!failed && callouts.length ? (
					<Svg width={stageW} height={stageH} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
						{callouts.map((c) => {
							const isOn = active === c.index;
							const dim = active !== null && !isOn;
							const pts = `${c.bx},${c.by} ${c.elbowX},${c.by} ${c.tx},${c.ty}`;
							return (
								<G key={c.index} opacity={dim ? 0.24 : 1}>
									<Polyline points={pts} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={isOn ? 4.2 : 3.2} strokeLinecap="round" strokeLinejoin="round" />
									<Polyline points={pts} fill="none" stroke={isOn ? hue.base : '#334155'} strokeWidth={isOn ? 2.1 : 1.35} strokeLinecap="round" strokeLinejoin="round" />
									<Circle cx={c.tx} cy={c.ty} r={isOn ? 4.5 : 3.3} fill={isOn ? hue.base : '#1e293b'} stroke="#ffffff" strokeWidth={1.6} />
								</G>
							);
						})}
					</Svg>
				) : null}

				{/* Outer numbered circles placed cleanly in the left/right whitespace gutters */}
				{!failed &&
					callouts.map((c) => {
						const s = spots[c.index];
						const isOn = active === c.index;
						const dim = active !== null && !isOn;
						return (
							<View key={c.index} style={{ position: 'absolute', left: c.bx - 12, top: c.by - 12, opacity: dim ? 0.42 : 1 }}>
								<Press
									onPress={() => toggleSpot(c.index)}
									accessibilityRole="button"
									accessibilityLabel={s.title}
									hitSlop={8}
									style={{
										width: 24,
										height: 24,
										borderRadius: 12,
										backgroundColor: isOn ? hue.base : '#1e293b',
										borderWidth: 2,
										borderColor: '#ffffff',
										alignItems: 'center',
										justifyContent: 'center'
									}}
								>
									<Text style={{ color: isOn ? t.onHue : '#ffffff', fontFamily: fonts.readHeavy, fontSize: 11 }}>{c.index + 1}</Text>
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

			{/* Tappable numbered part chips (clean, no redundant "Tap a point:" prefix) */}
			{spots.length ? (
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
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
