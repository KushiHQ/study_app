// A graph of functions or data (web Plot.svelte), drawn with react-native-svg.
// Formulas arrive already sampled as points. Drag a finger across the graph to
// read values off each series at that x.
import { useMemo, useState } from 'react';
import { View, Text, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SText } from 'react-native-svg';
import type { PlotBlock } from '../../lib/api/types';
import { fonts, radius, useTheme, type Hue, type HueSet } from '../../lib/theme';
import { Html } from '../Html';
import { hair } from '../ui';
import { Eye } from './Blocks';

const PAD = { l: 40, r: 12, t: 12, b: 34 };

export function Plot({ block, hue }: { block: PlotBlock; hue: HueSet }) {
	const t = useTheme();
	const win = useWindowDimensions();
	const W = win.width - 36 - 24;
	const H = Math.round(W * 0.68);
	const { x, y, series, marks = [], categories } = block;
	const [probe, setProbe] = useState<number | null>(null);
	const lg = (a: { log?: true }, v: number) => (a.log ? Math.log10(Math.max(v, 1e-12)) : v);
	const sx = (v: number) => PAD.l + ((lg(x, v) - lg(x, x.min)) / (lg(x, x.max) - lg(x, x.min) || 1)) * (W - PAD.l - PAD.r);
	const sy = (v: number) => H - PAD.b - ((lg(y, v) - lg(y, y.min)) / (lg(y, y.max) - lg(y, y.min) || 1)) * (H - PAD.t - PAD.b);
	const invX = (px: number) => x.min + ((px - PAD.l) / (W - PAD.l - PAD.r)) * (x.max - x.min);
	const colorOf = (h: string | undefined, i: number) => (h ? t.hues[h as Hue].base : i === 0 ? hue.base : Object.values(t.hues)[i % 6].base);

	const ticks = (a: PlotBlock['x']) => a.ticks ?? Array.from({ length: 5 }, (_, i) => ({ v: a.min + ((a.max - a.min) * i) / 4, label: undefined as string | undefined }));
	const fmt = (v: number) => (Math.abs(v) >= 1000 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(Math.abs(v) < 1 ? 2 : 1));

	const paths = useMemo(
		() =>
			series.map((s) => {
				if (!s.pts) return '';
				let d = '';
				let pen = false;
				for (const [px, py] of s.pts) {
					if (py == null || !Number.isFinite(py)) {
						pen = false;
						continue;
					}
					d += `${pen ? 'L' : 'M'}${sx(px).toFixed(1)} ${sy(Math.max(y.min - (y.max - y.min), Math.min(y.max + (y.max - y.min), py))).toFixed(1)} `;
					pen = true;
				}
				return d;
			}),
		[series, W]
	);

	const onTouch = (e: GestureResponderEvent) => setProbe(Math.max(x.min, Math.min(x.max, invX(e.nativeEvent.locationX))));
	const valueAt = (s: PlotBlock['series'][number], at: number) => {
		if (!s.pts?.length) return null;
		let best = s.pts[0];
		for (const p of s.pts) if (Math.abs(p[0] - at) < Math.abs(best[0] - at)) best = p;
		return best[1];
	};

	return (
		<View style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: hair, borderColor: t.line, padding: 12, gap: 8 }}>
			<Eye hue={hue}>{block.title}</Eye>
			<View onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={onTouch} onResponderMove={onTouch} onResponderRelease={() => {}}>
				<Svg width={W} height={H}>
					{ticks(y).map((tk, i) => (
						<G key={`y${i}`}>
							<Line x1={PAD.l} x2={W - PAD.r} y1={sy(tk.v)} y2={sy(tk.v)} stroke={t.line} />
							<SText x={PAD.l - 6} y={sy(tk.v) + 4} fill={t.muted} fontSize={10} textAnchor="end" fontFamily={fonts.mono}>
								{tk.label ?? fmt(tk.v)}
							</SText>
						</G>
					))}
					{(categories ? categories.map((c, i) => ({ v: i, label: c })) : ticks(x)).map((tk, i) => (
						<SText key={`x${i}`} x={sx(tk.v)} y={H - PAD.b + 16} fill={t.muted} fontSize={10} textAnchor="middle" fontFamily={fonts.mono}>
							{tk.label ?? fmt(tk.v)}
						</SText>
					))}
					<Line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke={t.line2} />
					<Line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke={t.line2} />
					{marks.map((m, i) => {
						const c = t.amber;
						if (m.kind === 'area' && m.from != null && m.to != null) return <Rect key={i} x={sx(m.from)} y={PAD.t} width={sx(m.to) - sx(m.from)} height={H - PAD.t - PAD.b} fill={hue.wash} />;
						if (m.kind === 'vline' && m.x != null) return <Line key={i} x1={sx(m.x)} x2={sx(m.x)} y1={PAD.t} y2={H - PAD.b} stroke={c} strokeDasharray="4 4" />;
						if (m.kind === 'hline' && m.y != null) return <Line key={i} x1={PAD.l} x2={W - PAD.r} y1={sy(m.y)} y2={sy(m.y)} stroke={c} strokeDasharray="4 4" />;
						if (m.kind === 'point' && m.x != null && m.y != null)
							return (
								<G key={i}>
									<Circle cx={sx(m.x)} cy={sy(m.y)} r={5} fill={c} />
									{m.label ? (
										<SText x={sx(m.x) + 8} y={sy(m.y) - 8} fill={t.fg} fontSize={11} fontFamily={fonts.readBold}>
											{m.label}
										</SText>
									) : null}
								</G>
							);
						return null;
					})}
					{series.map((s, i) => {
						const col = colorOf(s.hue, i);
						if (s.kind === 'bars' && s.values) {
							const bw = ((W - PAD.l - PAD.r) / Math.max(1, s.values.length)) * 0.6;
							return (
								<G key={i}>
									{s.values.map((v, j) => (
										<Rect key={j} x={sx(j) - bw / 2} y={sy(v)} width={bw} height={Math.max(0, sy(y.min) - sy(v))} rx={4} fill={col} />
									))}
								</G>
							);
						}
						if (s.kind === 'points' && s.pts)
							return (
								<G key={i}>
									{s.pts.map(([px, py], j) => (py == null ? null : <Circle key={j} cx={sx(px)} cy={sy(py)} r={4} fill={col} />))}
								</G>
							);
						return <Path key={i} d={paths[i]} stroke={col} strokeWidth={2.5} fill="none" strokeDasharray={s.dash ? '6 5' : undefined} strokeLinejoin="round" strokeLinecap="round" />;
					})}
					{probe != null ? <Line x1={sx(probe)} x2={sx(probe)} y1={PAD.t} y2={H - PAD.b} stroke={t.fg2} strokeWidth={1} /> : null}
				</Svg>
			</View>
			<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
				{series.map((s, i) => {
					const v = probe != null ? valueAt(s, probe) : null;
					return (
						<View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
							<View style={{ width: 12, height: 4, borderRadius: 2, backgroundColor: colorOf(s.hue, i) }} />
							<Text style={{ fontFamily: fonts.readBold, fontSize: 13, color: t.fg2 }}>
								{s.name}
								{v != null ? `  ${fmt(v)}` : ''}
							</Text>
						</View>
					);
				})}
			</View>
			{x.label || y.label ? <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: t.muted }}>{[x.label && `x: ${x.label}`, y.label && `y: ${y.label}`].filter(Boolean).join('   ')}</Text> : null}
			{block.caption ? <Html html={block.caption} hue={hue} style={{ fontSize: 14, lineHeight: 21, color: t.muted }} /> : null}
		</View>
	);
}
