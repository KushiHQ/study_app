// A data-structure / algorithm walk-through (matches study_web_app Trace.svelte), drawn natively
// with real 60fps UI-thread animations (stack spring drop-in from top, queue slide-in from right,
// array/heap smooth value sliding on swaps, animated pointer gliding, live scrubber progress fill,
// and narration cross-fade). Uses ONLY safe useSharedValue transform/opacity/width animations
// (zero exiting=, zero layout=LinearTransition, zero zIndex) for 100% Android stability.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
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

const SPEEDS: AnimSpeed[] = [0.75, 1, 1.25, 1.5, 2];
const ID_HUES: Hue[] = ['sky', 'peach', 'lilac', 'rose'];
const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
const springFor = (speed: number) => ({
	damping: 18,
	stiffness: Math.round(240 * Math.max(0.5, Math.min(2, speed))),
	mass: 0.9,
	reduceMotion: ReduceMotion.Never
});
const fadeFor = (speed: number, baseMs = 200) => ({
	duration: Math.round(baseMs / Math.max(0.5, Math.min(2, speed))),
	easing: EASE_OUT,
	reduceMotion: ReduceMotion.Never
});

const words = (st: TraceState) => (st.title + ' ' + st.html.replace(/<[^>]+>/g, ' ')).trim().split(/\s+/).filter(Boolean).length;
const dur = (st: TraceState) => Math.max(1200, Math.min(7500, 650 + 165 * words(st)));

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
	const stepSpeed = useStudyPrefs((s) => s.stepSpeed);
	const setStepSpeed = useStudyPrefs((s) => s.setStepSpeed);
	const states = block.states ?? [];
	const [cur, setCur] = useState(0);
	const [playing, setPlaying] = useState(false);
	const interacted = useRef(false);
	const s = states[Math.min(cur, Math.max(0, states.length - 1))];
	const stepDurationMs = s ? Math.round(dur(s) / stepSpeed) : 1600;

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

	// Narration smooth cross-fade + micro-rise on each step
	const narOp = useSharedValue(1);
	const narY = useSharedValue(0);
	useEffect(() => {
		narOp.value = 0.35;
		narY.value = 5;
		const raf = requestAnimationFrame(() => {
			narOp.value = withTiming(1, fadeFor(animSpeed, 180));
			narY.value = withTiming(0, fadeFor(animSpeed, 180));
		});
		return () => cancelAnimationFrame(raf);
	}, [cur, animSpeed, narOp, narY]);
	const narStyle = useAnimatedStyle(() => ({
		opacity: narOp.value,
		transform: [{ translateY: narY.value }]
	}));

	// Active scrubber segment smooth progress fill while playing
	const segFill = useSharedValue(0);
	useEffect(() => {
		if (!playing) {
			segFill.value = 1;
			return;
		}
		segFill.value = 0;
		const raf = requestAnimationFrame(() => {
			segFill.value = withTiming(1, { duration: stepDurationMs, easing: Easing.linear, reduceMotion: ReduceMotion.Never });
		});
		return () => cancelAnimationFrame(raf);
	}, [playing, cur, stepDurationMs, segFill]);
	const segFillStyle = useAnimatedStyle(() => ({
		width: `${segFill.value * 100}%`
	}));

	const maxStackLen = useMemo(() => Math.max(3, ...states.map((st) => st.v.length)), [states]);

	useEffect(() => {
		if (!autoplay || interacted.current || !states.length) return;
		interacted.current = true;
		setPlaying(true);
	}, [autoplay, states.length]);

	useEffect(() => {
		if (!playing || !s) return;
		if (cur >= states.length - 1) return setPlaying(false);
		const id = setTimeout(() => setCur((c) => c + 1), stepDurationMs);
		return () => clearTimeout(id);
	}, [playing, cur, s, states.length, stepDurationMs]);

	if (!s) return null;

	const go = (n: number) => {
		interacted.current = true;
		setPlaying(false);
		setCur(Math.max(0, Math.min(states.length - 1, n)));
		Haptics.selectionAsync().catch(() => {});
	};

	const cycleSpeed = () => {
		Haptics.selectionAsync().catch(() => {});
		const nextIdx = SPEEDS.findIndex((v) => v > stepSpeed);
		setStepSpeed(SPEEDS[nextIdx >= 0 ? nextIdx : 0]);
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
									paddingHorizontal: 8,
									paddingVertical: 3,
									borderRadius: 6,
									backgroundColor: isNow ? hue.base : t.surface,
									borderWidth: hair,
									borderColor: isNow ? hue.base : t.line2,
									opacity: isRead ? 0.42 : 1
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
					<AnimatedCells s={s} kind="array" hue={hue} t={t} idHueMap={idHueMap} compact />
					<TreeView s={s} hue={hue} t={t} width={graphWidth} idHueMap={idHueMap} />
				</View>
			) : null}
			{kind === 'tree' ? <TreeView s={s} hue={hue} t={t} width={graphWidth} idHueMap={idHueMap} /> : null}
			{kind === 'list' ? <ListView s={s} hue={hue} t={t} idHueMap={idHueMap} /> : null}
			{kind === 'stack' ? <AnimatedStackView s={s} maxRows={maxStackLen} hue={hue} t={t} idHueMap={idHueMap} /> : null}
			{kind === 'graph' && block.graph ? <GraphView g={block.graph} s={s} hue={hue} t={t} width={graphWidth} /> : null}
			{kind === 'code' ? <CodeView block={block} s={s} hue={hue} t={t} /> : null}
			{kind === 'array' || kind === 'queue' ? <AnimatedCells s={s} kind={kind} hue={hue} t={t} vLabel={block.vLabel} idHueMap={idHueMap} /> : null}

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

			{/* Narration Bubble Card (directly under the stage, matching web) */}
			<Animated.View collapsable={false} style={[{ backgroundColor: hue.wash, borderRadius: 14, padding: 12, gap: 3, borderLeftWidth: 3, borderLeftColor: hue.base }, narStyle]}>
				<Html html={s.title} hue={hue} style={{ fontFamily: fonts.readHeavy, fontSize: 15 }} />
				{s.html ? <Html html={s.html} hue={hue} style={{ fontSize: 14.5, lineHeight: 22 }} /> : null}
			</Animated.View>

			{/* Live running code below narration when non-code trace includes a program */}
			{hasSideCode ? (
				<View style={{ gap: 6 }}>
					<Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.9, textTransform: 'uppercase', color: t.muted }}>The code running</Text>
					<CodeView block={block} s={s} hue={hue} t={t} compact />
				</View>
			) : null}

			{/* Web-parity Player Controls: Play/Pause, Back, animated scrubber track, Next, count, speed */}
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
					{states.map((st, i) => {
						const isNow = i === cur;
						const isDone = i < cur;
						return (
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
									overflow: 'hidden',
									backgroundColor: isDone ? alpha(hue.base, 0.5) : t.line2
								}}
							>
								{isNow ? (
									<Animated.View collapsable={false} style={[{ height: 8, borderRadius: 4, backgroundColor: hue.base }, segFillStyle]} />
								) : null}
							</Press>
						);
					})}
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
					accessibilityLabel={`Step speed ${stepSpeed}x`}
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
					<Text style={{ fontFamily: fonts.mono, fontSize: 10.5, color: t.fg2 }}>{stepSpeed}×</Text>
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
	if (s.hot?.includes(i)) return { bg: hue.base, fg: t.onHue, border: hue.base, dim: false, hot: true };
	if (s.done?.includes(i)) return { bg: t.successSoft, fg: t.success, border: t.success, dim: false, hot: false };
	if (s.dim?.includes(i)) return { bg: t.surface2, fg: t.muted, border: t.line, dim: true, hot: false };
	if (idHue && t.hues[idHue]) {
		const ih = t.hues[idHue];
		return { bg: mix(ih.base, t.name === 'night' ? 16 : 12, t.surface), fg: ih.ink, border: alpha(ih.base, 0.7), dim: false, hot: false };
	}
	return { bg: t.surface, fg: t.fg, border: t.line2, dim: false, hot: false };
}

/** Animated array/queue cell: smoothly glides horizontally when its index changes & springs in on mount! */
function SlidingCell({
	val,
	index,
	stepWidth,
	cellSize,
	c,
	isQueue,
	compact
}: {
	val: string;
	index: number;
	stepWidth: number;
	cellSize: number;
	c: ReturnType<typeof cellColors>;
	isQueue: boolean;
	compact?: boolean;
}) {
	const animSpeed = useStudyPrefs((s) => s.animSpeed);
	const x = useSharedValue(isQueue ? index * stepWidth + 48 : index * stepWidth);
	const op = useSharedValue(0);
	const sc = useSharedValue(c.hot ? 1.05 : 1);

	useEffect(() => {
		const raf = requestAnimationFrame(() => {
			op.value = withTiming(c.dim ? 0.45 : 1, fadeFor(animSpeed, 180));
			x.value = withSpring(index * stepWidth, springFor(animSpeed));
			sc.value = withSpring(c.hot ? 1.05 : 1, springFor(animSpeed));
		});
		return () => cancelAnimationFrame(raf);
	}, [index, stepWidth, c.dim, c.hot, animSpeed, x, op, sc]);

	const style = useAnimatedStyle(() => ({
		opacity: op.value,
		transform: [{ translateX: x.value }, { scale: sc.value }]
	}));

	return (
		<Animated.View
			collapsable={false}
			style={[
				{
					position: 'absolute',
					left: 0,
					top: 0,
					width: cellSize,
					height: cellSize,
					borderRadius: 10,
					borderWidth: 1.6,
					borderColor: c.border,
					backgroundColor: c.bg,
					alignItems: 'center',
					justifyContent: 'center'
				},
				style
			]}
		>
			<Text numberOfLines={1} style={{ fontFamily: fonts.mono, fontSize: compact ? 13 : 15, color: c.fg }}>
				{val}
			</Text>
		</Animated.View>
	);
}

function AnimatedCells({ s, kind, hue, t, vLabel, idHueMap, compact }: { s: TraceState; kind: string; hue: HueSet; t: Palette; vLabel?: string; idHueMap: Map<string, Hue>; compact?: boolean }) {
	const keys = useMemo(() => keyed(s.v), [s.v]);
	const cellSize = compact ? 40 : 48;
	const gap = compact ? 6 : 8;
	const stepW = cellSize + gap;
	const totalW = Math.max(120, s.v.length * stepW - gap);
	const hasPtrs = (s.ptr?.length ?? 0) > 0 || kind === 'queue';

	return (
		<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6, paddingHorizontal: 4 }}>
			<View style={{ gap: 6 }}>
				<View style={{ width: totalW, height: cellSize + 18 + (hasPtrs ? 20 : 0), position: 'relative' }}>
					{/* Dashed background slots + indices */}
					{s.v.map((_, i) => (
						<View key={`slot-${i}`} style={{ position: 'absolute', left: i * stepW, top: 0, width: cellSize, alignItems: 'center', gap: 4 }}>
							<View style={{ width: cellSize, height: cellSize, borderRadius: 10, borderWidth: 1.2, borderStyle: 'dashed', borderColor: t.line }} />
							<Text style={{ fontFamily: fonts.mono, fontSize: 10, color: t.muted }}>{i}</Text>
						</View>
					))}

					{/* Animated value cells keyed by stable identity (so swaps literally slide!) */}
					{s.v.map((v, i) => {
						if (v === '_') return null;
						const id = keys[i];
						const c = cellColors(i, s, hue, t, idHueMap.get(id));
						return <SlidingCell key={id} val={v} index={i} stepWidth={stepW} cellSize={cellSize} c={c} isQueue={kind === 'queue'} compact={compact} />;
					})}

					{/* Queue front / rear & named pointers */}
					{kind === 'queue' && s.v.length > 0 ? (
						<>
							<Text style={{ position: 'absolute', left: 0, top: cellSize + 18, width: cellSize, textAlign: 'center', fontFamily: fonts.mono, fontSize: 10, color: hue.ink }}>front</Text>
							<Text style={{ position: 'absolute', left: (s.v.length - 1) * stepW, top: cellSize + 18, width: cellSize, textAlign: 'center', fontFamily: fonts.mono, fontSize: 10, color: hue.ink }}>rear</Text>
						</>
					) : null}
					{(s.ptr ?? []).map((p) => (
						<Text
							key={p.name}
							style={{
								position: 'absolute',
								left: p.at * stepW - 10,
								top: cellSize + 18,
								width: cellSize + 20,
								textAlign: 'center',
								fontFamily: fonts.mono,
								fontSize: 10.5,
								color: hue.ink
							}}
						>
							↑ {p.name}
						</Text>
					))}
				</View>
				{s.v.length === 0 ? <T v="small">(empty)</T> : null}
				{vLabel ? <T v="micro">{vLabel}</T> : null}
			</View>
		</ScrollView>
	);
}

/** Animated stack item: drops cleanly from above the U-well with spring bounce! */
function StackBlock({
	val,
	targetY,
	c
}: {
	val: string;
	targetY: number;
	c: ReturnType<typeof cellColors>;
}) {
	const animSpeed = useStudyPrefs((s) => s.animSpeed);
	const y = useSharedValue(targetY - 46);
	const op = useSharedValue(0);
	const sc = useSharedValue(c.hot ? 1.04 : 1);

	useEffect(() => {
		const raf = requestAnimationFrame(() => {
			op.value = withTiming(c.dim ? 0.45 : 1, fadeFor(animSpeed, 180));
			y.value = withSpring(targetY, springFor(animSpeed));
			sc.value = withSpring(c.hot ? 1.04 : 1, springFor(animSpeed));
		});
		return () => cancelAnimationFrame(raf);
	}, [targetY, c.dim, c.hot, animSpeed, y, op, sc]);

	const style = useAnimatedStyle(() => ({
		opacity: op.value,
		transform: [{ translateY: y.value }, { scale: sc.value }]
	}));

	return (
		<Animated.View
			collapsable={false}
			style={[
				{
					position: 'absolute',
					left: 10,
					top: 0,
					width: 140,
					height: 42,
					borderRadius: 9,
					borderWidth: 1.6,
					borderColor: c.border,
					backgroundColor: c.bg,
					alignItems: 'center',
					justifyContent: 'center'
				},
				style
			]}
		>
			<Text style={{ fontFamily: fonts.mono, fontSize: 15, color: c.fg }}>{val}</Text>
		</Animated.View>
	);
}

/** Matches web Trace.svelte stack: uniform 140px boxes inside a 160px U-well, with `← top` gliding OUTSIDE on the right! */
function AnimatedStackView({ s, maxRows, hue, t, idHueMap }: { s: TraceState; maxRows: number; hue: HueSet; t: Palette; idHueMap: Map<string, Hue> }) {
	const keys = useMemo(() => keyed(s.v), [s.v]);
	const CH = 42;
	const GAP = 6;
	const wellH = maxRows * (CH + GAP) + 18;
	const topYOf = (i: number) => wellH - 10 - CH - i * (CH + GAP);

	const animSpeed = useStudyPrefs((s) => s.animSpeed);
	const ptrY = useSharedValue(s.v.length ? topYOf(s.v.length - 1) + 12 : wellH - 30);
	useEffect(() => {
		if (!s.v.length) return;
		const raf = requestAnimationFrame(() => {
			ptrY.value = withSpring(topYOf(s.v.length - 1) + 12, springFor(animSpeed));
		});
		return () => cancelAnimationFrame(raf);
	}, [s.v.length, wellH, animSpeed, ptrY]);
	const ptrStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: ptrY.value }]
	}));

	return (
		<View style={{ alignItems: 'center', paddingVertical: 8 }}>
			<View style={{ width: 260, height: wellH, position: 'relative' }}>
				{/* U-shaped Stack Well (centered) */}
				<View
					style={{
						position: 'absolute',
						left: 50,
						top: 0,
						width: 160,
						height: wellH,
						borderLeftWidth: 2,
						borderRightWidth: 2,
						borderBottomWidth: 2,
						borderBottomLeftRadius: 12,
						borderBottomRightRadius: 12,
						borderColor: t.line2
					}}
				>
					{s.v.length === 0 ? (
						<Text style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', fontFamily: fonts.mono, fontSize: 12, color: t.muted }}>
							empty
						</Text>
					) : null}
					{s.v.map((v, i) => {
						const id = keys[i];
						const c = cellColors(i, s, hue, t, idHueMap.get(id));
						return <StackBlock key={id} val={v} targetY={topYOf(i)} c={c} />;
					})}
				</View>

				{/* `← top` pointer smoothly gliding OUTSIDE the well on the right */}
				{s.v.length > 0 ? (
					<Animated.View collapsable={false} style={[{ position: 'absolute', left: 218, top: 0 }, ptrStyle]}>
						<Text style={{ fontFamily: fonts.mono, fontSize: 11.5, color: hue.ink }}>← top</Text>
					</Animated.View>
				) : null}
			</View>
		</View>
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
					<Marker id="tr-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
						<Path d="M0,0 L10,5 L0,10 z" fill={t.line2} />
					</Marker>
					<Marker id="tr-arr-hot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
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
				<Marker id="gr-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
					<Path d="M0,0 L10,5 L0,10 z" fill={t.line2} />
				</Marker>
				<Marker id="gr-arr-hot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
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
									backgroundColor: active ? alpha(hue.base, 0.22) : 'transparent',
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
