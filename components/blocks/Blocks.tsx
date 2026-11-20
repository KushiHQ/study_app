// One lesson block → one native view (study_web_app src/lib/ui/blocks/Blocks.svelte).
// Blocks rise in gently as they first scroll into view.
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Copy, Check, Quote, ChevronRight, RotateCcw, Puzzle } from 'lucide-react-native';
import type { Block } from '../../lib/api/types';
import { parse, type HNode } from '../../lib/html';
import { fonts, radius, useTheme, type HueSet } from '../../lib/theme';
import { DisplayMath, Grid, Html, useHtmlCtx } from '../Html';
import { Press, T, hair } from '../ui';
import { Diagram } from './Diagram';
import { Figure } from './Figure';
import { Trace } from './Trace';
import { Plot } from './Plot';

export const Blocks = memo(function Blocks({ blocks, hue, onReport }: { blocks: Block[]; hue: HueSet; onReport?: (key: string, what: string) => void }) {
	return (
		<View style={{ gap: 22 }}>
			{blocks.map((b, i) => (
				<Rise key={b.key ?? i} index={i}>
					<BlockView b={b} hue={hue} onLongPress={onReport && b.type !== 'heading' ? () => onReport(b.key ?? `#${i + 1}`, KIND[b.type] ?? 'this part') : undefined} />
				</Rise>
			))}
		</View>
	);
});

export const KIND: Record<string, string> = { text: 'a paragraph', analogy: 'the analogy', bigidea: 'the big idea', steps: 'the worked example', compare: 'the table', diagram: 'the diagram', figure: 'the picture', formula: 'the formula', code: 'the code', think: 'the think-about-it question', mnemonic: 'the memory trick', story: 'the story', pitfall: 'the warning', widget: 'the interactive piece', trace: 'the walk-through', plot: 'the graph' };

function Rise({ children, index }: { children: ReactNode; index: number }) {
	const reduced = useReducedMotion();
	if (reduced) return <View>{children}</View>;
	return <Animated.View entering={FadeInDown.duration(520).delay(Math.min(index, 6) * 70).springify().damping(18)}>{children}</Animated.View>;
}

function BlockView({ b, hue, onLongPress }: { b: Block; hue: HueSet; onLongPress?: () => void }) {
	const t = useTheme();
	const body = (() => {
		switch (b.type) {
			case 'text':
				return <Html html={b.html} hue={hue} />;
			case 'heading':
				return <T style={{ fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, color: t.fg, marginTop: 8 }}>{b.text}</T>;
			case 'analogy':
				return <Callout emoji="💡" eyebrow="Think of it like…" title={b.title} html={b.html} hue={hue} bg={hue.wash} />;
			case 'story':
				return <Callout emoji="📖" eyebrow="A true story" title={b.title} html={b.html} hue={hue} bg={t.surface} />;
			case 'mnemonic':
				return <Callout emoji="🧠" eyebrow="Memory trick" html={b.html} hue={hue} bg={t.hues.lilac.wash} />;
			case 'pitfall':
				return <Callout emoji="⚠️" eyebrow="Careful, this costs marks" html={b.html} hue={hue} bg={t.dangerSoft} eyebrowColor={t.danger} />;
			case 'bigidea':
				return (
					<View style={{ borderLeftWidth: 4, borderLeftColor: hue.base, paddingLeft: 16, paddingVertical: 4, gap: 6 }}>
						<Quote size={22} color={hue.base} />
						<Html html={b.html} hue={hue} style={{ fontFamily: fonts.serif, fontSize: 20, lineHeight: 29 }} />
					</View>
				);
			case 'steps':
				return <Steps title={b.title} intro={b.intro} steps={b.steps} hue={hue} />;
			case 'compare':
				return <Compare title={b.title} headers={b.headers} rows={b.rows} hue={hue} />;
			case 'formula':
				return (
					<Box hue={hue}>
						<Eye hue={hue}>{b.title}</Eye>
						<DisplayMath tex={b.tex} color={t.fg} size={19} />
						<Html html={b.html} hue={hue} style={{ fontSize: 16, lineHeight: 25 }} />
					</Box>
				);
			case 'code':
				return <Code lang={b.lang} code={b.code} html={b.html} caption={b.caption} hue={hue} />;
			case 'think':
				return <Think prompt={b.prompt} answer={b.answer} hue={hue} />;
			case 'diagram':
				return <Diagram svg={b.svg} caption={b.caption} parts={b.parts} steps={b.steps} hue={hue} />;
			case 'figure':
				return <Figure block={b} hue={hue} />;
			case 'trace':
				return <Trace block={b} hue={hue} />;
			case 'plot':
				return <Plot block={b} hue={hue} />;
			case 'widget':
				return <Widget kind={b.kind} title={b.title} config={b.config} caption={b.caption} hue={hue} />;
			default:
				return null;
		}
	})();
	if (!onLongPress) return body;
	return (
		<Press scaleTo={1} onLongPress={onLongPress} delayLongPress={450} accessibilityHint="Long-press to report a problem with this part">
			{body}
		</Press>
	);
}

export function Box({ children, hue, bg, style }: { children: ReactNode; hue?: HueSet; bg?: string; style?: object }) {
	const t = useTheme();
	return <View style={[{ backgroundColor: bg ?? t.surface, borderRadius: radius.md, padding: 16, gap: 10, borderWidth: hair, borderColor: t.line }, style]}>{children}</View>;
}

export function Eye({ children, hue, color }: { children: ReactNode; hue?: HueSet; color?: string }) {
	const t = useTheme();
	return <Text style={{ fontFamily: fonts.readHeavy, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: color ?? hue?.ink ?? t.accent }}>{typeof children === 'string' ? children.replace(/<[^>]+>/g, '').replace(/\$/g, '') : children}</Text>;
}

function Callout({ emoji, eyebrow, title, html, hue, bg, eyebrowColor }: { emoji: string; eyebrow: string; title?: string; html: string; hue: HueSet; bg: string; eyebrowColor?: string }) {
	const t = useTheme();
	return (
		<View style={{ flexDirection: 'row', gap: 12, backgroundColor: bg, borderRadius: radius.md, padding: 16 }}>
			<Text style={{ fontSize: 22, lineHeight: 28 }}>{emoji}</Text>
			<View style={{ flex: 1, gap: 6 }}>
				<Eye hue={hue} color={eyebrowColor}>
					{eyebrow}
				</Eye>
				{title ? <Html html={title} hue={hue} style={{ fontFamily: fonts.serif, fontSize: 18, lineHeight: 24 }} /> : null}
				<Html html={html} hue={hue} style={{ fontSize: 16, lineHeight: 25, color: t.fg }} />
			</View>
		</View>
	);
}

function Steps({ title, intro, steps, hue }: { title: string; intro?: string; steps: { title: string; html: string }[]; hue: HueSet }) {
	const t = useTheme();
	const [shown, setShown] = useState(1);
	const all = shown >= steps.length;
	return (
		<Box hue={hue}>
			<View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
				<Text style={{ fontSize: 20 }}>✍️</Text>
				<View style={{ flex: 1 }}>
					<Eye hue={hue}>Worked example</Eye>
					<Html html={title} hue={hue} style={{ fontFamily: fonts.serif, fontSize: 18, lineHeight: 24 }} />
				</View>
			</View>
			{intro ? <Html html={intro} hue={hue} style={{ fontSize: 16, lineHeight: 25 }} /> : null}
			<View style={{ gap: 14 }}>
				{steps.slice(0, shown).map((s, i) => (
					<Animated.View key={i} entering={FadeIn.duration(350)} layout={LinearTransition} style={{ flexDirection: 'row', gap: 12 }}>
						<View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: hue.soft, alignItems: 'center', justifyContent: 'center' }}>
							<Text style={{ fontFamily: fonts.readHeavy, color: hue.ink }}>{i + 1}</Text>
						</View>
						<View style={{ flex: 1, gap: 4 }}>
							<Html html={s.title} hue={hue} style={{ fontFamily: fonts.readHeavy, fontSize: 16 }} />
							<Html html={s.html} hue={hue} style={{ fontSize: 16, lineHeight: 25 }} />
						</View>
					</Animated.View>
				))}
			</View>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
				<View style={{ flexDirection: 'row', gap: 4, flex: 1 }}>
					{steps.map((_, i) => (
						<View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i < shown ? hue.base : t.line2 }} />
					))}
				</View>
				{!all ? (
					<>
						<SmallBtn label="Show all" onPress={() => setShown(steps.length)} />
						<SmallBtn label="Next step" strong hue={hue} icon={<ChevronRight size={16} color={hue.ink} />} onPress={() => setShown((n) => n + 1)} />
					</>
				) : (
					<SmallBtn label="Replay" icon={<RotateCcw size={14} color={t.fg2} />} onPress={() => setShown(1)} />
				)}
			</View>
		</Box>
	);
}

export function SmallBtn({ label, onPress, strong, hue, icon }: { label: string; onPress: () => void; strong?: boolean; hue?: HueSet; icon?: ReactNode }) {
	const t = useTheme();
	return (
		<Press
			haptic
			onPress={onPress}
			accessibilityRole="button"
			style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, height: 36, borderRadius: radius.pill, backgroundColor: strong ? (hue?.soft ?? t.accentSoft) : 'transparent', borderWidth: strong ? 0 : hair, borderColor: t.line2 }}
		>
			<Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: strong ? (hue?.ink ?? t.accent) : t.fg2 }}>{label}</Text>
			{icon}
		</Press>
	);
}

function Compare({ title, headers, rows, hue }: { title: string; headers: string[]; rows: string[][]; hue: HueSet }) {
	const c = useHtmlCtx(hue);
	const grid = useMemo(
		() => [headers.map((h) => ({ head: true, nodes: parse(h) })), ...rows.map((r) => r.map((cell) => ({ head: false, nodes: parse(cell) })))],
		[headers, rows]
	);
	return (
		<View style={{ gap: 8 }}>
			<Eye hue={hue}>{title}</Eye>
			<Grid rows={grid} c={c} />
			<T v="small">Swipe the table sideways to see every column.</T>
		</View>
	);
}

const HL: Record<string, keyof ReturnType<typeof codeColors>> = {
	keyword: 'k', 'selector-tag': 'k', doctag: 'k', k: 'k', built_in: 'b', type: 'b', title: 'f', 'title.function': 'f', 'title.class': 'b',
	string: 's', regexp: 's', 'template-tag': 's', addition: 's', s: 's', comment: 'c', quote: 'c', c: 'c',
	number: 'n', literal: 'n', meta: 'n', n: 'n', symbol: 'b', bullet: 'b', link: 'b', name: 'k', attr: 'f', 'attr-name': 'f', a: 'n', params: 'p', variable: 'p'
};
function codeColors(dark: boolean) {
	return dark
		? { k: '#c4a7ff', s: '#9be5be', c: '#7d88a6', n: '#fdc6a9', f: '#acd0fd', b: '#f2dc93', p: '#e6ebf5' }
		: { k: '#6d28d9', s: '#0f7a4f', c: '#7a8299', n: '#b45309', f: '#1d4ed8', b: '#9a3f14', p: '#1f2937' };
}

function Code({ lang, code, html, caption, hue }: { lang: string; code: string; html?: string; caption?: string; hue: HueSet }) {
	const t = useTheme();
	const [copied, setCopied] = useState(false);
	const colors = codeColors(t.name === 'night');
	const nodes = useMemo(() => (html ? parse(html) : null), [html]);
	const draw = (ns: HNode[], color?: string): ReactNode[] =>
		ns.map((n, i) => {
			if (n.name === '#text') return n.text;
			const cls = (n.attrs.class ?? '').split(/\s+/).map((c) => c.replace(/^hljs-/, ''));
			const key = cls.map((c) => HL[c]).find(Boolean);
			const col = key ? colors[key] : color;
			return (
				<Text key={i} style={{ color: col, fontStyle: key === 'c' ? 'italic' : 'normal' }}>
					{draw(n.children, col)}
				</Text>
			);
		});
	return (
		<View style={{ gap: 8 }}>
			<View style={{ backgroundColor: t.name === 'night' ? '#0b1122' : '#f6f8fc', borderRadius: radius.md, borderWidth: hair, borderColor: t.line2, overflow: 'hidden' }}>
				<View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 10 }}>
					<T v="micro" style={{ flex: 1 }}>
						{lang || 'code'}
					</T>
					<Press
						onPress={async () => {
							await Clipboard.setStringAsync(code);
							Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
							setCopied(true);
							setTimeout(() => setCopied(false), 1600);
						}}
						accessibilityLabel="Copy the code"
						hitSlop={10}
					>
						{copied ? <Check size={16} color={t.success} /> : <Copy size={16} color={t.muted} />}
					</Press>
				</View>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 14 }}>
					<Text selectable style={{ fontFamily: fonts.mono, fontSize: 13, lineHeight: 20, color: colors.p }}>
						{nodes ? draw(nodes) : code.replace(/^\n+|\s+$/g, '')}
					</Text>
				</ScrollView>
			</View>
			{caption ? <Html html={caption} hue={hue} style={{ fontSize: 14, lineHeight: 21, color: t.muted }} /> : null}
		</View>
	);
}

function Think({ prompt, answer, hue }: { prompt: string; answer: string; hue: HueSet }) {
	const t = useTheme();
	const [open, setOpen] = useState(false);
	return (
		<Box hue={hue} bg={hue.wash}>
			<View style={{ flexDirection: 'row', gap: 10 }}>
				<Text style={{ fontSize: 20 }}>🤔</Text>
				<View style={{ flex: 1, gap: 6 }}>
					<Eye hue={hue}>Think about it</Eye>
					<Html html={prompt} hue={hue} style={{ fontSize: 16, lineHeight: 25 }} />
				</View>
			</View>
			{open ? (
				<Animated.View entering={FadeInDown.duration(300)} style={{ backgroundColor: t.surface, borderRadius: 14, padding: 14, gap: 6 }}>
					<Eye hue={hue}>Here's how to see it</Eye>
					<Html html={answer} hue={hue} style={{ fontSize: 16, lineHeight: 25 }} />
				</Animated.View>
			) : (
				<View style={{ flexDirection: 'row' }}>
					<SmallBtn label="Show the answer" strong hue={hue} onPress={() => setOpen(true)} />
				</View>
			)}
		</Box>
	);
}

function Widget({ kind, title, config, caption, hue }: { kind: string; title?: string; config: Record<string, unknown>; caption?: string; hue: HueSet }) {
	const t = useTheme();
	const steps = Array.isArray(config?.steps) ? (config.steps as unknown[]).map(String) : [];
	const [shown, setShown] = useState(0);
	const NAMES: Record<string, string> = { 'slider-formula': 'Formula explorer', 'graph-search': 'Search walk-through', 'sort-steps': 'Sorting, step by step', 'truth-table': 'Truth table builder', 'reveal-steps': 'Step-by-step reveal' };
	return (
		<Box hue={hue}>
			<View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
				<Puzzle size={18} color={hue.base} />
				<View style={{ flex: 1 }}>
					<Eye hue={hue}>{`Interactive · ${NAMES[kind] ?? kind}`}</Eye>
					{title ? <T v="h3">{title}</T> : null}
				</View>
			</View>
			{steps.length ? (
				<>
					{steps.slice(0, shown + 1).map((s, i) => (
						<Html key={i} html={s} hue={hue} style={{ fontSize: 16, lineHeight: 25 }} />
					))}
					{shown < steps.length - 1 ? <SmallBtn label="Next" strong hue={hue} onPress={() => setShown(shown + 1)} /> : null}
				</>
			) : null}
			{caption ? <Html html={caption} hue={hue} style={{ fontSize: 14, lineHeight: 21, color: t.muted }} /> : null}
		</Box>
	);
}
