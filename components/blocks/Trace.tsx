// A data-structure / algorithm walk-through (matches study_web_app Trace.svelte), drawn natively.
// Per-value identity colors (sky/peach/lilac/rose), dual array+tree heap view, directional linked-list
// arrows, stack well + top pointer, queue front/rear pointers, input & frontier strips, live running
// code highlight, tappable step scrubber track, and inline speed cycle pill. Zero Android layout crash risk.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, G, Line, Marker, Path, Rect, Text as SText } from 'react-native-svg';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react-native';
import type { TraceBlock, TraceState } from '../../lib/api/types';
import { alpha, fonts, mix, radius, useTheme, type Hue, type HueSet, type Palette } from '../../lib/theme';
import { useStudyPrefs, type AnimSpeed } from '../../lib/prefs';
import { parse, textOf } from '../../lib/html';
import { codeLines, highlightCode } from '../../lib/highlight';
import { CodeRuns } from '../CodeRuns';
import { Html } from '../Html';
import { LuminousBg, Press, T, hair } from '../ui';
import { Eye } from './Blocks';

const SPEEDS: AnimSpeed[] = [1, 1.5, 0.75];
const ID_HUES: Hue[] = ['sky', 'peach', 'lilac', 'rose'];

const words = (st: TraceState) => (st.title + ' ' + st.html.replace(/<[^>]+>/g, ' ')).trim().split(/\s+/).filter(Boolean).length;
const dur = (st: TraceState) => Math.max(1800, Math.min(11000, 900 + 235 * words(st)));

/** "a,b,a" → ["a#0","b#0","a#1"]: stable keys by occurrence. */
function keyed(v: string[]) {
	const seen: Record<string, number> = {};
	return v.map((x) => {
		const n = seen[x] ?? 0;
		seen[x] = n + 1;
		return `${x}#${n}`;
	});
}

function edgeEnds(a: { x: number; y: number }, b: { x: number; y: number }, r: number) {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const d = Math.hypot(dx, dy) || 1;
	return { x1: a.x + (dx / d) * r, y1: a.y + (dy / d) * r, x2: b.x - (dx / d) * (r + 3), y2: b.y - (dy / d) * (r + 3) };
}

export function Trace({ block, hue, width, autoplay }: { block: TraceBlock; hue: HueSet; width: number; autoplay?: boolean }) {
	const t = useTheme();
	const animSpeed = useStudyPrefs((s) => s.animSpeed);
	const setAnimSpeed = useStudyPrefs((s) => s.setAnimSpeed);
	const states = block.states ?? [];
	const [cur, setCur] = useState(0);
	const [playing, setPlaying] = useState(false);
	const interacted = useRef(false);
	const s = states[Math.min(cur, Math.max(0, states.length - 1))];

	// Consistent identity hue per value across all states (matching web Trace.svelte)
	const idHueMap = useMemo(() => {
		const map = new Map<string, Hue>();
		if (block.kind === 'graph' || block.kind === 'code') return map;
		for (const st of states) {
			for (const id of keyed(st.v)) {
				const val = id.slice(0, id.lastIndexOf('#'));
				if (val === '_' || val === 'null' || map.has(id)) continue;
				map.set(id, ID_HUES[map.size % ID_HUES.length]);
			}
		}
		return map;
	}, [states, block.kind]);

	useEffect(() => {
		if (!autoplay || interacted.current || !states.length) return;
		interacted.current = true;
		setPlaying(true);
	}, [autoplay, states.length]);

	useEffect(() => {
		if (!playing || !s) return;
		if (cur >= states.length - 1) return setPlaying(false);
		const id = setTimeout(() => setCur((c) => c + 1), Math.round(dur(s) / animSpeed));
		return () => clearTimeout(id);
	}, [playing, cur, s, states.length, animSpeed]);

	if (!s) return null;

	const go = (n: number) => {
		interacted.current = true;
		setPlaying(false);
		setCur(Math.max(0, Math.min(states.length - 1, n)));
		Haptics.selectionAsync().catch(() => {});
	};

	const cycleSpeed = () => {
		Haptics.selectionAsync().catch(() => {});
		setAnimSpeed(SPEEDS[(SPEEDS.indexOf(animSpeed) + 1) % SPEEDS.length]);
	};

	const kind = block.kind;
	const graphWidth = Math.max(1, width - 28 - 2 * hair);
	const hasSideCode = kind !== 'code' && Boolean(block.code || block.html);
	const outLabel = block.outLabel ?? (kind === 'graph' || kind === 'tree' ? 'Visited' : kind === 'queue' ? 'Served' : 'Output');

	return (
		<View
			style={{
				backgroundColor: t.surface,
				borderRadius: radius.md,
				borderWidth: hair,
				borderColor: alpha(hue.base, 0.24),
				padding: 14,
				gap: 12,
				overflow: 'hidden'
			}}
		>
			<LuminousBg from={mix(hue.base, t.name === 'night' ? 8 : 5, t.surface)} to={t.surface} borderRadius={radius.md} />

			{/* Header matching web Trace.svelte */}
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
				<View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: alpha(hue.base, 0.14), alignItems: 'center', justifyContent: 'center' }}>
					<Play size={15} color={hue.base} />
				</View>
				<View style={{ flex: 1 }}>
					<Eye hue={hue}>Step by step</Eye>
					<Html html={block.title} hue={hue} style={{ fontFamily: fonts.serif, fontSize: 17, lineHeight: 22 }} />
				</View>
			</View>

			{/* Input token strip (when present) */}
			{s.input?.length ? (
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, padding: 8, borderRadius: 10, backgroundColor: t.surface2 }}>
					<Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: t.muted, marginRight: 4 }}>Input</Text>
					{s.input.map((tok, i) => {
						const isNow = i === s.at;
						const isRead = s.at != null && i < s.at;
						return (
							<View
								key={i}
								style={{
									paddingHorizontal: 7,
									paddingVertical: 3,
									borderRadius: 6,
									backgroundColor: isNow ? hue.base : t.surface,
									borderWidth: hair,
									borderColor: isNow ? hue.base : t.line2,
									opacity: isRead ? 0.45 : 1
								}}
							>
								<Text style={{ fontFamily: fonts.mono, fontSize: 12, color: isNow ? t.onHue : t.fg }}>{tok}</Text>
							</View>
						);
					})}
				</View>
			) : null}

			{/* Main Data-Structure Stage */}
			{kind === 'heap' ? (
				<View style={{ gap: 10 }}>
					<Text style={{ fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 0.6, color: t.muted }}>Stored as an array</Text>
					<Cells s={s} kind="array" hue={hue} t={t} idHueMap={idHueMap} compact />
					<TreeView s={s} hue={hue} t={t} width={graphWidth} idHueMap={idHueMap} />
				</View>
			) : null}
			{kind === 'tree' ? <TreeView s={s} hue={hue} t={t} width={graphWidth} idHueMap={idHueMap} /> : null}
			{kind === 'list' ? <ListView s={s} hue={hue} t={t} idHueMap={idHueMap} /> : null}
			{kind === 'stack' ? <StackView s={s} hue={hue} t={t} idHueMap={idHueMap} /> : null}
			{kind === 'graph' && block.graph ? <GraphView g={block.graph} s={s} hue={hue} t={t} width={graphWidth} /> : null}
			{kind === 'code' ? <CodeView block={block} s={s} hue={hue} t={t} /> : null}
			{kind === 'array' || kind === 'queue' ? <Cells s={s} kind={kind} hue={hue} t={t} vLabel={block.vLabel} idHueMap={idHueMap} /> : null}

			{/* Graph Frontier Strip */}
			{kind === 'graph' ? (
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: 9, borderRadius: 10, backgroundColor: t.surface2 }}>
					<Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: t.muted, marginRight: 2 }}>
						{block.vLabel ?? 'Frontier'}
					</Text>
					{s.v.length ? (
						s.v.map((tok, i) => (
							<View key={i} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2 }}>
								<Text style={{ fontFamily: fonts.mono, fontSize: 12, color: t.fg }}>{tok}</Text>
							</View>
						))
					) : (
						<Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.muted }}>empty</Text>
					)}
				</View>
			) : null}

			{/* Output / Visited / Served Strip */}
			{states.some((st) => st.out !== undefined) ? (
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: 9, borderRadius: 10, backgroundColor: t.surface2 }}>
					<Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: t.muted, marginRight: 2 }}>
						{outLabel}
					</Text>
					{s.out ? (
						s.out
							.split(/\s+/)
							.filter(Boolean)
							.map((tok, i) => (
								<View key={i} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: t.successSoft, borderWidth: hair, borderColor: alpha(t.success, 0.36) }}>
									<Text style={{ fontFamily: fonts.mono, fontSize: 12, color: t.success }}>{tok}</Text>
								</View>
							))
					) : (
						<Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.muted }}>nothing yet</Text>
					)}
				</View>
			) : null}

			{/* Live running code beside/below non-code traces */}
			{hasSideCode ? (
				<View style={{ gap: 6 }}>
					<Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.9, textTransform: 'uppercase', color: t.muted }}>The code running</Text>
					<CodeView block={block} s={s} hue={hue} t={t} compact />
				</View>
			) : null}

			{/* Narration Bubble Card */}
			<View style={{ backgroundColor: hue.wash, borderRadius: 14, padding: 12, gap: 3, borderLeftWidth: 3, borderLeftColor: hue.base }}>
				<Html html={s.title} hue={hue} style={{ fontFamily: fonts.readHeavy, fontSize: 15 }} />
				{s.html ? <Html html={s.html} hue={hue} style={{ fontSize: 14.5, lineHeight: 22 }} /> : null}
			</View>

			{/* Web-parity Player Controls: Play/Pause, Back, tappable scrubber, Next, count, speed */}
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
				<Round
					onPress={() => {
						interacted.current = true;
						if (playing) return setPlaying(false);
						if (cur >= states.length - 1) setCur(0);
						setPlaying(true);
					}}
					label={playing ? 'Pause' : 'Play'}
					t={t}
					fill={hue.base}
				>
					{playing ? <Pause size={15} color={t.onHue} /> : <Play size={15} color={t.onHue} />}
				</Round>
				<Round onPress={() => go(cur - 1)} disabled={cur === 0} label="Back" t={t}>
					<ChevronLeft size={16} color={t.fg2} />
				</Round>

				<View style={{ flex: 1, flexDirection: 'row', gap: 3, alignItems: 'center' }}>
					{states.map((st, i) => (
						<Press
							key={i}
							onPress={() => go(i)}
							hitSlop={{ top: 12, bottom: 12, left: 1, right: 1 }}
							accessibilityRole="button"
							accessibilityLabel={`Step ${i + 1}: ${st.title}`}
							style={{
								flex: 1,
								height: 8,
								borderRadius: 4,
								backgroundColor: i === cur ? hue.base : i < cur ? alpha(hue.base, 0.5) : t.line2
							}}
						/>
					))}
				</View>

				<Round onPress={() => go(cur + 1)} disabled={cur >= states.length - 1} label="Next" t={t}>
					<ChevronRight size={16} color={t.fg2} />
				</Round>

				<Text style={{ fontFamily: fonts.mono, fontSize: 11, color: t.muted, minWidth: 28, textAlign: 'right' }}>
					{cur + 1}/{states.length}
				</Text>

				<Press
					onPress={cycleSpeed}
					accessibilityRole="button"
					accessibilityLabel={`Playback speed ${animSpeed}x`}
					style={{
						paddingHorizontal: 7,
						height: 28,
						borderRadius: 8,
						backgroundColor: t.surface2,
						borderWidth: hair,
						borderColor: t.line2,
						alignItems: 'center',
						justifyContent: 'center'
					}}
				>
					<Text style={{ fontFamily: fonts.mono, fontSize: 10.5, color: t.fg2 }}>{animSpeed}×</Text>
				</Press>
			</View>

			{block.caption ? (
				<View style={{ borderTopWidth: hair, borderStyle: 'dashed', borderColor: t.line2, paddingTop: 10 }}>
					<Html html={block.caption} hue={hue} style={{ fontSize: 14, lineHeight: 21, color: t.muted, textAlign: 'center' }} />
				</View>
			) : null}
		</View>
	);
}

function Round({ children, onPress, disabled, label, t, fill }: { children: React.ReactNode; onPress: () => void; disabled?: boolean; label: string; t: Palette; fill?: string }) {
	return (
		<Press
			onPress={onPress}
			disabled={disabled}
			accessibilityLabel={label}
			accessibilityRole="button"
			style={{
				width: 34,
				height: 34,
				borderRadius: 17,
				backgroundColor: fill ?? t.surface2,
				borderWidth: fill ? 0 : hair,
				borderColor: t.line2,
				alignItems: 'center',
				justifyContent: 'center',
				opacity: disabled ? 0.35 : 1
			}}
		>
			{children}
		</Press>
	);
}

function cellColors(i: number, s: TraceState, hue: HueSet, t: Palette, idHue?: Hue) {
	if (s.hot?.includes(i)) return { bg: hue.base, fg: t.onHue, border: hue.base, dim: false };
	if (s.done?.includes(i)) return { bg: t.successSoft, fg: t.success, border: t.success, dim: false };
	if (s.dim?.includes(i)) return { bg: t.surface2, fg: t.muted, border: t.line, dim: true };
	if (idHue && t.hues[idHue]) {
		const ih = t.hues[idHue];
		return { bg: mix(ih.base, t.name === 'night' ? 16 : 12, t.surface), fg: ih.ink, border: alpha(ih.base, 0.7), dim: false };
	}
	return { bg: t.surface, fg: t.fg, border: t.line2, dim: false };
}

function Cells({ s, kind, hue, t, vLabel, idHueMap, compact }: { s: TraceState; kind: string; hue: HueSet; t: Palette; vLabel?: string; idHueMap: Map<string, Hue>; compact?: boolean }) {
	const keys = useMemo(() => keyed(s.v), [s.v]);
	const size = compact ? 38 : 46;
	return (
		<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
			<View style={{ flexDirection: 'row', gap: compact ? 5 : 7, alignItems: 'flex-start', minWidth: '100%' }}>
				{s.v.map((v, i) => {
					const empty = v === '_';
					const c = cellColors(i, s, hue, t, empty ? undefined : idHueMap.get(keys[i]));
					const ptrs = (s.ptr ?? []).filter((p) => p.at === i);
					const isFront = kind === 'queue' && i === 0;
					const isRear = kind === 'queue' && i === s.v.length - 1;
					return (
						<View key={`${keys[i]}-${i}`} style={{ alignItems: 'center', gap: 4, opacity: c.dim ? 0.45 : 1 }}>
							<View
								style={{
									minWidth: size,
									height: size,
									paddingHorizontal: 8,
									borderRadius: 10,
									borderWidth: 1.5,
									borderStyle: empty ? 'dashed' : 'solid',
									borderColor: empty ? t.line2 : c.border,
									backgroundColor: empty ? 'transparent' : c.bg,
									alignItems: 'center',
									justifyContent: 'center'
								}}
							>
								<Text style={{ fontFamily: fonts.mono, fontSize: compact ? 13 : 15, color: c.fg }}>{empty ? '' : v}</Text>
							</View>
							<Text style={{ fontFamily: fonts.mono, fontSize: 10, color: t.muted }}>{i}</Text>
							{isFront ? <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: hue.ink }}>front</Text> : null}
							{isRear ? <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: hue.ink }}>rear</Text> : null}
							{ptrs.length ? <Text style={{ fontFamily: fonts.mono, fontSize: 10.5, color: hue.ink }}>↑ {ptrs.map((p) => p.name).join(' ')}</Text> : null}
						</View>
					);
				})}
				{s.v.length === 0 ? <T v="small">(empty)</T> : null}
			</View>
			{vLabel ? <T v="micro">{vLabel}</T> : null}
		</ScrollView>
	);
}

function ListView({ s, hue, t, idHueMap }: { s: TraceState; hue: HueSet; t: Palette; idHueMap: Map<string, Hue> }) {
	const keys = useMemo(() => keyed(s.v), [s.v]);
	const LW = 50;
	const CH = 42;
	const LGAP = 42;
	const PAD = 14;
	const topY = 26;
	const W = Math.max(220, PAD * 2 + s.v.length * (LW + LGAP) - LGAP);
	const H = topY + CH + 16;
	const listX = (i: number) => PAD + i * (LW + LGAP);
	const links = s.links ?? s.v.slice(0, -1).map(() => 'r' as const);

	return (
		<ScrollView horizontal showsHorizontalScrollIndicator={false}>
			<Svg width={W} height={H}>
				<Defs>
					<Marker id="tr-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
						<Path d="M0,0 L10,5 L0,10 z" fill={t.line2} />
					</Marker>
					<Marker id="tr-arr-hot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
						<Path d="M0,0 L10,5 L0,10 z" fill={hue.base} />
					</Marker>
				</Defs>

				{links.map((l, k) => {
					if (!l) return null;
					const hot = Boolean(s.hot?.includes(k) || s.hot?.includes(k + 1));
					const x1 = l === 'l' ? listX(k + 1) : listX(k) + LW;
					const x2 = l === 'l' ? listX(k) + LW + 3 : listX(k + 1) - 3;
					return (
						<Line
							key={`lk${k}`}
							x1={x1}
							y1={topY + CH / 2}
							x2={x2}
							y2={topY + CH / 2}
							stroke={hot ? hue.base : t.line2}
							strokeWidth={hot ? 2.4 : 1.8}
							markerEnd={hot ? 'url(#tr-arr-hot)' : 'url(#tr-arr)'}
							markerStart={l === 'b' ? 'url(#tr-arr)' : undefined}
						/>
					);
				})}

				{s.v.map((v, i) => {
					const isNull = v === 'null';
					const c = cellColors(i, s, hue, t, isNull ? undefined : idHueMap.get(keys[i]));
					const ptrs = (s.ptr ?? []).filter((p) => p.at === i);
					return (
						<G key={`ln${i}`} opacity={c.dim ? 0.45 : 1}>
							{!isNull ? <Rect x={listX(i)} y={topY} width={LW} height={CH} rx={9} fill={c.bg} stroke={c.border} strokeWidth={1.6} /> : null}
							<SText x={listX(i) + LW / 2} y={topY + CH / 2 + 5} textAnchor="middle" fill={isNull ? t.muted : c.fg} fontSize={14} fontFamily={fonts.mono}>
								{isNull ? '∅' : v}
							</SText>
							{ptrs.length ? (
								<SText x={listX(i) + LW / 2} y={topY - 8} textAnchor="middle" fill={hue.ink} fontSize={11} fontFamily={fonts.mono}>
									{ptrs.map((p) => p.name).join(' ')} ↓
								</SText>
							) : null}
						</G>
					);
				})}
			</Svg>
		</ScrollView>
	);
}

function StackView({ s, hue, t, idHueMap }: { s: TraceState; hue: HueSet; t: Palette; idHueMap: Map<string, Hue> }) {
	const keys = useMemo(() => keyed(s.v), [s.v]);
	const items = s.v.map((v, i) => ({ v, i, key: keys[i] })).reverse();
	return (
		<View style={{ alignItems: 'center', paddingVertical: 6 }}>
			<View
				style={{
					width: 170,
					minHeight: 112,
					padding: 10,
					gap: 6,
					borderLeftWidth: 2,
					borderRightWidth: 2,
					borderBottomWidth: 2,
					borderBottomLeftRadius: 12,
					borderBottomRightRadius: 12,
					borderColor: t.line2,
					justifyContent: 'flex-end'
				}}
			>
				{items.length ? (
					items.map(({ v, i, key }, idx) => {
						const c = cellColors(i, s, hue, t, idHueMap.get(key));
						const isTop = idx === 0;
						return (
							<View key={`${key}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
								<View
									style={{
										flex: 1,
										height: 40,
										borderRadius: 9,
										borderWidth: 1.5,
										borderColor: c.border,
										backgroundColor: c.bg,
										alignItems: 'center',
										justifyContent: 'center',
										opacity: c.dim ? 0.45 : 1
									}}
								>
									<Text style={{ fontFamily: fonts.mono, fontSize: 14, color: c.fg }}>{v}</Text>
								</View>
								{isTop ? <Text style={{ fontFamily: fonts.mono, fontSize: 10.5, color: hue.ink }}>← top</Text> : null}
							</View>
						);
					})
				) : (
					<Text style={{ fontFamily: fonts.mono, fontSize: 12, color: t.muted, textAlign: 'center', paddingVertical: 18 }}>empty</Text>
				)}
			</View>
		</View>
	);
}

function TreeView({ s, hue, t, width: W, idHueMap }: { s: TraceState; hue: HueSet; t: Palette; width: number; idHueMap: Map<string, Hue> }) {
	const keys = useMemo(() => keyed(s.v), [s.v]);
	const n = s.v.length;
	const depth = Math.max(1, Math.ceil(Math.log2(n + 1)));
	const H = depth * 64 + 16;
	const R = 19;
	const pos = (i: number) => {
		const d = Math.floor(Math.log2(i + 1));
		const first = 2 ** d - 1;
		const slots = 2 ** d;
		return { x: ((i - first + 0.5) / slots) * W, y: 26 + d * 64 };
	};
	return (
		<Svg width={W} height={H}>
			{s.v.map((v, i) => {
				if (i === 0 || v === '_' || s.v[Math.floor((i - 1) / 2)] === '_') return null;
				const e = edgeEnds(pos(Math.floor((i - 1) / 2)), pos(i), R);
				return <Line key={`l${i}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={t.line2} strokeWidth={2} />;
			})}
			{s.v.map((v, i) => {
				if (v === '_') return null;
				const p = pos(i);
				const c = cellColors(i, s, hue, t, idHueMap.get(keys[i]));
				const ptrs = (s.ptr ?? []).filter((pt) => pt.at === i);
				return (
					<G key={`n${i}`}>
						<Circle cx={p.x} cy={p.y} r={R} fill={c.bg} stroke={c.border} strokeWidth={2} opacity={c.dim ? 0.45 : 1} />
						<SText x={p.x} y={p.y + 5} textAnchor="middle" fill={c.fg} fontSize={13} fontFamily={fonts.mono}>
							{v}
						</SText>
						{ptrs.length ? (
							<SText x={p.x} y={p.y + R + 13} textAnchor="middle" fill={hue.ink} fontSize={10} fontFamily={fonts.mono}>
								↑ {ptrs.map((pt) => pt.name).join(' ')}
							</SText>
						) : null}
					</G>
				);
			})}
		</Svg>
	);
}

function GraphView({ g, s, hue, t, width: W }: { g: NonNullable<TraceBlock['graph']>; s: TraceState; hue: HueSet; t: Palette; width: number }) {
	if (!g.nodes?.length) return null;
	const xs = g.nodes.map((n, i) => n.x ?? (i % 4) * 100);
	const ys = g.nodes.map((n, i) => n.y ?? Math.floor(i / 4) * 100);
	const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
	const sc = Math.min(Math.max(0.1, W - 56) / Math.max(1, maxX - minX), 1.6);
	const H = Math.max(56, (maxY - minY) * sc + 56);
	const P = (i: number) => ({ x: 28 + ((xs[i] ?? minX) - minX) * sc, y: 28 + ((ys[i] ?? minY) - minY) * sc });
	const onPath = (a: number, b: number) => (s.path ?? []).some(([x, y]) => (x === a && y === b) || (x === b && y === a));
	return (
		<Svg width={W} height={H}>
			<Defs>
				<Marker id="gr-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
					<Path d="M0,0 L10,5 L0,10 z" fill={t.line2} />
				</Marker>
				<Marker id="gr-arr-hot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
					<Path d="M0,0 L10,5 L0,10 z" fill={hue.base} />
				</Marker>
			</Defs>
			{g.edges.map((e, i) => {
				const a = P(e.from);
				const b = P(e.to);
				const hot = onPath(e.from, e.to);
				const seg = edgeEnds(a, b, 19);
				return (
					<G key={`e${i}`}>
						<Line
							x1={seg.x1}
							y1={seg.y1}
							x2={seg.x2}
							y2={seg.y2}
							stroke={hot ? hue.base : t.line2}
							strokeWidth={hot ? 3 : 1.8}
							markerEnd={e.directed ? (hot ? 'url(#gr-arr-hot)' : 'url(#gr-arr)') : undefined}
						/>
						{e.w ? (
							<SText x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 5} fill={t.muted} fontSize={11} textAnchor="middle" fontFamily={fonts.mono}>
								{e.w}
							</SText>
						) : null}
					</G>
				);
			})}
			{g.nodes.map((n, i) => {
				const p = P(i);
				const c = cellColors(i, s, hue, t);
				return (
					<G key={`gn${i}`}>
						<Circle cx={p.x} cy={p.y} r={19} fill={c.bg} stroke={c.border} strokeWidth={2} opacity={c.dim ? 0.45 : 1} />
						<SText x={p.x} y={p.y + 5} fill={c.fg} fontSize={13} textAnchor="middle" fontFamily={fonts.mono}>
							{n.id}
						</SText>
					</G>
				);
			})}
		</Svg>
	);
}

function CodeView({ block, s, hue, t, compact }: { block: TraceBlock; s: TraceState; hue: HueSet; t: Palette; compact?: boolean }) {
	const lines = useMemo(() => {
		const markup = block.html ? parse(block.html) : undefined;
		return codeLines(highlightCode(block.code ?? textOf(markup ?? []), block.lang, markup));
	}, [block.html, block.code, block.lang]);
	return (
		<View style={{ gap: 8 }}>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: t.name === 'night' ? '#0b1122' : t.surface2, borderRadius: 12, borderWidth: hair, borderColor: t.line }}>
				<View style={{ paddingVertical: 8 }}>
					{lines.map((l, i) => {
						const active = s.line === i + 1;
						return (
							<View
								key={i}
								style={{
									flexDirection: 'row',
									backgroundColor: active ? alpha(hue.base, 0.2) : 'transparent',
									borderLeftWidth: 3,
									borderLeftColor: active ? hue.base : 'transparent',
									paddingHorizontal: 10
								}}
							>
								<Text style={{ width: 22, fontFamily: fonts.mono, fontSize: 11.5, lineHeight: 20, color: active ? hue.ink : t.muted }}>{i + 1}</Text>
								<Text style={{ fontFamily: fonts.mono, fontSize: 12.5, lineHeight: 20, color: t.fg }}>{l.length ? <CodeRuns runs={l} palette={t} /> : ' '}</Text>
							</View>
						);
					})}
				</View>
			</ScrollView>
			{!compact && s.v.length ? (
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
					{s.v.map((v, i) => (
						<View key={i} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: s.hot?.includes(i) ? hue.soft : t.surface2, borderWidth: hair, borderColor: s.hot?.includes(i) ? alpha(hue.base, 0.45) : t.line }}>
							<Text style={{ fontFamily: fonts.mono, fontSize: 12, color: t.fg }}>{v}</Text>
						</View>
					))}
				</View>
			) : null}
		</View>
	);
}
