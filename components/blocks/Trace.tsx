// A data-structure / algorithm walk-through (web Trace.svelte), drawn natively.
// Values keep their identity between steps (the k-th "95" stays the k-th "95"),
// so Reanimated's layout transitions slide each one to its new place. Hot cells
// glow in the course hue, done ones turn green, dimmed ones fade, and named
// pointers ride under their cells. Trees/heaps are drawn as trees; graphs use
// the pack's node positions; code traces light the running line.
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, LinearTransition, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line, Text as SText } from 'react-native-svg';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react-native';
import type { TraceBlock, TraceState } from '../../lib/api/types';
import { fonts, radius, useTheme, type HueSet, type Palette } from '../../lib/theme';
import { parse, textOf } from '../../lib/html';
import { codeLines, highlightCode } from '../../lib/highlight';
import { CodeRuns } from '../CodeRuns';
import { Html } from '../Html';
import { Press, T, hair } from '../ui';
import { Eye } from './Blocks';

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

export function Trace({ block, hue }: { block: TraceBlock; hue: HueSet }) {
	const t = useTheme();
	const states = block.states;
	const [cur, setCur] = useState(0);
	const [playing, setPlaying] = useState(false);
	const s = states[Math.min(cur, states.length - 1)];

	useEffect(() => {
		if (!playing) return;
		if (cur >= states.length - 1) return setPlaying(false);
		const id = setTimeout(() => setCur((c) => c + 1), dur(s));
		return () => clearTimeout(id);
	}, [playing, cur]);

	const go = (n: number) => {
		setPlaying(false);
		setCur(Math.max(0, Math.min(states.length - 1, n)));
		Haptics.selectionAsync().catch(() => {});
	};

	const kind = block.kind;
	return (
		<View style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: hair, borderColor: t.line, padding: 14, gap: 12 }}>
			<View>
				<Eye hue={hue}>Watch it run</Eye>
				<Html html={block.title} hue={hue} style={{ fontFamily: fonts.serif, fontSize: 18, lineHeight: 24 }} />
			</View>
			{kind === 'tree' || kind === 'heap' ? <TreeView s={s} hue={hue} t={t} heap={kind === 'heap'} /> : null}
			{kind === 'graph' && block.graph ? <GraphView g={block.graph} s={s} hue={hue} t={t} /> : null}
			{kind === 'code' ? <CodeView block={block} s={s} hue={hue} t={t} /> : null}
			{kind !== 'tree' && kind !== 'graph' && kind !== 'code' ? <Cells s={s} kind={kind} hue={hue} t={t} vLabel={block.vLabel} /> : null}
			{s.out != null && s.out !== '' ? (
				<View style={{ backgroundColor: t.surface2, borderRadius: 10, padding: 10 }}>
					<T v="micro">{block.outLabel ?? 'Output'}</T>
					<Text style={{ fontFamily: fonts.mono, color: t.fg, fontSize: 13 }}>{s.out}</Text>
				</View>
			) : null}
			<Animated.View key={cur} entering={FadeIn.duration(250)} style={{ backgroundColor: hue.wash, borderRadius: 14, padding: 12, gap: 3 }}>
				<Html html={s.title} hue={hue} style={{ fontFamily: fonts.readHeavy, fontSize: 15 }} />
				{s.html ? <Html html={s.html} hue={hue} style={{ fontSize: 15, lineHeight: 23 }} /> : null}
			</Animated.View>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
				<Round onPress={() => go(cur - 1)} disabled={cur === 0} label="Back" t={t}>
					<ChevronLeft size={18} color={t.fg2} />
				</Round>
				<Round
					onPress={() => {
						if (playing) return setPlaying(false);
						if (cur >= states.length - 1) setCur(0);
						setPlaying(true);
					}}
					label={playing ? 'Pause' : 'Play'}
					t={t}
					fill={hue.base}
				>
					{playing ? <Pause size={18} color={t.onHue} /> : <Play size={18} color={t.onHue} />}
				</Round>
				<Round onPress={() => go(cur + 1)} disabled={cur >= states.length - 1} label="Next" t={t}>
					<ChevronRight size={18} color={t.fg2} />
				</Round>
				<View style={{ flex: 1, flexDirection: 'row', gap: 3, marginLeft: 6 }}>
					{states.map((_, i) => (
						<View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= cur ? hue.base : t.line2 }} />
					))}
				</View>
			</View>
			{block.caption ? <Html html={block.caption} hue={hue} style={{ fontSize: 14, lineHeight: 21, color: t.muted }} /> : null}
		</View>
	);
}

function Round({ children, onPress, disabled, label, t, fill }: { children: React.ReactNode; onPress: () => void; disabled?: boolean; label: string; t: Palette; fill?: string }) {
	return (
		<Press onPress={onPress} disabled={disabled} accessibilityLabel={label} accessibilityRole="button" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: fill ?? t.surface2, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
			{children}
		</Press>
	);
}

function cellColors(i: number, s: TraceState, hue: HueSet, t: Palette) {
	if (s.hot?.includes(i)) return { bg: hue.base, fg: t.onHue, border: hue.base };
	if (s.done?.includes(i)) return { bg: t.successSoft, fg: t.success, border: t.success };
	if (s.dim?.includes(i)) return { bg: t.surface2, fg: t.muted, border: t.line, dim: true };
	return { bg: t.surface, fg: t.fg, border: t.line2 };
}

function Cells({ s, kind, hue, t, vLabel }: { s: TraceState; kind: string; hue: HueSet; t: Palette; vLabel?: string }) {
	const keys = useMemo(() => keyed(s.v), [s.v]);
	const vertical = kind === 'stack';
	const items = s.v.map((v, i) => ({ v, i, key: keys[i] }));
	if (vertical) items.reverse();
	return (
		<ScrollView horizontal={!vertical} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
			<View style={{ flexDirection: vertical ? 'column' : 'row', gap: 6, alignItems: vertical ? 'center' : 'flex-start', minWidth: '100%' }}>
				{items.map(({ v, i, key }) => {
					const c = cellColors(i, s, hue, t);
					const ptrs = (s.ptr ?? []).filter((p) => p.at === i);
					return (
						<Animated.View key={key} layout={LinearTransition.duration(180)} entering={ZoomIn.duration(250)} style={{ alignItems: 'center', gap: 4, opacity: c.dim ? 0.5 : 1 }}>
							<View style={{ minWidth: vertical ? 120 : 44, height: 44, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
								<Text style={{ fontFamily: fonts.mono, fontSize: 15, color: c.fg }}>{v === '_' ? '' : v}</Text>
							</View>
							{!vertical ? (
								<Text style={{ fontFamily: fonts.mono, fontSize: 10, color: t.muted }}>{i}</Text>
							) : null}
							{ptrs.length ? <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: hue.ink }}>▲ {ptrs.map((p) => p.name).join(' ')}</Text> : null}
							{kind === 'list' && i < s.v.length - 1 ? null : null}
						</Animated.View>
					);
				})}
				{s.v.length === 0 ? <T v="small">(empty)</T> : null}
			</View>
			{vLabel ? <T v="micro">{vLabel}</T> : null}
		</ScrollView>
	);
}

function TreeView({ s, hue, t, heap }: { s: TraceState; hue: HueSet; t: Palette; heap: boolean }) {
	const win = useWindowDimensions();
	const n = s.v.length;
	const depth = Math.max(1, Math.ceil(Math.log2(n + 1)));
	const W = win.width - 36 - 30;
	const H = depth * 64 + 10;
	const pos = (i: number) => {
		const d = Math.floor(Math.log2(i + 1));
		const first = 2 ** d - 1;
		const slots = 2 ** d;
		return { x: ((i - first + 0.5) / slots) * W, y: 28 + d * 64 };
	};
	return (
		<Svg width={W} height={H}>
			{s.v.map((v, i) => {
				if (i === 0 || v === '_') return null;
				const p = pos(i);
				const q = pos(Math.floor((i - 1) / 2));
				return <Line key={`l${i}`} x1={q.x} y1={q.y} x2={p.x} y2={p.y} stroke={t.line2} strokeWidth={2} />;
			})}
			{s.v.map((v, i) => {
				if (v === '_') return null;
				const p = pos(i);
				const c = cellColors(i, s, hue, t);
				return [
					<Circle key={`c${i}`} cx={p.x} cy={p.y} r={19} fill={c.bg} stroke={c.border} strokeWidth={2} opacity={c.dim ? 0.5 : 1} />,
					<SText key={`t${i}`} x={p.x} y={p.y + 5} textAnchor="middle" fill={c.fg} fontSize={13} fontFamily={fonts.mono}>
						{v}
					</SText>
				];
			})}
		</Svg>
	);
}

function GraphView({ g, s, hue, t }: { g: NonNullable<TraceBlock['graph']>; s: TraceState; hue: HueSet; t: Palette }) {
	const win = useWindowDimensions();
	const W = win.width - 36 - 30;
	const xs = g.nodes.map((n, i) => n.x ?? (i % 4) * 100);
	const ys = g.nodes.map((n, i) => n.y ?? Math.floor(i / 4) * 100);
	const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
	const sc = Math.min((W - 50) / Math.max(1, maxX - minX), 1.6);
	const H = (maxY - minY) * sc + 50;
	const P = (i: number) => ({ x: 25 + (xs[i] - minX) * sc, y: 25 + (ys[i] - minY) * sc });
	const onPath = (a: number, b: number) => (s.path ?? []).some(([x, y]) => (x === a && y === b) || (x === b && y === a));
	return (
		<Svg width={W} height={H}>
			{g.edges.map((e, i) => {
				const a = P(e.from);
				const b = P(e.to);
				const hot = onPath(e.from, e.to);
				return [
					<Line key={`e${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hot ? hue.base : t.line2} strokeWidth={hot ? 3.5 : 2} />,
					e.w ? (
						<SText key={`w${i}`} x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} fill={t.muted} fontSize={11} textAnchor="middle" fontFamily={fonts.mono}>
							{e.w}
						</SText>
					) : null
				];
			})}
			{g.nodes.map((n, i) => {
				const p = P(i);
				const c = cellColors(i, s, hue, t);
				return [
					<Circle key={`n${i}`} cx={p.x} cy={p.y} r={17} fill={c.bg} stroke={c.border} strokeWidth={2} opacity={c.dim ? 0.5 : 1} />,
					<SText key={`l${i}`} x={p.x} y={p.y + 5} fill={c.fg} fontSize={13} textAnchor="middle" fontFamily={fonts.mono}>
						{s.v[i] ?? n.id}
					</SText>
				];
			})}
		</Svg>
	);
}

function CodeView({ block, s, hue, t }: { block: TraceBlock; s: TraceState; hue: HueSet; t: Palette }) {
	const lines = useMemo(() => {
		const markup = block.html ? parse(block.html) : undefined;
		return codeLines(highlightCode(block.code ?? textOf(markup ?? []), block.lang, markup));
	}, [block.html, block.code, block.lang]);
	return (
		<View style={{ gap: 8 }}>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: t.surface2, borderRadius: 12 }}>
				<View style={{ paddingVertical: 8 }}>
					{lines.map((l, i) => (
						<View key={i} style={{ flexDirection: 'row', backgroundColor: s.line === i + 1 ? hue.soft : 'transparent', paddingHorizontal: 10 }}>
							<Text style={{ width: 24, fontFamily: fonts.mono, fontSize: 12, lineHeight: 20, color: t.muted }}>{i + 1}</Text>
							<Text style={{ fontFamily: fonts.mono, fontSize: 13, lineHeight: 20, color: t.fg }}>{l.length ? <CodeRuns runs={l} palette={t} /> : ' '}</Text>
						</View>
					))}
				</View>
			</ScrollView>
			{s.v.length ? (
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
					{s.v.map((v, i) => (
						<View key={i} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: s.hot?.includes(i) ? hue.soft : t.surface2 }}>
							<Text style={{ fontFamily: fonts.mono, fontSize: 12, color: t.fg }}>{v}</Text>
						</View>
					))}
				</View>
			) : null}
		</View>
	);
}
