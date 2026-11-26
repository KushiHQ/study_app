// A lesson diagram (matches study_web_app Diagram.svelte):
// Tap any part to inspect it; diagrams with steps get a full player with Play/Pause, Back/Next,
// tappable segmented scrubber track with live animated progress fill, step counter, inline speed pill,
// and smoothly cross-fading active step note card. Zero Android layout crash risk.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react-native';
import { alpha, fonts, mix, radius, useTheme, type HueSet } from '../../lib/theme';
import { useStudyPrefs, type AnimSpeed } from '../../lib/prefs';
import { Html } from '../Html';
import { InfoTip, LuminousBg, Press, hair } from '../ui';
import { SvgTree } from '../SvgTree';

type Note = { title: string; html: string };
const SPEEDS: AnimSpeed[] = [1, 1.5, 0.75];
const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);

export function Diagram({ svg, caption, parts = [], steps = [], hue, width, autoplay }: { svg: string; caption: string; parts?: (Note & { id: string })[]; steps?: Note[]; hue: HueSet; width: number; autoplay?: boolean }) {
	const t = useTheme();
	const animSpeed = useStudyPrefs((s) => s.animSpeed);
	const setAnimSpeed = useStudyPrefs((s) => s.setAnimSpeed);
	const byId = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts]);
	const [active, setActive] = useState<string | null>(null);
	const [cur, setCur] = useState(-1);
	const [playing, setPlaying] = useState(false);
	const interacted = useRef(false);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const last = steps.length - 1;
	const stepDurationMs = Math.round(2600 / animSpeed);

	const segFill = useSharedValue(1);
	const noteOp = useSharedValue(1);
	const noteY = useSharedValue(0);

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

	useEffect(() => {
		noteOp.value = 0.35;
		noteY.value = 4;
		const raf = requestAnimationFrame(() => {
			noteOp.value = withTiming(1, { duration: 160, easing: EASE_OUT, reduceMotion: ReduceMotion.Never });
			noteY.value = withTiming(0, { duration: 160, easing: EASE_OUT, reduceMotion: ReduceMotion.Never });
		});
		return () => cancelAnimationFrame(raf);
	}, [cur, noteOp, noteY]);

	const segFillStyle = useAnimatedStyle(() => ({ width: `${segFill.value * 100}%` }));
	const noteStyle = useAnimatedStyle(() => ({ opacity: noteOp.value, transform: [{ translateY: noteY.value }] }));

	useEffect(() => {
		if (!autoplay || interacted.current) return;
		interacted.current = true;
		setCur(0);
		setPlaying(last > 0);
	}, [autoplay, last]);

	useEffect(() => {
		if (!playing) return;
		if (cur >= last) {
			setPlaying(false);
			return;
		}
		timer.current = setTimeout(() => setCur((c) => Math.min(last, c + 1)), stepDurationMs);
		return () => clearTimeout(timer.current);
	}, [playing, cur, last, stepDurationMs]);

	const go = (n: number) => {
		interacted.current = true;
		setPlaying(false);
		setCur(Math.max(0, Math.min(last, n)));
		Haptics.selectionAsync().catch(() => {});
	};
	const cycleSpeed = () => {
		Haptics.selectionAsync().catch(() => {});
		setAnimSpeed(SPEEDS[(SPEEDS.indexOf(animSpeed) + 1) % SPEEDS.length]);
	};

	const shown = cur < 0 ? last : cur;
	const note = active ? byId.get(active) : null;

	return (
		<View
			style={{
				position: 'relative',
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

			<View style={{ alignItems: 'center' }}>
				<SvgTree
					svg={svg}
					hue={hue}
					maxWidth={Math.max(1, width - 28 - 2 * hair)}
					step={steps.length ? { cur, last } : undefined}
					activePart={active}
					onPart={
						parts.length
							? (id) => {
									Haptics.selectionAsync().catch(() => {});
									setActive((a) => (a === id ? null : byId.has(id) ? id : null));
								}
							: undefined
					}
				/>
			</View>

			{parts.length ? (
				<View style={{ position: 'absolute', top: 8, right: 8 }}>
					<InfoTip text="Tap any highlighted part of this diagram to inspect it." label="Interactive diagram hint" />
				</View>
			) : null}

			{note ? (
				<View style={{ backgroundColor: hue.wash, borderRadius: 14, padding: 12, gap: 4, borderLeftWidth: 3, borderLeftColor: hue.base }}>
					<Text style={{ fontFamily: fonts.readHeavy, fontSize: 15, color: hue.ink }}>{note.title}</Text>
					{note.html ? <Html html={note.html} hue={hue} style={{ fontSize: 15, lineHeight: 23 }} /> : null}
				</View>
			) : null}

			{steps.length ? (
				<View style={{ gap: 10 }}>
					{/* Web-parity controls: Play/Pause, Back, animated scrubber track, Next, counter, speed */}
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
						<Ctl
							label={playing ? 'Pause' : 'Play'}
							strong
							hue={hue}
							onPress={() => {
								interacted.current = true;
								if (playing) return setPlaying(false);
								if (cur < 0 || cur >= last) setCur(0);
								setPlaying(true);
							}}
						>
							{playing ? <Pause size={15} color={t.onHue} /> : <Play size={15} color={t.onHue} />}
						</Ctl>
						<Ctl label="Back" onPress={() => go(shown - 1)} disabled={shown <= 0}>
							<ChevronLeft size={16} color={t.fg2} />
						</Ctl>

						<View style={{ flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
							{steps.map((s, i) => {
								const isNow = i === shown && cur >= 0;
								const isDone = i < shown || (cur < 0 && i <= shown);
								return (
									<Press
										key={i}
										onPress={() => go(i)}
										hitSlop={{ top: 12, bottom: 12, left: 2, right: 2 }}
										accessibilityRole="button"
										accessibilityLabel={`Step ${i + 1}: ${s.title}`}
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

						<Ctl label="Next" onPress={() => go(cur < 0 ? 0 : shown + 1)} disabled={cur >= last}>
							<ChevronRight size={16} color={t.fg2} />
						</Ctl>

						<Text style={{ fontFamily: fonts.mono, fontSize: 11, color: t.muted, minWidth: 28, textAlign: 'right' }}>
							{shown + 1}/{steps.length}
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

					{/* Smoothly cross-fading Active Step Note Card */}
					{steps[shown] ? (
						<Animated.View
							collapsable={false}
							style={[
								{
									backgroundColor: t.surface2,
									borderRadius: 12,
									padding: 12,
									gap: 3,
									borderLeftWidth: 3,
									borderLeftColor: hue.base
								},
								noteStyle
							]}
						>
							<Text style={{ fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 0.9, textTransform: 'uppercase', color: hue.ink }}>
								Step {shown + 1} · {steps[shown].title.replace(/<[^>]+>/g, '')}
							</Text>
							{steps[shown].html ? <Html html={steps[shown].html} hue={hue} style={{ fontSize: 14.5, lineHeight: 22 }} /> : null}
						</Animated.View>
					) : null}
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

function Ctl({ children, onPress, label, strong, hue, disabled }: { children: React.ReactNode; onPress: () => void; label: string; strong?: boolean; hue?: HueSet; disabled?: boolean }) {
	const t = useTheme();
	return (
		<Press
			onPress={onPress}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityLabel={label}
			style={{
				width: 34,
				height: 34,
				borderRadius: 17,
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: strong ? (hue?.base ?? t.amber) : t.surface2,
				borderWidth: strong ? 0 : hair,
				borderColor: t.line2,
				opacity: disabled ? 0.35 : 1
			}}
		>
			{children}
		</Press>
	);
}
