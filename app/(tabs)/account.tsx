import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from 'urql';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { ChevronRight, CreditCard, Gift, Lightbulb, LogOut, Minus, Monitor, Moon, Plus, Sun, Upload } from 'lucide-react-native';
import { BILLING, DEPARTMENTS_LEVELS, UPDATE_PROFILE } from '../../lib/api/queries';
import type { Access, Department, Level, User } from '../../lib/api/types';
import { errorText, gql } from '../../lib/api/client';
import { useSession } from '../../lib/session';
import { unregisterPush } from '../../lib/services';
import { useStudyPrefs, type AnimSpeed } from '../../lib/prefs';
import { alpha, fonts, mix, radius, useTheme, useThemeChoice, type ThemeChoice } from '../../lib/theme';
import { daysLeft } from '../../lib/study/trial';
import { Html } from '../../components/Html';
import {
	Button,
	Card,
	Eyebrow,
	FieldInput,
	InfoTip,
	LuminousBg,
	Press,
	Reveal,
	Screen,
	SelectField,
	T,
	ToggleSwitch,
	hair
} from '../../components/ui';

const SPEEDS: { value: AnimSpeed; label: string }[] = [
	{ value: 0.75, label: '0.75×' },
	{ value: 1, label: '1×' },
	{ value: 1.5, label: '1.5×' }
];

export default function Account() {
	const t = useTheme();
	const router = useRouter();
	const user = useSession((s) => s.user);
	const { choice, set: setChoice } = useThemeChoice();
	const { animSpeed, setAnimSpeed, textScale, setTextScale, sounds, setSounds } = useStudyPrefs();

	const [{ data: bd }] = useQuery<{ access: Access }>({ query: BILLING, requestPolicy: 'cache-and-network' });
	const [{ data: dl }] = useQuery<{ departments: Department[]; levels: Level[] }>({ query: DEPARTMENTS_LEVELS, requestPolicy: 'cache-first' });

	const [name, setName] = useState(user?.name ?? '');
	const [school, setSchool] = useState(user?.school ?? '');
	const [departmentId, setDepartmentId] = useState<string | null>(user?.department?.id ?? null);
	const [levelCode, setLevelCode] = useState<string | null>(user?.level?.code ?? null);
	const [isTeacher, setIsTeacher] = useState(!!user?.isTeacher);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [profileErr, setProfileErr] = useState('');

	useEffect(() => {
		setName(user?.name ?? '');
		setSchool(user?.school ?? '');
		setDepartmentId(user?.department?.id ?? null);
		setLevelCode(user?.level?.code ?? null);
		setIsTeacher(!!user?.isTeacher);
	}, [user?.id, user?.name, user?.school, user?.department?.id, user?.level?.code, user?.isTeacher]);

	const [deleting, setDeleting] = useState(false);
	const [confirm, setConfirm] = useState('');
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState('');

	const access = bd?.access;
	const planLine = !access
		? ''
		: !access.hasAccess
			? 'Expired'
			: access.source === 'trial'
				? `Trial · ${daysLeft(access.until)} days left`
				: access.source === 'staff'
					? 'Staff'
					: 'Active';

	const deptOptions = (dl?.departments ?? []).map((d) => ({ value: d.id, label: d.name }));
	const levelOptions = (dl?.levels ?? []).map((l) => ({ value: l.code, label: l.name }));

	const saveProfile = async () => {
		setSaving(true);
		setSaved(false);
		setProfileErr('');
		try {
			const res = await gql<{ updateProfile: User }>(UPDATE_PROFILE, {
				name: name.trim() || null,
				departmentId,
				levelCode,
				school: school.trim() || null,
				isTeacher
			});
			if (res.updateProfile) useSession.setState({ user: res.updateProfile });
			setSaved(true);
		} catch (e) {
			setProfileErr(errorText(e));
		} finally {
			setSaving(false);
		}
	};

	const signOut = () =>
		Alert.alert('Sign out?', 'Your progress is saved to your account.', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Sign out',
				style: 'destructive',
				onPress: async () => {
					await unregisterPush();
					await useSession.getState().signOut(true);
				}
			}
		]);

	const deleteAccount = async () => {
		setBusy(true);
		setErr('');
		try {
			await unregisterPush();
			await gql(`mutation Delete($c: String!) { deleteAccount(confirm: $c) }`, { c: confirm.trim() });
			await useSession.getState().signOut(false);
		} catch (e) {
			setErr(errorText(e));
		} finally {
			setBusy(false);
		}
	};

	const looks: { id: ThemeChoice; label: string; Icon: typeof Sun }[] = [
		{ id: 'system', label: 'Auto', Icon: Monitor },
		{ id: 'day', label: 'Day', Icon: Sun },
		{ id: 'night', label: 'Night', Icon: Moon }
	];

	return (
		<Screen contentContainerStyle={{ gap: 16 }}>
			<View>
				<Eyebrow>Settings</Eyebrow>
				<Reveal style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
					<View
						style={{
							width: 54,
							height: 54,
							borderRadius: 27,
							backgroundColor: t.accentSoft,
							borderWidth: hair,
							borderColor: alpha(t.amber, 0.4),
							alignItems: 'center',
							justifyContent: 'center'
						}}
					>
						<Text style={{ fontFamily: fonts.display, fontSize: 22, color: t.accent }}>
							{(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
						</Text>
					</View>
					<View style={{ flex: 1 }}>
						<T v="title" numberOfLines={1}>
							{user?.name || 'Student'}
						</T>
						<T v="small" numberOfLines={1}>
							{user?.email}
						</T>
					</View>
				</Reveal>
			</View>

			{/* Profile */}
			<Card style={{ gap: 14 }}>
				<T v="h3">Profile</T>
				<FieldInput label="Name" value={name} onChangeText={setName} maxLength={60} autoComplete="name" placeholder="Your name" />
				<View style={{ flexDirection: 'row', gap: 10 }}>
					<SelectField label="Department" value={departmentId} options={deptOptions} onChange={setDepartmentId} />
					<SelectField label="Level" value={levelCode} options={levelOptions} onChange={setLevelCode} />
				</View>
				<FieldInput label="School" value={school} onChangeText={setSchool} maxLength={80} placeholder="Your university or college" />
				<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 2 }}>
					<ToggleSwitch value={isTeacher} onChange={setIsTeacher} label="I teach" />
					<Button small title={saving ? 'Saving…' : 'Save profile'} busy={saving} onPress={saveProfile} />
				</View>
				{profileErr ? <T v="small" color={t.danger}>{profileErr}</T> : null}
				{saved ? <T v="small" color={t.success}>Saved</T> : null}
			</Card>

			{/* Look & reading */}
			<Card style={{ gap: 0 }}>
				<T v="h3" style={{ marginBottom: 8 }}>Look and reading</T>

				{/* Theme */}
				<View style={{ paddingVertical: 12, gap: 10 }}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
						<T v="bodyStrong">Theme</T>
						<InfoTip text="Auto follows your phone's light or dark setting. Bright Day is light; Fresh Night is dark." label="Theme info" />
					</View>
					<View style={{ flexDirection: 'row', padding: 3, borderRadius: radius.pill, backgroundColor: t.bg2, borderWidth: hair, borderColor: t.line2 }}>
						{looks.map(({ id, label, Icon }) => {
							const on = choice === id;
							return (
								<Press
									key={id}
									haptic
									onPress={() => setChoice(id)}
									accessibilityRole="radio"
									accessibilityState={{ selected: on }}
									style={{
										flex: 1,
										height: 36,
										borderRadius: radius.pill,
										flexDirection: 'row',
										alignItems: 'center',
										justifyContent: 'center',
										gap: 6,
										backgroundColor: on ? t.fg : 'transparent'
									}}
								>
									<Icon size={15} color={on ? t.bg : t.fg2} />
									<Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: on ? t.bg : t.fg2 }}>{label}</Text>
								</Press>
							);
						})}
					</View>
				</View>

				{/* Sounds */}
				<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: hair, borderColor: t.line }}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
						<T v="bodyStrong">Sounds</T>
						<InfoTip text="Chimes for right answers and finished lessons on this device." label="Sounds info" />
					</View>
					<ToggleSwitch value={sounds} onChange={setSounds} />
				</View>

				{/* Animation speed */}
				<View style={{ paddingVertical: 12, gap: 10, borderTopWidth: hair, borderColor: t.line }}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
						<T v="bodyStrong">Animation speed</T>
						<InfoTip text="Playback speed for step-by-step diagrams and algorithm traces." label="Animation speed info" />
					</View>
					<View style={{ flexDirection: 'row', padding: 3, borderRadius: radius.pill, backgroundColor: t.bg2, borderWidth: hair, borderColor: t.line2 }}>
						{SPEEDS.map((sp) => {
							const on = animSpeed === sp.value;
							return (
								<Press
									key={sp.value}
									haptic
									onPress={() => setAnimSpeed(sp.value)}
									accessibilityRole="radio"
									accessibilityState={{ selected: on }}
									style={{
										flex: 1,
										height: 36,
										borderRadius: radius.pill,
										alignItems: 'center',
										justifyContent: 'center',
										backgroundColor: on ? t.amber : 'transparent',
										overflow: 'hidden'
									}}
								>
									<Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: on ? t.onAmber : t.fg2 }}>{sp.label}</Text>
								</Press>
							);
						})}
					</View>
				</View>

				{/* Text size */}
				<View style={{ paddingTop: 12, gap: 12, borderTopWidth: hair, borderColor: t.line }}>
					<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
						<T v="bodyStrong">Text size</T>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
							<Press
								haptic
								disabled={textScale <= 0.9}
								accessibilityLabel="Smaller text"
								onPress={() => setTextScale(textScale - 0.05)}
								style={{
									width: 34,
									height: 34,
									borderRadius: 17,
									borderWidth: hair,
									borderColor: t.line2,
									backgroundColor: t.surface2,
									alignItems: 'center',
									justifyContent: 'center',
									opacity: textScale <= 0.9 ? 0.35 : 1
								}}
							>
								<Minus size={15} color={t.fg} />
							</Press>
							<Text style={{ fontFamily: fonts.mono, fontSize: 14, color: t.fg, minWidth: 44, textAlign: 'center' }}>
								{Math.round(textScale * 100)}%
							</Text>
							<Press
								haptic
								disabled={textScale >= 1.3}
								accessibilityLabel="Larger text"
								onPress={() => setTextScale(textScale + 0.05)}
								style={{
									width: 34,
									height: 34,
									borderRadius: 17,
									borderWidth: hair,
									borderColor: t.line2,
									backgroundColor: t.surface2,
									alignItems: 'center',
									justifyContent: 'center',
									opacity: textScale >= 1.3 ? 0.35 : 1
								}}
							>
								<Plus size={15} color={t.fg} />
							</Press>
						</View>
					</View>
					<View style={{ padding: 14, borderRadius: 14, backgroundColor: t.bg, borderWidth: hair, borderColor: t.line2 }}>
						<Html html={'Preview of lesson text. <span class="hl">Key definitions stand out</span>, and maths like $x^2 + 1$ sits inline.'} style={{ fontSize: 16, lineHeight: 25 }} />
					</View>
				</View>
			</Card>

			{/* Plan & community */}
			<Card padded={false}>
				<Row icon={<CreditCard size={18} color={t.amber} />} label="Billing & subscription" value={planLine || undefined} onPress={() => router.push('/plan')} />
				<Row icon={<Gift size={18} color={t.amber} />} label="Invite friends & wallet" onPress={() => router.push('/invite')} />
				<Row icon={<Upload size={18} color={t.amber} />} label="Send course material" onPress={() => router.push('/contribute')} />
				<Row icon={<Lightbulb size={18} color={t.amber} />} label="Request a course" onPress={() => router.push('/request')} last />
			</Card>

			<Button kind="solid" title="Sign out" icon={<LogOut size={18} color={t.danger} />} onPress={signOut} />

			<Animated.View layout={LinearTransition} style={{ marginTop: 4 }}>
				{deleting ? (
					<Card tint={t.danger} tintStrength={12} style={{ gap: 10 }}>
						<T v="h3" color={t.danger}>
							Delete your account
						</T>
						<T v="small">This permanently removes your account, study progress and plans. Cancel any active subscription in the App Store or Google Play as well.</T>
						<FieldInput
							label="Type your email to confirm"
							value={confirm}
							onChangeText={setConfirm}
							autoCapitalize="none"
							autoCorrect={false}
							keyboardType="email-address"
							placeholder={user?.email}
						/>
						{err ? <T v="small" color={t.danger}>{err}</T> : null}
						<View style={{ flexDirection: 'row', gap: 8 }}>
							<Button small kind="ghost" title="Cancel" onPress={() => setDeleting(false)} style={{ flex: 1 }} />
							<Button small kind="danger" title="Delete" busy={busy} disabled={confirm.trim().toLowerCase() !== (user?.email ?? '').toLowerCase()} onPress={deleteAccount} style={{ flex: 1 }} />
						</View>
					</Card>
				) : (
					<Text onPress={() => setDeleting(true)} style={{ textAlign: 'center', fontFamily: fonts.bodyMedium, fontSize: 14, color: t.danger, padding: 10 }}>
						Delete account
					</Text>
				)}
			</Animated.View>
		</Screen>
	);
}

function Row({ label, value, onPress, last, icon }: { label: string; value?: string; onPress: () => void; last?: boolean; icon?: React.ReactNode }) {
	const t = useTheme();
	return (
		<Press onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: last ? 0 : hair, borderColor: t.line }}>
			{icon}
			<View style={{ flex: 1 }}>
				<T v="bodyStrong">{label}</T>
				{value ? <T v="small">{value}</T> : null}
			</View>
			<ChevronRight size={18} color={t.muted} />
		</Press>
	);
}
