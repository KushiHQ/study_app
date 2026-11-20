// Draws a lesson SVG (Study Nook's dg-* diagram classes) with react-native-svg.
// The web styles diagrams with CSS; here each dg-* class is turned into plain
// fill/stroke attributes from the theme, and the shared arrowheads are added.
// Interactive diagrams: elements with data-part are tappable; dg-step / --i,
// data-out, data-at and data-hot follow the current step like the web player.
import { memo, useMemo, type ReactElement } from 'react';
import { useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Marker, Path, Polygon, Polyline, RadialGradient, Rect, Stop, Text as SText, TSpan } from 'react-native-svg';
import { parse, styleMap, type HNode } from '../lib/html';
import { fonts, useTheme, type Hue, type HueSet, type Palette } from '../lib/theme';

const HUE_NAMES: Hue[] = ['sage', 'rose', 'honey', 'sky', 'lilac', 'peach'];

type Attrs = Record<string, string | number | undefined>;

/** dg-* classes → attributes for this theme. `accent` is the course hue in lessons. */
function classAttrs(cls: string[], tag: string, t: Palette, hue?: HueSet): Attrs {
	const a: Attrs = {};
	const acc = hue ?? { base: t.amber, ink: t.accent, soft: t.accentSoft, wash: t.accentSoft };
	const H = (n: string): HueSet => (n === 'accent' ? acc : t.hues[n as Hue]);
	const isText = tag === 'text' || tag === 'tspan';
	if (isText) {
		a.fill = t.fg;
		a.fontSize = 14;
		a.fontWeight = '600';
		a.fontFamily = fonts.readBold;
	}
	for (const c of cls) {
		if (!c.startsWith('dg-')) continue;
		const k = c.slice(3);
		if (isText) {
			if (k === 'muted') a.fill = t.muted;
			else if (k === 'small') a.fontSize = 12;
			else if (k === 'tiny') a.fontSize = 10.5;
			else if (k === 'bold') a.fontFamily = fonts.readHeavy;
			else if (k === 'title') {
				a.fontFamily = fonts.serif;
				a.fontSize = 16;
			} else if (k === 'mono') a.fontFamily = fonts.mono;
			else if (k === 'on-solid') a.fill = t.name === 'day' ? '#ffffff' : t.bg;
			else if (k.startsWith('ink-')) a.fill = H(k.slice(4)).ink;
			continue;
		}
		if (k === 'box') Object.assign(a, { fill: t.surface, stroke: t.line2, strokeWidth: 1.5 });
		else if (k === 'ghost') Object.assign(a, { fill: t.surface2, stroke: t.line, strokeWidth: 1.2 });
		else if (k === 'accent' || HUE_NAMES.includes(k as Hue)) Object.assign(a, { fill: H(k).soft, stroke: H(k).base, strokeWidth: 1.6 });
		else if (k.startsWith('solid-')) Object.assign(a, { fill: H(k.slice(6)).base, stroke: 'none' });
		else if (k === 'line') Object.assign(a, { fill: 'none', stroke: t.fg2, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: 0.75 });
		else if (k.startsWith('line-') && k !== 'line-soft') Object.assign(a, { fill: 'none', stroke: H(k.slice(5)).base, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' });
		else if (k === 'line-soft') Object.assign(a, { fill: 'none', stroke: t.line2, strokeWidth: 1.2 });
		else if (k === 'dashed') a.strokeDasharray = '5 5';
		else if (k === 'flow') a.strokeDasharray = '6 6';
	}
	return a;
}

const camel = (s: string) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
const SKIP_ATTR = new Set(['class', 'style', 'role', 'aria-label', 'aria-hidden', 'tabindex', 'xmlns', 'xmlns:xlink', 'focusable']);

function resolveColor(v: string, t: Palette, hue?: HueSet): string {
	// var(--accent), var(--h-sky), var(--ink) … used in inline styles
	return v.replace(/var\(--([a-z0-9-]+)\)/g, (_, name: string) => {
		const acc = hue ?? { base: t.amber, ink: t.accent, soft: t.accentSoft, wash: t.accentSoft };
		const m = /^h-([a-z]+)(?:-(ink|soft|wash))?$/.exec(name);
		if (m && t.hues[m[1] as Hue]) return t.hues[m[1] as Hue][(m[2] as 'ink' | 'soft' | 'wash') ?? 'base'];
		const map: Record<string, string> = {
			accent: acc.base, 'accent-ink': acc.ink, 'accent-soft': acc.soft, t: acc.base, 't-ink': acc.ink, 't-soft': acc.soft,
			ink: t.fg, 'ink-soft': t.fg2, muted: t.muted, paper: t.surface, 'paper-2': t.surface2, bg: t.bg, line: t.line, 'line-strong': t.line2,
			good: t.success, bad: t.danger, signal: t.signal, 'k-accent': t.accent
		};
		return map[name] ?? t.fg;
	});
}

export interface StepState {
	/** -1 = not started: the finished picture */
	cur: number;
	last: number;
}

function attrsFor(n: HNode, t: Palette, hue: HueSet | undefined, step: StepState | undefined, activePart: string | null): { props: Attrs; hidden: boolean } {
	const cls = (n.attrs.class ?? '').split(/\s+/).filter(Boolean);
	const props: Attrs = classAttrs(cls, n.name, t, hue);
	for (const [k, v] of Object.entries(n.attrs)) {
		if (SKIP_ATTR.has(k) || k.startsWith('data-')) continue;
		if (k === 'href' || k === 'xlink:href') props.href = v;
		else props[camel(k)] = /^(fill|stroke|stop-color|color)$/.test(k) ? resolveColor(v, t, hue) : v;
	}
	const st = styleMap(n.attrs.style);
	for (const [k, v] of Object.entries(st)) {
		if (k.startsWith('--') || k === 'transform-box' || k === 'transform-origin' || k.startsWith('animation') || k === 'translate') continue;
		props[camel(k)] = /fill|stroke|color/.test(k) ? resolveColor(v, t, hue) : v;
	}
	if (props.dominantBaseline) {
		props.alignmentBaseline = props.dominantBaseline === 'central' ? 'central' : props.dominantBaseline;
	}
	if (props.markerEnd) props.markerEnd = String(props.markerEnd);
	if (props.markerStart) props.markerStart = String(props.markerStart);
	let hidden = false;
	if (step && step.last >= 0) {
		const s = step.cur < 0 ? step.last : step.cur;
		if (cls.includes('dg-step') || cls.includes('dg-draw')) {
			const i = parseInt(st['--i'] ?? '0', 10);
			if (step.cur >= 0 && Number.isFinite(i) && i > step.cur) hidden = true;
			if (step.cur >= 0 && i === step.cur) props.opacity = 1;
		}
		const out = parseInt(n.attrs['data-out'] ?? '', 10);
		if (Number.isFinite(out) && s >= out) hidden = true;
		const at = (n.attrs['data-at'] ?? '')
			.split(';')
			.map((x) => /^\s*(\d+)\s*:\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*$/.exec(x))
			.filter((m): m is RegExpExecArray => !!m)
			.map((m) => [+m[1], +m[2], +m[3]] as const)
			.sort((a, b) => a[0] - b[0]);
		let dx = 0,
			dy = 0;
		for (const [k, x, y] of at) if (k <= s) [dx, dy] = [x, y];
		if (dx || dy) props.transform = `translate(${dx} ${dy})${props.transform ? ' ' + props.transform : ''}`;
		const hot = (n.attrs['data-hot'] ?? '').split(',').map((x) => parseInt(x, 10));
		if (step.cur >= 0 && hot.includes(s)) {
			props.stroke = hue?.base ?? t.amber;
			props.strokeWidth = 2.6;
		}
	}
	if (activePart && n.attrs['data-part'] === activePart) {
		props.stroke = hue?.base ?? t.amber;
		props.strokeWidth = 2.8;
	}
	return { props, hidden };
}

function arrowDefs(t: Palette, hue?: HueSet) {
	const acc = hue?.base ?? t.amber;
	const list: [string, string][] = [['dg-arrow', t.fg2], ['dg-arrow-accent', acc], ...HUE_NAMES.map((h) => [`dg-arrow-${h}`, t.hues[h].base] as [string, string])];
	return list.map(([id, color]) => (
		<Marker key={id} id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
			<Path d="M1 1.5 L8.5 5 L1 8.5 Q2.6 5 1 1.5Z" fill={color} />
		</Marker>
	));
}

const TAGS: Record<string, any> = {
	g: G,
	rect: Rect,
	circle: Circle,
	ellipse: Ellipse,
	line: Line,
	path: Path,
	polygon: Polygon,
	polyline: Polyline,
	text: SText,
	tspan: TSpan,
	defs: Defs,
	marker: Marker,
	lineargradient: LinearGradient,
	radialgradient: RadialGradient,
	stop: Stop
};

function draw(n: HNode, key: string, c: DrawCtx): ReactElement | string | null {
	if (n.name === '#text') {
		const s = (n.text ?? '').replace(/\s+/g, ' ');
		return s.trim() ? s : null;
	}
	const Comp = TAGS[n.name];
	if (!Comp) return null;
	const { props, hidden } = attrsFor(n, c.t, c.hue, c.step, c.activePart);
	if (hidden) return null;
	const part = n.attrs['data-part'];
	const kids = n.children.map((ch, i) => draw(ch, `${key}-${i}`, c)).filter((x) => x !== null);
	const extra: Attrs & { onPress?: () => void } = {};
	if (part && c.onPart) extra.onPress = () => c.onPart!(part);
	if (n.name === 'text' || n.name === 'tspan') {
		// react-native-svg text needs fontWeight as a string and no CSS font shorthand
		if (typeof props.fontSize === 'string') props.fontSize = parseFloat(props.fontSize as string) || 14;
	}
	return (
		<Comp key={key} {...props} {...extra}>
			{kids.length ? kids : undefined}
		</Comp>
	);
}

interface DrawCtx {
	t: Palette;
	hue?: HueSet;
	step?: StepState;
	activePart: string | null;
	onPart?: (id: string) => void;
}

export const SvgTree = memo(function SvgTree({
	root,
	svg,
	hue,
	step,
	activePart = null,
	onPart,
	maxWidth
}: {
	root?: HNode;
	svg?: string;
	hue?: HueSet;
	step?: StepState;
	activePart?: string | null;
	onPart?: (id: string) => void;
	maxWidth?: number;
}) {
	const t = useTheme();
	const win = useWindowDimensions();
	const node = useMemo(() => root ?? parse(svg ?? '').find((x) => x.name === 'svg'), [root, svg]);
	if (!node) return null;
	const vb = (node.attrs.viewBox ?? node.attrs.viewbox ?? `0 0 ${node.attrs.width ?? 300} ${node.attrs.height ?? 150}`).split(/[\s,]+/).map(Number);
	const [, , vw, vh] = vb;
	const width = Math.min(maxWidth ?? win.width - 36, (vw || 300) * 1.6);
	const height = vh && vw ? (width * vh) / vw : 150;
	const c: DrawCtx = { t, hue, step, activePart, onPart };
	return (
		<Svg width={width} height={height} viewBox={vb.join(' ')} accessibilityLabel={node.attrs['aria-label']}>
			<Defs>{arrowDefs(t, hue)}</Defs>
			{node.children.map((ch, i) => draw(ch, `n${i}`, c))}
		</Svg>
	);
});

/** Highest step index (--i) used by dg-step elements, for the step player. */
export function maxStepIndex(svg: string): number {
	let max = -1;
	const re = /--i\s*:\s*(\d+)/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(svg))) max = Math.max(max, +m[1]);
	return max;
}
