import { useRef, useState } from 'react';
import { View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery } from 'urql';
import { Paperclip, Upload } from 'lucide-react-native';
import { AccountField, AccountPage } from '../components/AccountPage';
import { Button, Card, Chip, ErrorBox, Meter, Pill, T, hair } from '../components/ui';
import { CONTRIBUTIONS, LEVELS_FOR, SUBMIT_MATERIAL } from '../lib/api/queries';
import { errorText, gql } from '../lib/api/client';
import type { Level } from '../lib/api/types';
import { MAX_FILES, MAX_TOTAL, selectedFile, uploadMaterialFile, type SelectedFile } from '../lib/materialUpload';
import { useSession } from '../lib/session';
import { shortDate } from '../lib/study/ids';
import { useTheme } from '../lib/theme';

const KINDS = [
	['timetable', 'Timetable or course list'],
	['course_material', 'Notes, slides or handout'],
	['past_questions', 'Past questions'],
	['other', 'Other']
] as const;
const STATUS = { new: 'Pending', useful: 'Approved', not_useful: 'Rejected' } as const;

type Contributions = {
	reward: { credits: number };
	balance: number;
	submissions: { id: string; courseTitle: string; status: keyof typeof STATUS; staffNote: string | null; fileCount: number; createdAt: string; credits: number | null }[];
	entries: { id: string; kind: string; amount: number; note: string | null; createdAt: string }[];
};

export default function ContributeMaterial() {
	const t = useTheme();
	const user = useSession((state) => state.user);
	const [{ data, error: historyError }, reload] = useQuery<{ contributions: Contributions }>({ query: CONTRIBUTIONS, requestPolicy: 'cache-and-network' });
	const [{ data: levels }] = useQuery<{ levels: Level[] }>({ query: LEVELS_FOR, variables: { d: null } });
	const [title, setTitle] = useState('');
	const [code, setCode] = useState('');
	const [school, setSchool] = useState(user?.school ?? '');
	const [department, setDepartment] = useState(user?.department?.name ?? '');
	const [level, setLevel] = useState(user?.level?.code ?? '');
	const [kinds, setKinds] = useState<string[]>([]);
	const [note, setNote] = useState('');
	const [files, setFiles] = useState<SelectedFile[]>([]);
	const [progress, setProgress] = useState<{ name: string; fraction: number } | null>(null);
	const [error, setError] = useState('');
	const [sent, setSent] = useState(false);
	const [busy, setBusy] = useState(false);
	const active = useRef(false);

	const pick = async () => {
		if (active.current) return;
		setError('');
		try {
			const selected = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, base64: false });
			if (selected.canceled) return;
			const next = [...files];
			let total = next.reduce((sum, item) => sum + item.size, 0);
			for (const asset of selected.assets) {
				try {
					const file = selectedFile(asset);
					if (next.some((item) => item.key === file.key)) continue;
					if (next.length >= MAX_FILES || total + file.size > MAX_TOTAL) {
						setError('You can attach up to 20 files and 200 MB per submission.');
						break;
					}
					next.push(file);
					total += file.size;
				} catch (e) {
					setError(errorText(e));
				}
			}
			setFiles(next);
		} catch (e) {
			setError(errorText(e));
		}
	};

	const submit = async () => {
		const courseTitle = title.trim();
		if (active.current || !courseTitle || !files.length) return;
		active.current = true;
		setError('');
		setSent(false);
		setBusy(true);
		try {
			const uploaded = [];
			for (const file of files) {
				let driveId = file.driveId;
				if (!driveId) {
					setProgress({ name: file.asset.name, fraction: 0 });
					driveId = await uploadMaterialFile(file, [code.trim(), courseTitle].filter(Boolean).join(' '), (bytes) => {
						setProgress({ name: file.asset.name, fraction: bytes / file.size });
					});
					const savedId = driveId;
					setFiles((items) => items.map((item) => item.key === file.key ? { ...item, driveId: savedId } : item));
				}
				uploaded.push({ driveId, name: file.asset.name.slice(0, 200), size: file.size, mime: file.asset.mimeType ?? null });
			}
			setProgress(null);
			const result = await gql<{ submitMaterial: string }>(SUBMIT_MATERIAL, { input: {
				courseTitle, courseCode: code.trim() || null, departmentText: department.trim() || null,
				school: school.trim() || null, levelCode: level || null, note: note.trim() || null, kinds, files: uploaded
			} });
			if (!result.submitMaterial) throw new Error('The submission could not be saved. Try again.');
			setSent(true);
			setFiles([]);
			setTitle('');
			setCode('');
			setNote('');
			setKinds([]);
			reload({ requestPolicy: 'network-only' });
		} catch (e) {
			setError(errorText(e));
		} finally {
			active.current = false;
			setProgress(null);
			setBusy(false);
		}
	};

	const history = data?.contributions;
	return (
		<AccountPage title="Send course material" description="Send notes, slides, a timetable, or past questions to help us write your course.">
			{history ? <Card style={{ gap: 4, backgroundColor: t.accentSoft }}>
				<T v="h2">{history.balance.toLocaleString('en-NG')} credits</T>
				<T v="small">Earn {history.reward.credits.toLocaleString('en-NG')} credits when material for a course is approved.</T>
			</Card> : null}
			{sent ? <Card style={{ gap: 8 }}><T v="h2" color={t.success}>Material sent</T><T>You can check the review status below.</T></Card> : null}
			<Card style={{ gap: 14 }}>
				<AccountField label="Course title" value={title} onChangeText={setTitle} maxLength={160} editable={!busy} />
				<AccountField label="Course code (optional)" value={code} onChangeText={setCode} maxLength={12} editable={!busy} />
				<AccountField label="School (optional)" value={school} onChangeText={setSchool} maxLength={120} editable={!busy} />
				<AccountField label="Department (optional)" value={department} onChangeText={setDepartment} maxLength={120} editable={!busy} />
				{levels?.levels?.length ? <View style={{ gap: 7 }}>
					<T v="bodyStrong">Level</T>
					<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
						{levels.levels.map((item) => <Chip key={item.code} label={item.name} active={level === item.code} onPress={() => { if (!active.current) setLevel(level === item.code ? '' : item.code); }} />)}
					</View>
				</View> : null}
				<T v="bodyStrong">Material type</T>
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
					{KINDS.map(([value, label]) => <Chip key={value} label={label} active={kinds.includes(value)} onPress={() => {
						if (!active.current) setKinds((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
					}} />)}
				</View>
				<AccountField label="Notes (optional)" value={note} onChangeText={setNote} multiline maxLength={1000} editable={!busy} />
				<Button small kind="ghost" title="Attach files" icon={<Paperclip size={17} color={t.fg} />} disabled={busy} onPress={() => void pick()} />
				{files.map((file) => (
					<View key={file.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, borderBottomWidth: hair, borderColor: t.line, paddingVertical: 6 }}>
						<View style={{ flex: 1 }}>
							<T v="bodyStrong" numberOfLines={2}>{file.asset.name}</T>
							<T v="small">{file.driveId ? 'Uploaded' : `${Math.max(1, Math.round(file.size / 1024))} KB`}</T>
						</View>
						<Button kind="ghost" small title="Remove" disabled={busy} onPress={() => setFiles((items) => items.filter((item) => item.key !== file.key))} />
					</View>
				))}
				{progress ? <View style={{ gap: 5 }}><T v="small" numberOfLines={1}>Uploading {progress.name}</T><Meter value={progress.fraction} /></View> : null}
				{error ? <ErrorBox message={error} /> : null}
				<Button title="Send material" icon={<Upload size={17} color={t.onAmber} />} busy={busy} disabled={!files.length || !title.trim()} onPress={() => void submit()} />
			</Card>
			{historyError && !history ? <ErrorBox message={errorText(historyError)} onRetry={() => reload({ requestPolicy: 'network-only' })} /> : null}
			{history?.submissions.length ? <Card style={{ gap: 12 }}>
				<T v="h2">Submission history</T>
				{history.submissions.map((item) => <View key={item.id} style={{ gap: 4, borderTopWidth: hair, borderColor: t.line, paddingTop: 9 }}>
					<T v="bodyStrong">{item.courseTitle}</T>
					<T v="small">{shortDate(item.createdAt)} · {item.fileCount} {item.fileCount === 1 ? 'file' : 'files'}</T>
					<Pill label={STATUS[item.status]} tone={item.status === 'useful' ? 'good' : item.status === 'not_useful' ? 'bad' : 'muted'} />
					{item.credits ? <T v="small">{item.credits.toLocaleString('en-NG')} credits earned</T> : null}
					{item.staffNote ? <T v="small">{item.staffNote}</T> : null}
				</View>)}
			</Card> : null}
			{history?.entries.length ? <Card style={{ gap: 10 }}>
				<T v="h2">Credit activity</T>
				{history.entries.map((item) => <View key={item.id} style={{ gap: 3 }}>
					<T v="bodyStrong">{item.amount > 0 ? '+' : ''}{item.amount.toLocaleString('en-NG')} credits</T>
					<T v="small">{item.note || item.kind.replace(/_/g, ' ')} · {shortDate(item.createdAt)}</T>
				</View>)}
			</Card> : null}
		</AccountPage>
	);
}
