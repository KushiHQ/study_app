// One lesson block → one native view (study_web_app src/lib/ui/blocks/Blocks.svelte).
import { memo, useMemo, useRef, useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { Easing, FadeInDown, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Copy, Check, Quote, ChevronRight, RotateCcw, Puzzle } from 'lucide-react-native';
import type { Block } from '../../lib/api/types';
import { parse } from '../../lib/html';
import { highlightCode } from '../../lib/highlight';
import { alpha, fonts, mix, radius, useTheme, type HueSet } from '../../lib/theme';
import { DisplayMath, Grid, Html, useHtmlCtx } from '../Html';
import { CodeRuns } from '../CodeRuns';
import { LuminousBg, Press, T, hair } from '../ui';
import { Diagram } from './Diagram';
import { Figure } from './Figure';
import { Trace } from './Trace';
import { Plot } from './Plot';
import { VisiblePlayback, type PlaybackViewport } from './VisiblePlayback';

type RevealStep = (step: View) => void;

export const Blocks = memo(function Blocks({ blocks, hue, viewport, onReport, onStepReveal }: { blocks: Block[]; hue: HueSet; viewport: PlaybackViewport; onReport?: (key: string, what: string) => void; onStepReveal?: RevealStep }) {
	const contentTop = useSharedValue<number | null>(null);
	const [width, setWidth] = useState(0);
	return (
		<View style={{ gap: 22 }} onLayout={({ nativeEvent }) => {
			contentTop.set(nativeEvent.layout.y);
			setWidth(nativeEvent.layout.width);
		}}>
			{blocks.map((b, i) => {
				const key = b.key ?? i;
				const onLongPress = onReport && b.type !== 'heading' ? () => onReport(b.key ?? `#${i + 1}`, KIND[b.type] ?? 'this part') : undefined;
				if ((b.type === 'trace' && b.states.length > 1) || (b.type === 'diagram' && b.steps?.length)) {
					return (
						<VisiblePlayback key={key} viewport={viewport} contentTop={contentTop} diagram={b.type === 'diagram'}>
							{(autoplay) => <BlockView b={b} hue={hue} width={width} autoplay={autoplay} onLongPress={onLongPress} />}
						</VisiblePlayback>
					);
				}
				return <BlockView key={key} b={b} hue={hue} width={width} onStepReveal={onStepReveal} onLongPress={onLongPress} />;
			})}
		</View>
	);
});

export const KIND: Record<string, string> = { text: 'a paragraph', analogy: 'the analogy', bigidea: 'the big idea', steps: 'the worked example', compare: 'the table', diagram: 'the diagram', figure: 'the picture', formula: 'the formula', code: 'the code', think: 'the think-about-it question', mnemonic: 'the memory trick', story: 'the story', pitfall: 'the warning', widget: 'the interactive piece', trace: 'the walk-through', plot: 'the graph' };

function BlockView({ b, hue, width, autoplay, onLongPress, onStepReveal }: { b: Block; hue: HueSet; width: number; autoplay?: boolean; onLongPress?: () => void; onStepReveal?: RevealStep }) {
	const t = useTheme();
	const body = (() => {
		switch (b.type) {
			case 'text':
				return <Html html={b.html} hue={hue} />;
			case 'heading':
				return <T style={{ fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, color: t.fg, marginTop: 8 }}>{b.text}</T>;
			case 'analogy':
				return <Callout emoji="💡" eyebrow="Think of it like…" title={b.title} html={b.html} hue={hue} tint={t.hues.honey.base} eyebrowColor={t.hues.honey.ink} />;
			case 'story':
				return <Callout emoji="📖" eyebrow="A true story" title={b.title} html={b.html} hue={hue} tint={t.hues.sky.base} eyebrowColor={t.hues.sky.ink} />;
			case 'mnemonic':
				return <Callout emoji="🧠" eyebrow="Memory trick" html={b.html} hue={hue} tint={t.hues.lilac.base} eyebrowColor={t.hues.lilac.ink} />;
			case 'pitfall':
				return <Callout emoji="⚠️" eyebrow="Common trap" html={b.html} hue={hue} tint={t.danger} eyebrowColor={t.danger} />;
			case 'bigidea':
				return (
					<View style={{ borderLeftWidth: 4, borderLeftColor: hue.base, paddingLeft: 16, paddingVertical: 4, gap: 6 }}>
						<Quote size={22} color={hue.base} />
						<Html html={b.html} hue={hue} style={{ fontFamily: fonts.serif, fontSize: 20, lineHeight: 29 }} />
					</View>
				);
			case 'steps':
				return <Steps title={b.title} intro={b.intro} steps={b.steps} hue={hue} onStepReveal={onStepReveal} />;
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
				return width > 0 ? <Diagram svg={b.svg} caption={b.caption} parts={b.parts} steps={b.steps} hue={hue} width={width} autoplay={autoplay} /> : null;
			case 'figure':
				return width > 0 ? <Figure block={b} hue={hue} width={width} /> : null;
			case 'trace':
				return width > 0 ? <Trace block={b} hue={hue} width={width} autoplay={autoplay} /> : null;
			case 'plot':
				return width > 0 ? <Plot block={b} hue={hue} width={width} /> : null;
			case 'widget':
				return <Widget kind={b.kind} title={b.title} config={b.config} caption={b.caption} hue={hue} />;
			default:
				return null;
		}
	})();
	if (!onLongPress) return body;
	return (
		<Press onLongPress={onLongPress} delayLongPress={450} accessibilityHint="Long-press to report a problem with this part">
			{body}
		</Press>
	);
}

export function Box({ children, hue, bg, style }: { children: ReactNode; hue?: HueSet; bg?: string; style?: object }) {
	const t = useTheme();
	const tint = hue?.base;
	return (
		<View
			style={[
				{
					backgroundColor: bg ?? t.surface,
					borderRadius: radius.md,
					padding: 16,
					gap: 10,
					borderWidth: hair,
					borderColor: tint ? alpha(tint, 0.24) : t.line,
					overflow: 'hidden'
				},
				style
			]}
		>
			{!bg ? (
				<LuminousBg
					from={tint ? mix(tint, t.name === 'night' ? 8 : 5, t.surface) : t.name === 'night' ? mix('#b4caff', 4.5, t.surface) : mix('#6374af', 2.5, t.surface)}
					to={t.surface}
					borderRadius={radius.md}
				/>
			) : null}
			{children}
		</View>
	);
}

export function Eye({ children, hue, color }: { children: ReactNode; hue?: HueSet; color?: string }) {
	const t = useTheme();
	return <Text style={{ fontFamily: fonts.readHeavy, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: color ?? hue?.ink ?? t.accent }}>{typeof children === 'string' ? children.replace(/<[^>]+>/g, '').replace(/\$/g, '') : children}</Text>;
}

function Callout({ emoji, eyebrow, title, html, hue, tint, eyebrowColor }: { emoji: string; eyebrow: string; title?: string; html: string; hue: HueSet; tint: string; eyebrowColor?: string }) {
	const t = useTheme();
	const from = mix(tint, t.name === 'night' ? 18 : 13, t.surface);
	return (
		<View
			style={{
				flexDirection: 'row',
				gap: 12,
				backgroundColor: t.surface,
				borderRadius: radius.md,
				padding: 16,
				borderWidth: hair,
				borderColor: alpha(tint, t.name === 'night' ? 0.34 : 0.28),
				overflow: 'hidden'
			}}
		>
			<LuminousBg from={from} to={t.surface} borderRadius={radius.md} />
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

const stepEase = Easing.bezier(0.16, 1, 0.3, 1);
const stepEntrance = FadeInDown.duration(550).easing(stepEase)
	.withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] })
	.reduceMotion(ReduceMotion.System);
const stepProgressTiming = { duration: 400, easing: stepEase, reduceMotion: ReduceMotion.System };

function Steps({ title, intro, steps, hue, onStepReveal }: { title: string; intro?: string; steps: { title: string; html: string }[]; hue: HueSet; onStepReveal?: RevealStep }) {
	const t = useTheme();
	const [shown, setShown] = useState(1);
	const pendingScroll = useRef<number | null>(null);
	const newestStep = useRef<View>(null);
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
			<View>
				{steps.slice(0, shown).map((s, i) => (
					<Animated.View key={i} entering={stepEntrance} style={{ flexDirection: 'row', gap: 12, paddingVertical: 14, borderTopWidth: hair, borderStyle: 'dashed', borderColor: t.line }}
						ref={i === shown - 1 ? newestStep : undefined} collapsable={false}
						onLayout={i === shown - 1 ? () => {
							if (pendingScroll.current !== i || !newestStep.current) return;
							pendingScroll.current = null;
							onStepReveal?.(newestStep.current);
						} : undefined}>
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
			<View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: hair, borderStyle: 'dashed', borderColor: t.line }}>
				<View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, flexGrow: 1 }}>
					{steps.map((_, i) => (
						<StepDot key={i} shown={i < shown} activeColor={hue.base} inactiveColor={t.line2} />
					))}
				</View>
				{!all ? (
					<>
						<SmallBtn label="Show all" onPress={() => { pendingScroll.current = null; setShown(steps.length); }} />
						<SmallBtn label="Next step" strong hue={hue} icon={<ChevronRight size={16} color={hue.ink} />} onPress={() => {
							pendingScroll.current = shown;
							setShown(shown + 1);
						}} />
					</>
				) : (
					<>
						<T v="bodyStrong" color={hue.ink}>That’s the whole thing</T>
						<SmallBtn label="Replay" icon={<RotateCcw size={14} color={t.fg2} />} onPress={() => { pendingScroll.current = null; setShown(1); }} />
					</>
				)}
			</View>
		</Box>
	);
}

function StepDot({ shown, activeColor, inactiveColor }: { shown: boolean; activeColor: string; inactiveColor: string }) {
	const style = useAnimatedStyle(() => ({
		width: withTiming(shown ? 18 : 8, stepProgressTiming),
		backgroundColor: withTiming(shown ? activeColor : inactiveColor, stepProgressTiming)
	}));
	return <Animated.View style={[{ height: 8, borderRadius: 4 }, style]} />;
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

function Code({ lang, code, html, caption, hue }: { lang: string; code: string; html?: string; caption?: string; hue: HueSet }) {
	const t = useTheme();
	const [copied, setCopied] = useState(false);
	const runs = useMemo(() => highlightCode(code.replace(/^\n+|\s+$/g, ''), lang, html ? parse(html) : undefined), [code, lang, html]);
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
					<Text selectable style={{ fontFamily: fonts.mono, fontSize: 13, lineHeight: 20, color: t.fg }}>
						<CodeRuns runs={runs} palette={t} />
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
					<Eye hue={hue}>Explanation</Eye>
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
