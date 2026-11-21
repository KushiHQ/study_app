// Lesson HTML drawn as native text. Inline runs (strong, em, code, $maths$)
// become nested <Text>; block tags (p, lists, tables, pre, svg) become views.
import { memo, useMemo, type ReactNode } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { parse, textOf, type HNode } from '../lib/html';
import { highlightCode } from '../lib/highlight';
import { splitMath, texToSvg } from '../lib/mathjax';
import { fonts, useTheme, type HueSet, type Palette } from '../lib/theme';
import { SvgTree } from './SvgTree';
import { CodeRuns } from './CodeRuns';

const BLOCK = new Set(['p', 'ul', 'ol', 'li', 'table', 'pre', 'blockquote', 'div', 'svg', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figure', 'hr', 'dl', 'section', 'aside', 'details']);

export interface HtmlProps {
	html: string | null | undefined;
	/** base text style (font, size, colour) */
	style?: TextStyle;
	/** course hue for accents, links and diagrams */
	hue?: HueSet;
	/** reading voice (Nunito) vs app voice (Inter Tight) */
	read?: boolean;
	numberOfLines?: number;
}

export const Html = memo(function Html({ html, style, hue, read = true, numberOfLines }: HtmlProps) {
	const t = useTheme();
	const nodes = useMemo(() => parse(html ?? ''), [html]);
	const base: TextStyle = {
		fontFamily: read ? fonts.read : fonts.body,
		fontSize: read ? 17 : 15,
		lineHeight: read ? 27 : 22,
		color: t.fg,
		...style
	};
	const ctx: Ctx = { t, hue, base, read, numberOfLines };
	return <View style={{ gap: 10 }}>{blocks(nodes, ctx, 'r')}</View>;
});

interface Ctx {
	t: Palette;
	hue?: HueSet;
	base: TextStyle;
	read: boolean;
	numberOfLines?: number;
}

/** Groups consecutive inline nodes into one <Text>, renders block nodes as views. */
function blocks(nodes: HNode[], c: Ctx, key: string): ReactNode[] {
	const out: ReactNode[] = [];
	let run: HNode[] = [];
	const flush = () => {
		if (!run.length) return;
		const r = run;
		run = [];
		// Display maths ($$…$$) in a run splits it into its own block.
		const pieces = r.length === 1 && r[0].name === '#text' ? splitMath(r[0].text ?? '') : null;
		if (pieces && pieces.some((p) => p.kind === 'math' && p.display)) {
			let inl: ReactNode[] = [];
			pieces.forEach((p, i) => {
				if (p.kind === 'math' && p.display) {
					if (inl.length) out.push(textBox(inl, c, `${key}-${out.length}`));
					inl = [];
					out.push(<DisplayMath key={`${key}-m${out.length}`} tex={p.tex} color={c.base.color as string} />);
				} else inl.push(p.kind === 'text' ? p.text : <InlineMath key={i} tex={p.tex} color={c.base.color as string} size={c.base.fontSize ?? 16} />);
			});
			if (inl.length && inl.some((x) => typeof x !== 'string' || x.trim())) out.push(textBox(inl, c, `${key}-${out.length}`));
			return;
		}
		const kids = inlines(r, c, `${key}-${out.length}`);
		if (kids.every((k) => typeof k === 'string' && !k.trim())) return;
		out.push(textBox(kids, c, `${key}-${out.length}`));
	};
	nodes.forEach((n) => {
		if (n.name === '#text' || !BLOCK.has(n.name)) {
			// display maths in a mixed run: split on the fly
			if (n.name === '#text' && /\$\$[\s\S]+?\$\$/.test(n.text ?? '')) {
				flush();
				run = [n];
				flush();
				return;
			}
			run.push(n);
		} else {
			flush();
			out.push(block(n, c, `${key}-${out.length}`));
		}
	});
	flush();
	return out;
}

function textBox(kids: ReactNode[], c: Ctx, key: string) {
	// trim leading/trailing whitespace-only strings
	return (
		<Text key={key} style={c.base} numberOfLines={c.numberOfLines} selectable>
			{trimEdges(kids)}
		</Text>
	);
}

function trimEdges(kids: ReactNode[]): ReactNode[] {
	const k = [...kids];
	if (typeof k[0] === 'string') k[0] = (k[0] as string).replace(/^\s+/, '');
	const l = k.length - 1;
	if (typeof k[l] === 'string') k[l] = (k[l] as string).replace(/\s+$/, '');
	return k;
}

function inlines(nodes: HNode[], c: Ctx, key: string): ReactNode[] {
	const out: ReactNode[] = [];
	nodes.forEach((n, i) => {
		const k = `${key}-${i}`;
		if (n.name === '#text') {
			const s = (n.text ?? '').replace(/\s+/g, ' ');
			for (const p of splitMath(s)) {
				if (p.kind === 'text') out.push(p.text);
				else out.push(<InlineMath key={`${k}-${out.length}`} tex={p.tex} color={c.base.color as string} size={c.base.fontSize ?? 16} />);
			}
			return;
		}
		if (n.name === 'br') return void out.push('\n');
		const kids = inlines(n.children, c, k);
		const st = inlineStyle(n, c);
		if (n.name === 'a') {
			const href = n.attrs.href;
			out.push(
				<Text key={k} style={[st, { color: c.hue?.ink ?? c.t.signal, textDecorationLine: 'underline' }]} onPress={href ? () => Linking.openURL(href) : undefined}>
					{kids}
				</Text>
			);
			return;
		}
		if (n.name === 'svg') return; // inline svg inside a run: drawn as a block elsewhere
		out.push(
			<Text key={k} style={st}>
				{kids}
			</Text>
		);
	});
	return out;
}

function inlineStyle(n: HNode, c: Ctx): TextStyle {
	const { t } = c;
	switch (n.name) {
		case 'strong':
		case 'b':
			return { fontFamily: c.read ? fonts.readHeavy : fonts.bodyBold, color: t.fg };
		case 'em':
		case 'i':
		case 'cite':
		case 'var':
			return { fontFamily: c.read ? fonts.readItalic : fonts.body, fontStyle: c.read ? 'normal' : 'italic' };
		case 'u':
		case 'ins':
			return { textDecorationLine: 'underline' };
		case 's':
		case 'del':
			return { textDecorationLine: 'line-through' };
		case 'code':
		case 'kbd':
		case 'samp':
			return { fontFamily: fonts.mono, fontSize: (c.base.fontSize ?? 16) * 0.86, backgroundColor: t.surface2, color: c.hue?.ink ?? t.fg };
		case 'mark':
			return { backgroundColor: t.accentSoft };
		case 'small':
			return { fontSize: (c.base.fontSize ?? 16) * 0.85 };
		case 'sub':
		case 'sup':
			return { fontSize: (c.base.fontSize ?? 16) * 0.7, lineHeight: c.base.lineHeight };
		case 'span': {
			const cls = n.attrs.class ?? '';
			const hue = /(?:^|\s)(?:hl|hi|ink|t)-(sage|sky|lilac|peach|rose|honey)\b/.exec(cls)?.[1] as keyof Palette['hues'] | undefined;
			if (hue) return { color: t.hues[hue].ink, fontFamily: c.read ? fonts.readBold : fonts.bodySemi };
			if (/muted/.test(cls)) return { color: t.muted };
			if (/accent|key/.test(cls)) return { color: c.hue?.ink ?? t.accent, fontFamily: c.read ? fonts.readBold : fonts.bodySemi };
			return {};
		}
		default:
			return {};
	}
}

function block(n: HNode, c: Ctx, key: string): ReactNode {
	const { t } = c;
	switch (n.name) {
		case 'p':
		case 'div':
		case 'section':
		case 'figure':
		case 'aside':
		case 'details':
			return (
				<View key={key} style={{ gap: 10 }}>
					{blocks(n.children, c, key)}
				</View>
			);
		case 'h1':
		case 'h2':
		case 'h3':
		case 'h4':
		case 'h5':
		case 'h6':
			return (
				<Text key={key} style={[c.base, { fontFamily: c.read ? fonts.serif : fonts.bodyBold, fontSize: (c.base.fontSize ?? 16) * 1.15, marginTop: 4 }]}>
					{inlines(n.children, c, key)}
				</Text>
			);
		case 'ul':
		case 'ol': {
			const items = n.children.filter((x) => x.name === 'li');
			const start = Number(n.attrs.start ?? 1);
			const type = n.attrs.type;
			return (
				<View key={key} style={{ gap: 6 }}>
					{items.map((li, i) => (
						<View key={i} style={{ flexDirection: 'row', gap: 10 }}>
							<Text style={[c.base, { minWidth: n.name === 'ol' ? 22 : 12, color: c.hue?.base ?? t.amber, fontFamily: c.read ? fonts.readHeavy : fonts.bodyBold }]}>
								{n.name === 'ol' ? `${marker(start + i, type)}.` : '•'}
							</Text>
							<View style={{ flex: 1, gap: 6 }}>{blocks(li.children, c, `${key}-${i}`)}</View>
						</View>
					))}
				</View>
			);
		}
		case 'li':
			return (
				<View key={key} style={{ gap: 6 }}>
					{blocks(n.children, c, key)}
				</View>
			);
		case 'blockquote':
			return (
				<View key={key} style={{ borderLeftWidth: 3, borderLeftColor: c.hue?.base ?? t.amber, paddingLeft: 12, gap: 8 }}>
					{blocks(n.children, c, key)}
				</View>
			);
		case 'pre':
			return <FencedCode key={key} node={n} palette={t} />;
		case 'hr':
			return <View key={key} style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: t.line2 }} />;
		case 'table':
			return <Table key={key} n={n} c={c} />;
		case 'svg':
			return <SvgTree key={key} root={n} hue={c.hue} />;
		default:
			return (
				<View key={key} style={{ gap: 8 }}>
					{blocks(n.children, c, key)}
				</View>
			);
	}
}

function marker(i: number, type?: string) {
	if (type === 'a') return String.fromCharCode(96 + i);
	if (type === 'A') return String.fromCharCode(64 + i);
	if (type === 'i') return ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'][i - 1] ?? String(i);
	return String(i);
}

function FencedCode({ node, palette }: { node: HNode; palette: Palette }) {
	const runs = useMemo(() => {
		const code = node.children.find((child) => child.name === 'code');
		const language = /(?:^|\s)language-([^\s]+)/.exec(code?.attrs.class ?? node.attrs.class ?? '')?.[1];
		return highlightCode(textOf(node.children), language, node.children);
	}, [node]);
	return (
		<ScrollView horizontal style={{ backgroundColor: palette.surface2, borderRadius: 12 }} contentContainerStyle={{ padding: 12 }}>
			<Text style={{ fontFamily: fonts.mono, fontSize: 13, lineHeight: 19, color: palette.fg }} selectable>
				<CodeRuns runs={runs} palette={palette} />
			</Text>
		</ScrollView>
	);
}

function Table({ n, c }: { n: HNode; c: Ctx }) {
	const rows: HNode[] = [];
	const walk = (x: HNode) => x.children.forEach((ch) => (ch.name === 'tr' ? rows.push(ch) : ['thead', 'tbody', 'tfoot'].includes(ch.name) && walk(ch)));
	walk(n);
	return <Grid rows={rows.map((r) => r.children.filter((x) => x.name === 'td' || x.name === 'th').map((cell) => ({ head: cell.name === 'th', nodes: cell.children })))} c={c} />;
}

/** A sideways-scrolling table (also used by compare blocks). */
export function Grid({ rows, c }: { rows: { head: boolean; nodes: HNode[] }[][]; c: Ctx }) {
	const { t } = c;
	const cols = Math.max(...rows.map((r) => r.length), 1);
	const w = cols <= 2 ? 160 : 150;
	return (
		<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderRadius: 14, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.line2 }}>
			<View>
				{rows.map((r, ri) => (
					<View key={ri} style={{ flexDirection: 'row', backgroundColor: r.every((x) => x.head) ? (c.hue?.wash ?? t.surface2) : ri % 2 ? t.surface2 : t.surface }}>
						{r.map((cell, ci) => (
							<View key={ci} style={{ width: ci === 0 ? w + 10 : w, padding: 10, borderRightWidth: ci < r.length - 1 ? StyleSheet.hairlineWidth : 0, borderColor: t.line2 }}>
								<View style={{ gap: 6 }}>
									{blocks(cell.nodes, { ...c, base: { ...c.base, fontSize: 14, lineHeight: 20, fontFamily: cell.head || ci === 0 ? (c.read ? fonts.readHeavy : fonts.bodyBold) : c.base.fontFamily } }, `c${ri}-${ci}`)}
								</View>
							</View>
						))}
					</View>
				))}
			</View>
		</ScrollView>
	);
}

/** Exposed so blocks can render compare tables with the same context. */
export function useHtmlCtx(hue?: HueSet, read = true): Ctx {
	const t = useTheme();
	return { t, hue, read, base: { fontFamily: read ? fonts.read : fonts.body, fontSize: read ? 17 : 15, lineHeight: read ? 27 : 22, color: t.fg } };
}

const EX = 0.47; // 1ex ≈ 0.47em in the reading fonts

export function InlineMath({ tex, color, size }: { tex: string; color: string; size: number }) {
	const m = texToSvg(tex, false);
	if (!m) return <Text style={{ fontFamily: fonts.mono, color }}>{tex}</Text>;
	const ex = size * EX;
	return (
		<View style={{ width: m.width * ex, height: m.height * ex, transform: [{ translateY: -m.valign * ex * 0.5 }] }}>
			<SvgXml xml={m.xml} width={m.width * ex} height={m.height * ex} color={color} />
		</View>
	);
}

export function DisplayMath({ tex, color, size = 17 }: { tex: string; color: string; size?: number }) {
	const m = texToSvg(tex, true);
	if (!m) return <Text style={{ fontFamily: fonts.mono, color, textAlign: 'center' }}>{tex}</Text>;
	const ex = size * EX * 1.05;
	return (
		<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 4 }}>
			<SvgXml xml={m.xml} width={m.width * ex} height={m.height * ex} color={color} />
		</ScrollView>
	);
}
