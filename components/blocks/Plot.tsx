// A graph of functions or data (matches study_web_app Plot.svelte), drawn with react-native-svg.
// Clean round ticks, log scales, ClipPath, Catmull-Rom smooth curves, asymptote breaks,
// curve-hugging shaded areas, grouped multi-series bars, cubic Lagrange crosshair readouts,
// glowing crosshair dots + floating x-value pill, and tappable series/mark notes.
import { useId, useMemo, useState } from 'react';
import { Text, View, type GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect, Text as SText, TSpan } from 'react-native-svg';
import { TrendingUp } from 'lucide-react-native';
import type { PlotAxis, PlotBlock, PlotMark, PlotSeries } from '../../lib/api/types';
import { alpha, fonts, mix, radius, useTheme, type Hue, type HueSet } from '../../lib/theme';
import { Html } from '../Html';
import { LuminousBg, Press, hair } from '../ui';
import { Eye } from './Blocks';

const HUES: Hue[] = ['sky', 'peach', 'sage', 'lilac', 'honey', 'rose'];
const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const sup = (n: number) => String(n).replace(/./g, (ch) => SUP[ch] ?? ch);
const neat = (v: number, max = 4) => v.toLocaleString('en', { maximumFractionDigits: max }).replace('-', '−');

function fmt(v: number): string {
	if (!Number.isFinite(v)) return '—';
	const a = Math.abs(v);
	if (a !== 0 && (a >= 1e7 || a < 1e-4)) {
		const e = Math.floor(Math.log10(a));
		const m = Number((v / 10 ** e).toPrecision(3));
		return `${neat(m)} × 10${sup(e)}`;
	}
	return neat(Number(v.toPrecision(4)));
}

function brief(v: number): string {
	if (!Number.isFinite(v)) return '—';
	const a = Math.abs(v);
	if (a !== 0 && (a >= 1e7 || a < 1e-4)) {
		const e = Math.floor(Math.log10(a));
		return `${neat(Number((v / 10 ** e).toPrecision(2)))} × 10${sup(e)}`;
	}
	return fmt(v);
}

function niceStep(raw: number): number {
	if (!Number.isFinite(raw) || raw <= 0) return 1;
	const p = Math.pow(10, Math.floor(Math.log10(raw)));
	const f = raw / p;
	return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

type Tick = { v: number; label: string };
function ticksFor(ax: PlotAxis, px: number, per: number): Tick[] {
	if (ax.ticks) return ax.ticks.filter((tk) => tk.v >= ax.min - 1e-9 && tk.v <= ax.max + 1e-9).map((tk) => ({ v: tk.v, label: tk.label ?? fmt(tk.v) }));
	const room = Math.max(2, Math.floor(px / per));
	if (ax.log) {
		const lo = Math.ceil(Math.log10(Math.max(ax.min, 1e-12)) - 1e-9);
		const hi = Math.floor(Math.log10(Math.max(ax.max, 1e-12)) + 1e-9);
		const every = Math.max(1, Math.ceil((hi - lo + 1) / room));
		const out: Tick[] = [];
		for (let e = lo; e <= hi; e += every) out.push({ v: 10 ** e, label: e >= -3 && e <= 4 ? neat(10 ** e, 3) : `10${sup(e)}` });
		return out;
	}
	const step = niceStep((ax.max - ax.min) / room);
	const dec = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
	const out: Tick[] = [];
	for (let k = Math.ceil(ax.min / step - 1e-9); k * step <= ax.max + step * 1e-9; k++) {
		const v = Number((k * step).toFixed(dec + 2));
		out.push({
			v,
			label:
				Math.abs(v) >= 1e6
					? `${(v / 1e6).toFixed(1)}M`
					: v.toLocaleString('en', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace('-', '−')
		});
	}
	return out;
}

function smoothPath(p: number[][]): string {
	if (p.length < 3) return p.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('');
	let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
	for (let i = 0; i < p.length - 1; i++) {
		const a = p[Math.max(0, i - 1)];
		const b = p[i];
		const c = p[i + 1];
		const e = p[Math.min(p.length - 1, i + 2)];
		d += `C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
	}
	return d;
}

export function Plot({ block, hue, width }: { block: PlotBlock; hue: HueSet; width: number }) {
	const t = useTheme();
	const clipId = `plot-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
	const W = Math.max(1, width - 28 - 2 * hair);
	const H = Math.round(Math.max(210, Math.min(340, W * 0.66)));
	const { x, y, series, marks = [], categories } = block;
	const isBars = !!categories?.length;

	const [hx, setHx] = useState<number | null>(null);
	const [hc, setHc] = useState<number | null>(null);
	const [note, setNote] = useState<{ title: string; sub?: string; html: string; color: string } | null>(null);
	const [focusSeries, setFocusSeries] = useState<number | null>(null);

	const colorOf = (sHue: string | undefined, i: number) =>
		(sHue && t.hues[sHue as Hue]?.base) ?? t.hues[HUES[i % HUES.length]]?.base ?? hue.base;
	const inkOf = (sHue: string | undefined, i: number) =>
		(sHue && t.hues[sHue as Hue]?.ink) ?? t.hues[HUES[i % HUES.length]]?.ink ?? hue.ink;

	const inY = (v: number) => v >= y.min - 1e-9 && v <= y.max + 1e-9;
	const okY = (v: number | null): v is number => v !== null && Number.isFinite(v) && (!y.log || v > 0);

	const yTicks = useMemo(() => ticksFor(y, H - 56, 40), [y, H]);
	const mT = 16;
	const mL = Math.round(Math.min(72, Math.max(34, Math.max(...yTicks.map((tk) => tk.label.length), 1) * 6.8 + 14 + (y.label ? 16 : 0))));
	const mR = 14;
	const pw = Math.max(40, W - mL - mR);
	const band = categories ? pw / Math.max(1, categories.length) : 0;
	const catLines = useMemo(
		() =>
			(categories ?? []).map((c) =>
				c.length * 6.2 > band - 4 && c.includes(' ') ? [c.slice(0, c.lastIndexOf(' ')), c.slice(c.lastIndexOf(' ') + 1)] : [c]
			),
		[categories, band]
	);
	const mB = 28 + (x.label ? 18 : 0) + (catLines.some((l) => l.length > 1) ? 13 : 0);
	const ph = Math.max(40, H - mT - mB);
	const xTicks = useMemo(() => (isBars ? [] : ticksFor(x, pw, 58)), [isBars, x, pw]);

	const fx = (v: number) =>
		x.log ? Math.log(Math.max(v, 1e-12) / Math.max(x.min, 1e-12)) / (Math.log(x.max / Math.max(x.min, 1e-12)) || 1) : (v - x.min) / (x.max - x.min || 1);
	const fy = (v: number) =>
		y.log ? Math.log(Math.max(v, 1e-12) / Math.max(y.min, 1e-12)) / (Math.log(y.max / Math.max(y.min, 1e-12)) || 1) : (v - y.min) / (y.max - y.min || 1);
	const sx = (v: number) => mL + fx(v) * pw;
	const sy = (v: number) => mT + ph - Math.max(-6, Math.min(7, fy(v))) * ph;
	const ix = (px: number) => {
		const ratio = Math.max(0, Math.min(1, (px - mL) / pw));
		return x.log ? x.min * Math.pow(x.max / Math.max(x.min, 1e-12), ratio) : x.min + ratio * (x.max - x.min);
	};

	const valueAt = (s: PlotSeries, at: number): number | null => {
		const pts = s.pts ?? [];
		if (!pts.length) return null;
		if (s.kind === 'points') {
			let best: [number, number | null] | null = null;
			for (const p of pts) if (!best || Math.abs(sx(p[0]) - sx(at)) < Math.abs(sx(best[0]) - sx(at))) best = p;
			return best && Math.abs(sx(best[0]) - sx(at)) <= 12 ? best[1] : null;
		}
		if (at < pts[0][0] - 1e-9 || at > pts[pts.length - 1][0] + 1e-9) return null;
		let lo = 0;
		let hi = pts.length - 1;
		while (hi - lo > 1) {
			const m = (lo + hi) >> 1;
			if (pts[m][0] <= at) lo = m;
			else hi = m;
		}
		const [a, b] = [pts[lo], pts[hi]];
		if (a[1] === null || b[1] === null) return Math.abs(at - a[0]) < 1e-9 ? a[1] : Math.abs(at - b[0]) < 1e-9 ? b[1] : null;
		const frac = b[0] === a[0] ? 0 : (at - a[0]) / (b[0] - a[0]);
		const linear = a[1] + (b[1] - a[1]) * frac;
		if (s.kind !== 'curve') return linear;
		const i0 = Math.max(0, Math.min(pts.length - 4, lo - 1));
		const q = pts.slice(i0, i0 + 4);
		if (q.length < 4 || q.some((p) => p[1] === null)) return linear;
		let cubic = 0;
		for (let i = 0; i < 4; i++) {
			let w = 1;
			for (let j = 0; j < 4; j++) if (j !== i) w *= (at - q[j][0]) / (q[i][0] - q[j][0]);
			cubic += w * (q[i][1] as number);
		}
		return Number.isFinite(cubic) && Math.abs(cubic - linear) <= Math.abs(b[1] - a[1]) + 1e-9 ? cubic : linear;
	};

	const paths = useMemo(
		() =>
			series.map((s) => {
				const pts = (s.pts ?? []).filter((p) => !x.log || p[0] > 0);
				if (s.kind === 'line' && s.smooth) {
					return smoothPath(pts.filter((p) => okY(p[1])).map((p) => [sx(p[0]), sy(p[1] as number)]));
				}
				let d = '';
				let pen = false;
				let prev: number | null = null;
				for (const [px, py] of pts) {
					if (!okY(py)) {
						pen = false;
						prev = null;
						continue;
					}
					if (prev !== null && ((prev > y.max && py < y.min) || (prev < y.min && py > y.max))) pen = false;
					d += `${pen ? 'L' : 'M'}${sx(px).toFixed(1)} ${sy(py).toFixed(1)}`;
					pen = true;
					prev = py;
				}
				return d;
			}),
		[series, W, H, x, y]
	);

	const areaPath = (m: PlotMark): string => {
		if (m.from == null || m.to == null) return '';
		const s = m.series != null ? series[m.series] : undefined;
		const from = Math.max(m.from, x.min);
		const to = Math.min(m.to, x.max);
		if (!s) {
			return `M${sx(from).toFixed(1)} ${mT}H${sx(to).toFixed(1)}V${mT + ph}H${sx(from).toFixed(1)}Z`;
		}
		const pts: [number, number][] = [];
		const add = (xv: number) => {
			const yv = valueAt(s, xv);
			if (yv !== null && okY(yv)) pts.push([xv, yv]);
		};
		add(from);
		for (const p of s.pts ?? []) if (p[0] > from && p[0] < to && okY(p[1])) pts.push([p[0], p[1]]);
		add(to);
		if (pts.length < 2) return '';
		const base = sy(y.log ? y.min : Math.max(y.min, Math.min(y.max, 0)));
		return `M${sx(pts[0][0]).toFixed(1)} ${base.toFixed(1)}` + pts.map((p) => `L${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`).join('') + `L${sx(pts[pts.length - 1][0]).toFixed(1)} ${base.toFixed(1)}Z`;
	};

	const barGeo = useMemo(() => {
		if (!categories) return [];
		const n = Math.max(1, series.length);
		const bw = Math.min(48, (band * 0.68) / n);
		const zero = sy(y.log ? y.min : Math.max(y.min, Math.min(y.max, 0)));
		return series.flatMap((s, si) =>
			(s.values ?? []).map((v, ci) => {
				const bx = mL + ci * band + band / 2 - (n * bw) / 2 + si * bw;
				const by = sy(v);
				return { si, ci, v, x: bx + 1.5, w: Math.max(3, bw - 3), y: Math.min(by, zero), h: Math.max(1, Math.abs(zero - by)), up: by <= zero };
			})
		);
	}, [categories, series, band, mL, y, H]);

	const xName = (x.label ?? 'x').replace(/\s*\([^)]*\)\s*$/, '') || 'x';
	const yName = (y.label ?? 'y').replace(/\s*\([^)]*\)\s*$/, '') || 'y';
	const step = block.snap ?? 0;

	const onTouch = (e: GestureResponderEvent) => {
		const px = e.nativeEvent.locationX;
		if (isBars && categories) {
			const idx = Math.max(0, Math.min(categories.length - 1, Math.floor((px - mL) / band)));
			setHc(idx);
			return;
		}
		let xv = ix(px);
		if (step) xv = Math.max(x.min, Math.min(x.max, Math.round(xv / step) * step));
		setHx(xv);
	};

	const readout = useMemo(() => {
		if (hx === null) return new Map<number, number>();
		const m = new Map<number, number>();
		series.forEach((s, i) => {
			const v = valueAt(s, hx);
			if (v !== null && Number.isFinite(v)) m.set(i, v);
		});
		return m;
	}, [hx, series]);

	const tapSeries = (i: number) => {
		const s = series[i];
		Haptics.selectionAsync().catch(() => {});
		if (focusSeries === i) {
			setFocusSeries(null);
			setNote(null);
		} else {
			setFocusSeries(i);
			setNote(s?.html ? { title: s.name, html: s.html, color: colorOf(s.hue, i) } : null);
		}
	};

	const tapMark = (m: PlotMark) => {
		if (!m.html && !m.label) return;
		Haptics.selectionAsync().catch(() => {});
		const col = m.series != null ? colorOf(series[m.series]?.hue, m.series) : t.amber;
		const sub = m.kind === 'point' && m.x != null && m.y != null ? `${xName} = ${fmt(m.x)} · ${yName} = ${fmt(m.y)}` : undefined;
		setNote((cur) => (cur?.title === (m.label ?? 'Note') ? null : { title: m.label ?? 'Note', sub, html: m.html ?? '', color: col }));
	};

	return (
		<View
			style={{
				backgroundColor: t.surface,
				borderRadius: radius.md,
				borderWidth: hair,
				borderColor: alpha(hue.base, 0.24),
				padding: 14,
				gap: 10,
				overflow: 'hidden'
			}}
		>
			<LuminousBg from={mix(hue.base, t.name === 'night' ? 8 : 5, t.surface)} to={t.surface} borderRadius={radius.md} />

			{/* Header matching web Plot.svelte */}
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
				<View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: alpha(hue.base, 0.14), alignItems: 'center', justifyContent: 'center' }}>
					<TrendingUp size={16} color={hue.base} />
				</View>
				<View style={{ flex: 1 }}>
					<Eye hue={hue}>Graph</Eye>
					<Html html={block.title} hue={hue} style={{ fontFamily: fonts.serif, fontSize: 17, lineHeight: 22 }} />
				</View>
			</View>

			{/* 2-Column Legend Key with live crosshair/bar values above the chart (clear of finger) */}
			<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
				{series.map((s, i) => {
					const col = colorOf(s.hue, i);
					const ink = inkOf(s.hue, i);
					const val = isBars && hc !== null ? s.values?.[hc] ?? null : readout.get(i) ?? null;
					const selected = focusSeries === i;
					return (
						<Press
							key={i}
							onPress={() => tapSeries(i)}
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								gap: 6,
								paddingHorizontal: 10,
								paddingVertical: 5,
								borderRadius: 10,
								backgroundColor: selected ? alpha(col, 0.16) : t.surface2,
								borderWidth: hair,
								borderColor: selected ? col : t.line2
							}}
						>
							<View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: col }} />
							<Text numberOfLines={1} style={{ fontFamily: fonts.mono, fontSize: 11.5, color: ink }}>
								{s.name}
							</Text>
							{val !== null ? (
								<Text style={{ fontFamily: fonts.mono, fontSize: 11.5, color: t.fg, marginLeft: 2 }}>
									{brief(val)}
								</Text>
							) : null}
						</Press>
					);
				})}
			</View>

			{/* Floating x-readout pill when dragging */}
			{hx !== null || (isBars && hc !== null && categories) ? (
				<View style={{ alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: t.fg }}>
					<Text style={{ fontFamily: fonts.mono, fontSize: 11, color: t.bg }}>
						{isBars && hc !== null && categories
							? categories[hc]
							: `${xName} = ${step ? fmt(hx!) : fmt(Number(hx!.toPrecision(3)))}`}
					</Text>
				</View>
			) : null}

			{/* SVG Chart Stage */}
			<View
				onStartShouldSetResponder={() => true}
				onMoveShouldSetResponder={() => true}
				onResponderGrant={onTouch}
				onResponderMove={onTouch}
			>
				<Svg width={W} height={H}>
					<Defs>
						<ClipPath id={clipId}>
							<Rect x={mL} y={mT} width={pw} height={ph} />
						</ClipPath>
					</Defs>

					{/* Y grid & ticks */}
					{yTicks.map((tk, i) => {
						const isZero = tk.v === 0 && !y.log;
						return (
							<G key={`y${i}`}>
								<Line x1={mL} x2={mL + pw} y1={sy(tk.v)} y2={sy(tk.v)} stroke={isZero ? t.line2 : t.line} strokeWidth={isZero ? 1.4 : 1} />
								<SText x={mL - 7} y={sy(tk.v) + 4} fill={t.muted} fontSize={10} textAnchor="end" fontFamily={fonts.mono}>
									{tk.label}
								</SText>
							</G>
						);
					})}

					{/* X grid & ticks */}
					{xTicks.map((tk, i) => {
						const isZero = tk.v === 0 && !x.log && x.min < 0;
						return (
							<G key={`x${i}`}>
								<Line x1={sx(tk.v)} x2={sx(tk.v)} y1={mT} y2={mT + ph} stroke={isZero ? t.line2 : t.line} strokeDasharray={isZero ? undefined : '2 5'} />
								<Line x1={sx(tk.v)} x2={sx(tk.v)} y1={mT + ph} y2={mT + ph + 4} stroke={t.line2} strokeWidth={1.2} />
								<SText x={sx(tk.v)} y={mT + ph + 16} fill={t.muted} fontSize={10} textAnchor="middle" fontFamily={fonts.mono}>
									{tk.label}
								</SText>
							</G>
						);
					})}

					{/* Axes */}
					<Path d={`M${mL} ${mT}V${mT + ph}H${mL + pw}`} fill="none" stroke={t.line2} strokeWidth={1.5} />
					{y.label ? (
						<SText x={11} y={mT + ph / 2} transform={`rotate(-90 11 ${mT + ph / 2})`} fill={t.fg2} fontSize={10.5} textAnchor="middle" fontFamily={fonts.bodySemi}>
							{y.label}
						</SText>
					) : null}
					{x.label ? (
						<SText x={mL + pw / 2} y={H - 4} fill={t.fg2} fontSize={10.5} textAnchor="middle" fontFamily={fonts.bodySemi}>
							{x.label}
						</SText>
					) : null}

					{/* Bar categories & bars */}
					{isBars && categories ? (
						<G>
							{categories.map((c, ci) => (
								<G key={ci}>
									{hc === ci ? <Rect x={mL + ci * band + 2} y={mT} width={band - 4} height={ph} rx={6} fill={alpha(t.fg, 0.06)} /> : null}
									<SText x={mL + ci * band + band / 2} y={mT + ph + 15} fill={t.fg2} fontSize={10.5} textAnchor="middle" fontFamily={fonts.bodySemi}>
										{catLines[ci].map((ln, k) => (
											<TSpan key={k} x={mL + ci * band + band / 2} dy={k ? 13 : 0}>
												{ln}
											</TSpan>
										))}
									</SText>
								</G>
							))}
							<G clipPath={`url(#${clipId})`}>
								{barGeo.map((b) => {
									const col = colorOf(series[b.si]?.hue, b.si);
									const dimmed = (focusSeries !== null && focusSeries !== b.si) || (hc !== null && hc !== b.ci);
									return (
										<Rect
											key={`${b.si}-${b.ci}`}
											x={b.x}
											y={b.y}
											width={b.w}
											height={b.h}
											rx={4}
											fill={alpha(col, 0.72)}
											stroke={col}
											strokeWidth={1.3}
											opacity={dimmed ? 0.25 : 1}
										/>
									);
								})}
							</G>
							{barGeo.map((b) =>
								b.w >= 22 ? (
									<SText
										key={`v-${b.si}-${b.ci}`}
										x={b.x + b.w / 2}
										y={b.up ? Math.max(mT + 10, b.y - 4) : Math.min(mT + ph - 2, b.y + b.h + 11)}
										fill={inkOf(series[b.si]?.hue, b.si)}
										fontSize={9.5}
										textAnchor="middle"
										fontFamily={fonts.mono}
									>
										{brief(b.v)}
									</SText>
								) : null
							)}
						</G>
					) : null}

					{/* Clipped areas, reference lines & series */}
					<G clipPath={`url(#${clipId})`}>
						{marks.map((m, i) => {
							const col = m.series != null ? colorOf(series[m.series]?.hue, m.series) : hue.base;
							if (m.kind === 'area') return <Path key={`m${i}`} d={areaPath(m)} fill={alpha(col, 0.22)} />;
							if (m.kind === 'vline' && m.x != null) return <Line key={`m${i}`} x1={sx(m.x)} x2={sx(m.x)} y1={mT} y2={mT + ph} stroke={t.fg2} strokeWidth={1.3} strokeDasharray="5 5" opacity={0.7} />;
							if (m.kind === 'hline' && m.y != null) return <Line key={`m${i}`} x1={mL} x2={mL + pw} y1={sy(m.y)} y2={sy(m.y)} stroke={t.fg2} strokeWidth={1.3} strokeDasharray="5 5" opacity={0.7} />;
							return null;
						})}

						{series.map((s, i) => {
							const col = colorOf(s.hue, i);
							const dimmed = focusSeries !== null && focusSeries !== i;
							const op = dimmed ? 0.22 : 1;
							if (s.kind === 'bars') return null;
							if (s.kind === 'points' && s.pts) {
								return (
									<G key={`s${i}`} opacity={op}>
										{s.pts.map(([px, py], j) =>
											okY(py) ? <Circle key={j} cx={sx(px)} cy={sy(py)} r={4.2} fill={alpha(col, 0.35)} stroke={col} strokeWidth={1.8} /> : null
										)}
									</G>
								);
							}
							return (
								<G key={`s${i}`} opacity={op}>
									<Path
										d={paths[i]}
										stroke={col}
										strokeWidth={focusSeries === i ? 3.4 : 2.5}
										fill="none"
										strokeDasharray={s.dash ? '6 5' : undefined}
										strokeLinejoin="round"
										strokeLinecap="round"
									/>
									{s.kind === 'line' && (s.pts?.length ?? 0) <= 24
										? (s.pts ?? []).map(([px, py], k) =>
												okY(py) ? <Circle key={k} cx={sx(px)} cy={sy(py)} r={3} fill={t.surface} stroke={col} strokeWidth={1.8} /> : null
											)
										: null}
								</G>
							);
						})}
					</G>

					{/* Marked points & labels */}
					{marks.map((m, i) => {
						const col = m.series != null ? colorOf(series[m.series]?.hue, m.series) : t.amber;
						if (m.kind === 'point' && m.x != null && m.y != null && inY(m.y)) {
							const rightSide = sx(m.x) > mL + pw * 0.65;
							return (
								<G key={`mp${i}`} onPress={() => tapMark(m)}>
									<Circle cx={sx(m.x)} cy={sy(m.y)} r={5.5} fill={t.surface} stroke={col} strokeWidth={2.8} />
									{m.label ? (
										<SText x={sx(m.x) + (rightSide ? -9 : 9)} y={sy(m.y) - 9} textAnchor={rightSide ? 'end' : 'start'} fill={t.fg} fontSize={10.5} fontFamily={fonts.bodyBold}>
											{m.label}
										</SText>
									) : null}
								</G>
							);
						}
						if (m.kind === 'vline' && m.x != null && m.label) {
							const rightSide = sx(m.x) > mL + pw * 0.7;
							return (
								<SText key={`ml${i}`} x={sx(m.x) + (rightSide ? -6 : 6)} y={mT + 12} textAnchor={rightSide ? 'end' : 'start'} fill={t.fg2} fontSize={10} fontFamily={fonts.bodySemi} onPress={() => tapMark(m)}>
									{m.label}
								</SText>
							);
						}
						if (m.kind === 'hline' && m.y != null && m.label && inY(m.y)) {
							return (
								<SText key={`ml${i}`} x={mL + pw - 4} y={sy(m.y) - 6} textAnchor="end" fill={t.fg2} fontSize={10} fontFamily={fonts.bodySemi} onPress={() => tapMark(m)}>
									{m.label}
								</SText>
							);
						}
						return null;
					})}

					{/* Interactive Crosshair + Glowing Series Dots */}
					{hx !== null && !isBars ? (
						<G pointerEvents="none">
							<Line x1={sx(hx)} x2={sx(hx)} y1={mT} y2={mT + ph} stroke={t.fg2} strokeWidth={1.2} strokeDasharray="3 3" />
							{series.map((s, i) => {
								const v = readout.get(i);
								if (v == null || !okY(v) || !inY(v)) return null;
								const col = colorOf(s.hue, i);
								return <Circle key={`cr${i}`} cx={sx(hx)} cy={sy(v)} r={4.8} fill={col} stroke={t.surface} strokeWidth={2} />;
							})}
						</G>
					) : null}
				</Svg>
			</View>

			{/* Optional tapped series or mark note */}
			{note ? (
				<View style={{ backgroundColor: alpha(note.color, 0.12), borderRadius: 12, padding: 12, gap: 4, borderLeftWidth: 3, borderLeftColor: note.color }}>
					<Text style={{ fontFamily: fonts.readHeavy, fontSize: 14, color: t.fg }}>{note.title}</Text>
					{note.sub ? <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: t.muted }}>{note.sub}</Text> : null}
					{note.html ? <Html html={note.html} hue={hue} style={{ fontSize: 14.5, lineHeight: 22 }} /> : null}
				</View>
			) : null}

			<Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.muted }}>
				{isBars ? 'Tap a bar group to read its values.' : 'Drag across the graph to read values.'}
				{series.some((s) => s.html) || marks.some((m) => m.html) ? ' Tap a legend chip to learn more.' : ''}
			</Text>

			{block.caption ? (
				<View style={{ borderTopWidth: hair, borderStyle: 'dashed', borderColor: t.line2, paddingTop: 10 }}>
					<Html html={block.caption} hue={hue} style={{ fontSize: 14, lineHeight: 21, color: t.muted, textAlign: 'center' }} />
				</View>
			) : null}
		</View>
	);
}
