// You: profile, look, devices, plan, sign out and delete account.
import { useState } from 'react';
import { Alert, Linking, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'urql';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { ChevronRight, Gift, LogOut, Monitor, Moon, Smartphone, Sun, Upload, Lightbulb } from 'lucide-react-native';
import { ACCOUNT, BILLING, SIGN_OUT_DEVICE } from '../../lib/api/queries';
import type { Access, Device } from '../../lib/api/types';
import { WEB_URL, errorText, gql } from '../../lib/api/client';
import { useSession } from '../../lib/session';
import { unregisterPush } from '../../lib/services';
import { useThemeChoice, fonts, radius, useTheme, type ThemeChoice } from '../../lib/theme';
import { daysLeft } from '../../lib/study/trial';
import { Button, Card, Eyebrow, Pill, Press, Screen, T, hair } from '../../components/ui';

export default function Account() {
	const t = useTheme();
	const router = useRouter();
	const user = useSession((s) => s.user);
	const { choice, set: setChoice } = useThemeChoice();
	const [{ data }, refetch] = useQuery<{ devices: Device[] }>({ query: ACCOUNT, requestPolicy: 'cache-and-network' });
	const [{ data: bd }] = useQuery<{ access: Access }>({ query: BILLING, requestPolicy: 'cache-and-network' });
	const [, signOutDevice] = useMutation(SIGN_OUT_DEVICE);
	const [deleting, setDeleting] = useState(false);
	const [confirm, setConfirm] = useState('');
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState('');

	const access = bd?.access;
	const planLine = !access ? '' : !access.hasAccess ? 'Expired' : access.source === 'trial' ? `Trial · ${daysLeft(access.until)} days left` : access.source === 'staff' ? 'Staff' : 'Active';

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

	const removeDevice = (d: Device) =>
		Alert.alert('Sign out this device?', d.label, [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Sign out',
				style: 'destructive',
				onPress: async () => {
					await signOutDevice({ id: d.id });
					refetch({ requestPolicy: 'network-only' });
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
		<Screen>
			<Eyebrow>Account</Eyebrow>
			<Animated.View entering={FadeInDown.springify().damping(18)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
				<View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
					<Text style={{ fontFamily: fonts.display, fontSize: 24, color: t.accent }}>{(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}</Text>
				</View>
				<View style={{ flex: 1 }}>
					<T v="title" numberOfLines={1}>
						{user?.name || 'Student'}
					</T>
					<T v="small" numberOfLines={1}>
						{user?.email}
					</T>
				</View>
			</Animated.View>

			<View style={{ gap: 14 }}>
				<Card padded={false}>
					<Row label="Department and level" value={[user?.department?.name, user?.level?.name].filter(Boolean).join(' · ') || 'Not set'} onPress={() => router.push('/onboarding')} />
					<Row label="Plan" value={planLine} onPress={() => router.push('/plan')} last />
				</Card>

				<Section title="Look">
					<View style={{ flexDirection: 'row', gap: 8 }}>
						{looks.map(({ id, label, Icon }) => {
							const on = choice === id;
							return (
								<Press
									key={id}
									haptic
									onPress={() => setChoice(id)}
									accessibilityRole="radio"
									accessibilityState={{ selected: on }}
									style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: radius.md, backgroundColor: on ? t.accentSoft : t.surface, borderWidth: on ? 1.5 : hair, borderColor: on ? t.accent : t.line }}
								>
									<Icon size={20} color={on ? t.accent : t.fg2} />
									<Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: on ? t.accent : t.fg2 }}>{label}</Text>
								</Press>
							);
						})}
					</View>
				</Section>

				<Section title="Devices">
					<T v="small" style={{ marginBottom: 8 }}>
						You can be signed in on two devices at once.
					</T>
					<Card padded={false}>
						{(data?.devices ?? []).map((d, i, all) => (
							<Animated.View key={d.id} layout={LinearTransition} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: i < all.length - 1 ? hair : 0, borderColor: t.line }}>
								<Smartphone size={18} color={t.fg2} />
								<View style={{ flex: 1 }}>
									<T v="bodyStrong" numberOfLines={1}>
										{d.label}
									</T>
									<T v="small">{d.current ? 'This device' : `Last used ${new Date(d.lastUsedAt).toLocaleDateString()}`}</T>
								</View>
								{d.current ? <Pill label="Current" tone="accent" /> : <Button small kind="ghost" title="Sign out" onPress={() => removeDevice(d)} />}
							</Animated.View>
						))}
					</Card>
				</Section>

				<Section title="More on the website">
					<Card padded={false}>
						<Row icon={<Gift size={18} color={t.amber} />} label="Invite friends" value="Earn when they pay" onPress={() => Linking.openURL(`${WEB_URL}/invite`)} />
						<Row icon={<Upload size={18} color={t.amber} />} label="Send course material" onPress={() => Linking.openURL(`${WEB_URL}/contribute`)} />
						<Row icon={<Lightbulb size={18} color={t.amber} />} label="Request a course" onPress={() => Linking.openURL(`${WEB_URL}/request`)} last />
					</Card>
				</Section>

				<Button kind="solid" title="Sign out" icon={<LogOut size={18} color={t.fg} />} onPress={signOut} />

				<Animated.View layout={LinearTransition} style={{ marginTop: 10 }}>
					{deleting ? (
						<Card style={{ gap: 10, borderColor: t.danger }}>
							<T v="h3" color={t.danger}>
								Delete your account
							</T>
							<T v="small">This removes your progress, plans and devices for good. It can’t be undone. A store subscription has to be cancelled in the App Store or Google Play as well.</T>
							<T v="small">Type your email to confirm.</T>
							<TextInput
								value={confirm}
								onChangeText={setConfirm}
								autoCapitalize="none"
								autoCorrect={false}
								keyboardType="email-address"
								placeholder={user?.email}
								placeholderTextColor={t.muted}
								style={{ height: 48, borderRadius: 12, borderWidth: hair, borderColor: t.line2, paddingHorizontal: 14, color: t.fg, fontFamily: fonts.body, fontSize: 15, backgroundColor: t.bg }}
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
			</View>
		</Screen>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<View style={{ marginTop: 8 }}>
			<T v="label" style={{ marginBottom: 8 }}>
				{title}
			</T>
			{children}
		</View>
	);
}

function Row({ label, value, onPress, last, icon }: { label: string; value?: string; onPress: () => void; last?: boolean; icon?: React.ReactNode }) {
	const t = useTheme();
	return (
		<Press onPress={onPress} scaleTo={0.99} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: last ? 0 : hair, borderColor: t.line }}>
			{icon}
			<View style={{ flex: 1 }}>
				<T v="bodyStrong">{label}</T>
				{value ? <T v="small">{value}</T> : null}
			</View>
			<ChevronRight size={18} color={t.muted} />
		</Press>
	);
}
