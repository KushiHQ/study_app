// One question, graded locally using the same response format as the website.
import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { ArrowDown, ArrowUp, Check, Flag, X } from 'lucide-react-native';
import type { Question } from '../lib/api/types';
import { useStudyPrefs } from '../lib/prefs';
import { alpha, fonts, useTheme, type HueSet } from '../lib/theme';
import { Html } from './Html';
import { Button, Card, Press, T, hair } from './ui';

const CORRECT_SOUND = require('../assets/sounds/correct.mp3');
const WRONG_SOUND = require('../assets/sounds/wrong.mp3');

const LETTERS = 'ABCDEFGH';

function shuffle(a: number[]) {
	const out = [...a];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	if (out.length > 1 && out.every((v, i) => v === i)) [out[0], out[1]] = [out[1], out[0]];
	return out;
}

export function QuestionCard({
	q,
	hue,
	number,
	onAnswer,
	onReport,
	hideWhy
}: {
	q: Question;
	hue: HueSet;
	number?: string;
	onAnswer?: (correct: boolean, response: unknown) => void;
	onReport?: () => void;
	/** quizzes show explanations at the end */
	hideWhy?: boolean;
}) {
	const t = useTheme();
	const sounds = useStudyPrefs((s) => s.sounds);
	const feedbackPlayer = useAudioPlayer(null);
	const [picked, setPicked] = useState<number | null>(null);
	const [chosen, setChosen] = useState<number[]>([]);
	const [typed, setTyped] = useState('');
	const [order, setOrder] = useState<number[]>([]);
	const [done, setDone] = useState(false);
	const [correct, setCorrect] = useState(false);

	useEffect(() => {
		setPicked(null);
		setChosen([]);
		setTyped('');
		setDone(false);
		setCorrect(false);
		if (q.type === 'order') setOrder(shuffle(q.items.map((_, i) => i)));
	}, [q.id]);

	const finish = (ok: boolean, response: unknown) => {
		setDone(true);
		setCorrect(ok);
		if (ok) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
		} else {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
		}
		if (sounds) {
			void (async () => {
				try {
					await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' });
					feedbackPlayer.replace(ok ? CORRECT_SOUND : WRONG_SOUND);
					feedbackPlayer.play();
				} catch {
					/* audio unavailable */
				}
			})();
		}
		onAnswer?.(ok, response);
	};

	const msg = correct ? 'Spot on.' : "Good try. Here's why.";
	const optStyle = (state: 'idle' | 'right' | 'wrong' | 'dim' | 'on') => ({
		flexDirection: 'row' as const,
		alignItems: 'center' as const,
		gap: 12,
		padding: 14,
		borderRadius: 16,
		borderWidth: state === 'idle' || state === 'dim' ? hair : 1.5,
		borderColor: state === 'right' ? t.success : state === 'wrong' ? t.danger : state === 'on' ? hue.base : t.line2,
		backgroundColor: state === 'right' ? alpha(t.success, 0.14) : state === 'wrong' ? alpha(t.danger, 0.14) : state === 'on' ? hue.wash : t.surface,
		opacity: state === 'dim' ? 0.52 : 1
	});
	const badge = (i: number, state: 'idle' | 'right' | 'wrong' | 'dim' | 'on', square = false) => (
		<View
			style={{
				width: 28,
				height: 28,
				borderRadius: square ? 8 : 14,
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: state === 'right' ? alpha(t.success, 0.24) : state === 'wrong' ? alpha(t.danger, 0.24) : state === 'on' ? hue.base : t.surface2
			}}
		>
			<Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: state === 'right' ? t.success : state === 'wrong' ? t.danger : state === 'on' ? t.onHue : t.muted }}>
				{LETTERS[i]}
			</Text>
		</View>
	);

	return (
		<View style={{ gap: 14 }}>
			<View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
				{number ? (
					<View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.amber, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
						<Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: t.onAmber }}>{number.replace(/\.$/, '')}</Text>
					</View>
				) : null}
				<View style={{ flex: 1 }}>
					<Html html={q.prompt} hue={hue} style={{ fontFamily: fonts.readBold, fontSize: 17, lineHeight: 25 }} />
				</View>
				{onReport ? (
					<Press onPress={onReport} hitSlop={10} accessibilityLabel="Report a problem with this question">
						<Flag size={16} color={t.muted} />
					</Press>
				) : null}
			</View>

			{q.type === 'single' ? (
				<View style={{ gap: 10 }}>
					{q.options.map((o, i) => {
						const st = done ? (i === q.answer ? 'right' : picked === i ? 'wrong' : 'dim') : 'idle';
						return (
							<Press key={i} haptic={!done} disabled={done} onPress={() => (setPicked(i), finish(i === q.answer, { choice: i }))} accessibilityRole="button" style={optStyle(st)}>
								{badge(i, st)}
								<View style={{ flex: 1 }}>
									<Html html={o} hue={hue} style={{ fontSize: 15.5, lineHeight: 22, color: st === 'right' ? t.success : st === 'dim' ? t.muted : t.fg }} />
								</View>
								{st === 'right' ? (
									<View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.success, alignItems: 'center', justifyContent: 'center' }}>
										<Check size={13} color={t.onHue} strokeWidth={2.6} />
									</View>
								) : st === 'wrong' ? (
									<View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.danger, alignItems: 'center', justifyContent: 'center' }}>
										<X size={13} color="#fff" strokeWidth={2.6} />
									</View>
								) : null}
							</Press>
						);
					})}
				</View>
			) : null}

			{q.type === 'multi' ? (
				<View style={{ gap: 8 }}>
					<T v="small">Select all correct answers.</T>
					{q.options.map((o, i) => {
						const on = chosen.includes(i);
						const st = done ? (q.answers.includes(i) ? 'right' : on ? 'wrong' : 'dim') : on ? 'on' : 'idle';
						return (
							<Press key={i} haptic disabled={done} onPress={() => setChosen(on ? chosen.filter((x) => x !== i) : [...chosen, i].sort((a, b) => a - b))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={optStyle(st)}>
								{badge(i, st, true)}
								<View style={{ flex: 1 }}>
									<Html html={o} hue={hue} style={{ fontSize: 16, lineHeight: 23 }} />
								</View>
							</Press>
						);
					})}
					{!done ? (
						<Button
							kind="hue"
							hue={hue}
							title="Check"
							disabled={!chosen.length}
							onPress={() => {
								const want = [...q.answers].sort((a, b) => a - b);
								finish(want.length === chosen.length && want.every((v, i) => v === chosen[i]), { choices: chosen });
							}}
						/>
					) : null}
				</View>
			) : null}

			{q.type === 'numeric' ? (
				<View style={{ gap: 8 }}>
					<View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
						<TextInput
							value={typed}
							onChangeText={setTyped}
							editable={!done}
							keyboardType="numbers-and-punctuation"
							placeholder="Your answer"
							placeholderTextColor={t.muted}
							style={{ flex: 1, height: 52, borderRadius: 14, borderWidth: done ? 1.8 : hair, borderColor: done ? (correct ? t.success : t.danger) : t.line2, backgroundColor: t.surface, paddingHorizontal: 14, fontFamily: fonts.mono, fontSize: 17, color: t.fg }}
						/>
						{q.unit ? <T>{q.unit}</T> : null}
					</View>
					{!done ? (
						<Button
							kind="hue"
							hue={hue}
							title="Check"
							disabled={!typed.trim()}
							onPress={() => {
								const v = Number(typed.replace(/,/g, '').trim());
								if (!Number.isFinite(v)) return;
								finish(Math.abs(v - q.answer) <= (q.tolerance ?? 0) + 1e-9, { value: v });
							}}
						/>
					) : !correct ? (
						<T>
							The answer is <Text style={{ fontFamily: fonts.mono, color: t.fg }}>{q.answer}</Text>
							{q.unit ? ` ${q.unit}` : ''}.
						</T>
					) : null}
				</View>
			) : null}

			{q.type === 'order' ? (
				<View style={{ gap: 8 }}>
					<T v="small">Put these in the right order. Use the arrows to move them.</T>
					{order.map((item, pos) => {
						const st = done ? (item === pos ? 'right' : 'wrong') : 'idle';
						return (
							<Animated.View key={item} layout={LinearTransition.duration(140)} style={optStyle(st)}>
								<Text style={{ fontFamily: fonts.readHeavy, width: 20, color: hue.ink }}>{pos + 1}</Text>
								<View style={{ flex: 1 }}>
									<Html html={q.items[item]} hue={hue} style={{ fontSize: 16, lineHeight: 23 }} />
								</View>
								{!done ? (
									<View style={{ gap: 4 }}>
										<Press haptic onPress={() => move(pos, -1)} disabled={pos === 0} hitSlop={6} accessibilityLabel="Move up" style={{ opacity: pos === 0 ? 0.3 : 1 }}>
											<ArrowUp size={18} color={t.fg2} />
										</Press>
										<Press haptic onPress={() => move(pos, 1)} disabled={pos === order.length - 1} hitSlop={6} accessibilityLabel="Move down" style={{ opacity: pos === order.length - 1 ? 0.3 : 1 }}>
											<ArrowDown size={18} color={t.fg2} />
										</Press>
									</View>
								) : null}
							</Animated.View>
						);
					})}
					{!done ? <Button kind="hue" hue={hue} title="Check" onPress={() => finish(order.every((v, i) => v === i), { order })} /> : null}
				</View>
			) : null}

			{done && !hideWhy ? (
				<Animated.View entering={FadeIn.duration(160)} style={{ backgroundColor: correct ? t.successSoft : hue.wash, borderRadius: 14, padding: 14, gap: 4 }}>
					<Text style={{ fontFamily: fonts.readHeavy, fontSize: 15, color: correct ? t.success : t.fg }}>{msg}</Text>
					<Html html={q.why} hue={hue} style={{ fontSize: 15, lineHeight: 23 }} />
				</Animated.View>
			) : null}
		</View>
	);

	function move(pos: number, by: number) {
		const to = pos + by;
		if (to < 0 || to >= order.length) return;
		const next = [...order];
		[next[pos], next[to]] = [next[to], next[pos]];
		setOrder(next);
	}
}
