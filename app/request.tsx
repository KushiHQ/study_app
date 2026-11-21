import { useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from 'urql';
import { CheckCircle2 } from 'lucide-react-native';
import { AccountField, AccountPage } from '../components/AccountPage';
import { Button, Card, Chip, ErrorBox, T } from '../components/ui';
import { DEPARTMENTS_LEVELS, REQUEST_COURSE } from '../lib/api/queries';
import { errorText, gql } from '../lib/api/client';
import type { Department, Level } from '../lib/api/types';
import { useSession } from '../lib/session';
import { useTheme } from '../lib/theme';

export default function RequestCourse() {
	const t = useTheme();
	const user = useSession((state) => state.user);
	const { title: suggested } = useLocalSearchParams<{ title?: string }>();
	const [{ data, fetching, error: optionsError }, reload] = useQuery<{ departments: Department[]; levels: Level[] }>({ query: DEPARTMENTS_LEVELS });
	const [title, setTitle] = useState(suggested?.slice(0, 160) ?? '');
	const [school, setSchool] = useState(user?.school ?? '');
	const [code, setCode] = useState('');
	const [department, setDepartment] = useState(user?.department?.id ?? '');
	const [other, setOther] = useState('');
	const [level, setLevel] = useState(user?.level?.code ?? '');
	const [note, setNote] = useState('');
	const [sent, setSent] = useState('');
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);
	const sending = useRef(false);

	const submit = async () => {
		const courseTitle = title.trim();
		if (sending.current || !courseTitle || (department === 'other' && !other.trim())) return;
		sending.current = true;
		setBusy(true);
		setError('');
		try {
			const result = await gql<{ requestCourse: boolean }>(REQUEST_COURSE, { input: {
				courseTitle, school: school.trim() || null, schoolCode: code.trim() || null,
				departmentId: department === 'other' ? null : department || null, departmentText: department === 'other' ? other.trim() : null,
				levelCode: level || null, note: note.trim() || null
			} });
			if (!result.requestCourse) throw new Error('The request could not be sent. Try again.');
			setSent(courseTitle);
		} catch (e) {
			setError(errorText(e));
		} finally {
			sending.current = false;
			setBusy(false);
		}
	};
	return (
		<AccountPage title="Request a course" description="Tell us what you’re studying. We’ll email you when the course is ready.">
			{sent ? (
				<Card style={{ gap: 10 }}>
					<CheckCircle2 size={24} color={t.success} />
					<T v="h2">Request sent</T>
					<T>{sent}</T>
					<Button kind="ghost" title="Request another course" onPress={() => { setSent(''); setTitle(''); setCode(''); setNote(''); }} />
				</Card>
			) : (
				<Card style={{ gap: 14 }}>
					<AccountField label="Course title" value={title} onChangeText={setTitle} placeholder="e.g. Human Physiology II" maxLength={160} />
					<AccountField label="Your school’s course code (optional)" value={code} onChangeText={setCode} placeholder="e.g. PHS 202" maxLength={30} />
					<AccountField label="School (optional)" value={school} onChangeText={setSchool} maxLength={80} />
					<T v="bodyStrong">Department</T>
					{optionsError ? <ErrorBox message={errorText(optionsError)} onRetry={() => reload({ requestPolicy: 'network-only' })} /> : null}
					{fetching && !data ? <T v="small">Loading departments and levels…</T> : null}
					<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
						{(data?.departments ?? []).map((item) => <Chip key={item.id} label={item.name} active={department === item.id} onPress={() => setDepartment(department === item.id ? '' : item.id)} />)}
						<Chip label="Other" active={department === 'other'} onPress={() => setDepartment(department === 'other' ? '' : 'other')} />
					</View>
					{department === 'other' ? <AccountField label="Department name" value={other} onChangeText={setOther} maxLength={80} /> : null}
					{data?.levels?.length ? (
						<>
							<T v="bodyStrong">Level</T>
							<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
								{data.levels.map((item) => <Chip key={item.code} label={item.name} active={level === item.code} onPress={() => setLevel(level === item.code ? '' : item.code)} />)}
							</View>
						</>
					) : null}
					<AccountField label="Anything else? (optional)" value={note} onChangeText={setNote} multiline maxLength={1000} />
					{error ? <ErrorBox message={error} /> : null}
					<Button title="Send request" busy={busy} disabled={!title.trim() || (department === 'other' && !other.trim())} onPress={() => void submit()} />
				</Card>
			)}
		</AccountPage>
	);
}
