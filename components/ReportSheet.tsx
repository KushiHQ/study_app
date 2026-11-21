// Report a problem with a lesson part or question (web ReportDialog).
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gql, errorText } from '../lib/api/client';
import { FEEDBACK } from '../lib/api/queries';
import type { FeedbackKind } from '../lib/api/types';
import { fonts, radius, useTheme } from '../lib/theme';
import { Button, Chip, T, hair } from './ui';

export interface ReportTarget {
	courseSlug: string;
	lessonId?: string;
	blockKey?: string;
	questionId?: string;
	what: string;
}

const KINDS: { kind: FeedbackKind; label: string }[] = [
	{ kind: 'wrong', label: "It's wrong" },
	{ kind: 'unclear', label: 'Hard to follow' },
	{ kind: 'typo', label: 'Typo' },
	{ kind: 'missing', label: 'Something missing' },
	{ kind: 'other', label: 'Other' }
];

export function ReportSheet({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
	const t = useTheme();
	const insets = useSafeAreaInsets();
	const [kind, setKind] = useState<FeedbackKind>('wrong');
	const [note, setNote] = useState('');
	const [busy, setBusy] = useState(false);
	const [sent, setSent] = useState(false);
	const [err, setErr] = useState('');
	const close = () => {
		setSent(false);
		setNote('');
		setErr('');
		onClose();
	};
	const send = async () => {
		if (!target) return;
		setBusy(true);
		setErr('');
		try {
			await gql(FEEDBACK, { input: { courseSlug: target.courseSlug, lessonId: target.lessonId ?? null, blockKey: target.blockKey ?? null, questionId: target.questionId ?? null, quotedText: null, kind, note: note.trim() } });
			setSent(true);
		} catch (e) {
			setErr(errorText(e));
		} finally {
			setBusy(false);
		}
	};
	return (
		<Modal visible={!!target} transparent animationType="fade" onRequestClose={close}>
			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
				<Pressable onPress={close} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} />
				<Animated.View entering={SlideInDown.duration(180)} style={{ backgroundColor: t.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20, paddingBottom: insets.bottom + 20, gap: 14 }}>
					{sent ? (
						<>
							<T v="h2">Thank you.</T>
							<T>Thanks for helping us improve this course.</T>
							<Button title="Done" onPress={close} />
						</>
					) : (
						<>
							<T v="h2">Report a problem with {target?.what ?? 'this part'}</T>
							<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
								{KINDS.map((k) => (
									<Chip key={k.kind} label={k.label} active={kind === k.kind} onPress={() => setKind(k.kind)} />
								))}
							</View>
							<TextInput
								value={note}
								onChangeText={setNote}
								placeholder="What's the problem? (a sentence is enough)"
								placeholderTextColor={t.muted}
								multiline
								style={{ minHeight: 90, borderRadius: 14, borderWidth: hair, borderColor: t.line2, padding: 12, fontFamily: fonts.body, fontSize: 15, color: t.fg, textAlignVertical: 'top', backgroundColor: t.bg }}
							/>
							{err ? <T color={t.danger}>{err}</T> : null}
							<Button title="Send report" onPress={send} busy={busy} disabled={note.trim().length < 3} />
						</>
					)}
				</Animated.View>
			</KeyboardAvoidingView>
		</Modal>
	);
}
