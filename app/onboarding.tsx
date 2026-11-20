// Onboarding: department and level, kept short (web /onboarding).
import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from 'urql';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { gql, errorText } from '../lib/api/client';
import { LEVELS_FOR, UPDATE_PROFILE } from '../lib/api/queries';
import type { Department, Level, User } from '../lib/api/types';
import { useSession } from '../lib/session';
import { useTheme } from '../lib/theme';
import { Button, Chip, ErrorBox, Eyebrow, Loading, Screen, T } from '../components/ui';

export default function Onboarding() {
	const t = useTheme();
	const router = useRouter();
	const user = useSession((s) => s.user);
	const [dept, setDept] = useState<Department | null>(user?.department ?? null);
	const [level, setLevel] = useState<string | null>(user?.level?.code ?? null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [{ data: d1, fetching, error: e1 }, again] = useQuery<{ departments: Department[] }>({ query: `query Depts { departments { id slug name courseCount } }` });
	const [{ data: d2 }] = useQuery<{ levels: Level[] }>({ query: LEVELS_FOR, variables: { d: dept?.slug ?? null }, pause: !dept });

	const save = async () => {
		if (!dept || !level) return;
		setBusy(true);
		setError('');
		try {
			const r = await gql<{ updateProfile: User }>(UPDATE_PROFILE, { departmentId: dept.id, levelCode: level });
			useSession.getState().setUser(r.updateProfile);
			router.replace('/');
		} catch (e) {
			setError(errorText(e));
		} finally {
			setBusy(false);
		}
	};

	if (fetching && !d1) return <Loading />;
	return (
		<Screen>
			<Animated.View entering={FadeInDown.duration(500)} style={{ gap: 8, marginBottom: 20, marginTop: 20 }}>
				<Eyebrow>Welcome</Eyebrow>
				<T v="display">What do you study?</T>
				<T>We'll put your department's courses first. You can still open any course.</T>
			</Animated.View>
			{e1 ? <ErrorBox message={errorText(e1)} onRetry={() => again({ requestPolicy: 'network-only' })} /> : null}
			<T v="label" style={{ marginBottom: 10 }}>
				Department
			</T>
			<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
				{(d1?.departments ?? []).map((d) => (
					<Chip key={d.id} label={d.name} active={dept?.id === d.id} onPress={() => (setDept(d), setLevel(null))} />
				))}
			</View>
			{dept ? (
				<Animated.View entering={FadeInDown} style={{ marginTop: 24 }}>
					<T v="label" style={{ marginBottom: 10 }}>
						Level
					</T>
					<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
						{(d2?.levels ?? []).map((l) => (
							<Chip key={l.code} label={l.name} active={level === l.code} onPress={() => setLevel(l.code)} />
						))}
					</View>
				</Animated.View>
			) : null}
			{error ? <T color={t.danger} style={{ marginTop: 12 }}>{error}</T> : null}
			<View style={{ marginTop: 28, gap: 10 }}>
				<Button title="Show me my courses" onPress={save} busy={busy} disabled={!dept || !level} />
				<Button kind="ghost" title="Skip for now" onPress={() => router.replace('/')} />
			</View>
		</Screen>
	);
}
