// The plan: same plan as the website, bought through the App Store / Google
// Play (RevenueCat). The server's `access` is the truth; after a purchase we
// wait for the store webhook to reach the server.
import { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from 'urql';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { BILLING } from '../lib/api/queries';
import type { Access, Plan, Subscription } from '../lib/api/types';
import { gql, errorText } from '../lib/api/client';
import { purchases, type StoreOffer } from '../lib/purchases';
import { daysLeft } from '../lib/study/trial';
import { shortDate } from '../lib/study/ids';
import { alpha, fonts, useTheme } from '../lib/theme';
import { Button, Card, ErrorBox, Eyebrow, Loading, Pill, T, TopGlow } from '../components/ui';
import { TopBar } from '../components/TopBar';

type Billing = { trialDays: number; plans: Plan[]; access: Access; subscription: Subscription | null };

const PERKS = [
	'Every lesson, quiz, flashcard deck and practice set',
	'In every course, including new ones as they’re written',
	'Focus mode, study plan and exam countdown'
];

export default function PlanScreen() {
	const t = useTheme();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [{ data, error, fetching }, refetch] = useQuery<Billing>({ query: BILLING, requestPolicy: 'cache-and-network' });
	const [offer, setOffer] = useState<StoreOffer | null>(null);
	const [loadingOffer, setLoadingOffer] = useState(purchases.available);
	const [busy, setBusy] = useState<'' | 'buy' | 'restore'>('');
	const [msg, setMsg] = useState('');

	useEffect(() => {
		purchases
			.monthly()
			.then(setOffer)
			.finally(() => setLoadingOffer(false));
	}, []);

	/** The store webhook usually lands within seconds; check for up to ~30 s. */
	const waitForAccess = async () => {
		for (let i = 0; i < 15; i++) {
			const d = await gql<{ access: Access }>(`query A { access { hasAccess until source } }`).catch(() => null);
			if (d?.access.hasAccess && d.access.source !== 'trial') return true;
			await new Promise((r) => setTimeout(r, 2000));
		}
		return false;
	};

	const buy = async () => {
		if (!offer) return;
		setBusy('buy');
		setMsg('');
		try {
			const ok = await purchases.buy(offer);
			if (!ok) return;
			const live = await waitForAccess();
			refetch({ requestPolicy: 'network-only' });
			setMsg(live ? 'Your Study plan is active.' : 'Payment received. Your Study plan will activate shortly.');
		} catch (e) {
			setMsg(errorText(e));
		} finally {
			setBusy('');
		}
	};
	const restore = async () => {
		setBusy('restore');
		setMsg('');
		try {
			const found = await purchases.restore();
			if (!found) setMsg('No purchase found for this store account.');
			else {
				const live = await waitForAccess();
				refetch({ requestPolicy: 'network-only' });
				setMsg(live ? 'Restored. Everything is open.' : 'Found your purchase. It will switch on in a minute.');
			}
		} catch (e) {
			setMsg(errorText(e));
		} finally {
			setBusy('');
		}
	};
	const manage = async () => {
		const url = (await purchases.manageUrl()) ?? (Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions');
		Linking.openURL(url);
	};

	if (!data && fetching) return <Loading />;
	const access = data?.access;
	const sub = data?.subscription;
	const trial = access?.source === 'trial';
	const left = daysLeft(access?.until);
	const store = sub && (sub.method === 'app_store' || sub.method === 'play_store');
	const paid = access?.hasAccess && !trial;

	return (
		<View style={{ flex: 1, backgroundColor: t.bg }}>
			<TopGlow color={t.amber} height={300} strength={t.name === 'night' ? 0.2 : 0.1} />
			<ScrollView
				contentContainerStyle={{
					paddingHorizontal: 22,
					paddingTop: Platform.OS === 'ios' ? insets.top + 12 : insets.top + 12,
					paddingBottom: insets.bottom + 40,
					gap: 18,
					maxWidth: 560,
					width: '100%',
					alignSelf: 'center'
				}}
			>
				<TopBar backLabel="Close" onBack={() => router.back()} showProfile={false} />

				<View style={{ gap: 6 }}>
					<Eyebrow>Kushi Study Pass</Eyebrow>
					<T v="display" style={{ fontSize: 26, lineHeight: 34 }}>
						{paid ? 'You have the full plan.' : trial ? 'You’re on your free trial.' : 'One plan. Every course.'}
					</T>
				</View>

				{error && !data ? <ErrorBox message={errorText(error)} onRetry={() => refetch({ requestPolicy: 'network-only' })} /> : null}

				<Card tint={t.amber} tintStrength={t.name === 'night' ? 14 : 9} style={{ gap: 16, borderRadius: 24, borderColor: alpha(t.amber, 0.55), borderWidth: 1.5, padding: 20 }}>
					<View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
						<Text style={{ fontFamily: fonts.display, fontSize: 34, color: t.fg, letterSpacing: -1 }}>
							{offer?.price ?? (loadingOffer ? '…' : 'Monthly')}
						</Text>
						{offer ? <T v="small">/ month</T> : null}
					</View>

					<View style={{ gap: 12 }}>
						{PERKS.map((p) => (
							<View key={p} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
								<View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.successSoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
									<Check size={13} color={t.success} strokeWidth={2.5} />
								</View>
								<T style={{ flex: 1 }}>{p}</T>
							</View>
						))}
					</View>

					{access?.hasAccess ? (
						<View style={{ gap: 6, paddingTop: 4 }}>
							<Pill label={trial ? 'Trial' : 'Active'} tone="good" />
							<T v="small">
								{trial
									? `${left} day${left === 1 ? '' : 's'} left: everything is open until ${shortDate(access.until!)}. Subscribe any time; your paid month starts when the trial ends.`
									: access.source === 'grant'
										? `Free access from the Kushi team until ${shortDate(access.until!)}.`
										: access.source === 'staff'
											? 'Staff access.'
											: sub?.cancelAtPeriodEnd || !sub
												? `Paid until ${shortDate(access.until ?? sub!.currentPeriodEnd)}.`
												: store
													? `Renews on ${shortDate(sub.currentPeriodEnd)} through ${sub.method === 'app_store' ? 'the App Store' : 'Google Play'}.`
													: `Paid until ${shortDate(access.until ?? sub.currentPeriodEnd)}.`}
							</T>
						</View>
					) : (
						<Pill label="Expired" tone="bad" />
					)}
				</Card>

				{msg ? <T v="bodyStrong" color={t.accent}>{msg}</T> : null}

				{paid ? (
					store ? <Button kind="solid" title="Manage subscription" onPress={manage} style={{ borderRadius: 16 }} /> : null
				) : purchases.available ? (
					<View style={{ gap: 10 }}>
						<Button title={offer ? `Subscribe for ${offer.price} a month` : 'Subscribe'} onPress={buy} busy={busy === 'buy'} disabled={!offer || !!busy} style={{ borderRadius: 16 }} />
						<Button kind="solid" title="Restore purchases" onPress={restore} busy={busy === 'restore'} disabled={!!busy} style={{ borderRadius: 16 }} />
						{!offer && !loadingOffer ? <T v="small">The store isn’t answering. Check your connection and try again.</T> : null}
						<T v="small" style={{ textAlign: 'center' }}>
							Renews monthly until you cancel. Cancel any time in your {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} subscriptions.
						</T>
					</View>
				) : (
					<Card style={{ gap: 6 }}>
						<T v="bodyStrong">In-app subscriptions are coming soon.</T>
						<T v="small">Your plan follows your account, so anything active on your account opens everything here too.</T>
					</Card>
				)}

				<View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
					<Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.muted }} onPress={() => Linking.openURL('https://kushi.ng/terms')}>
						Terms
					</Text>
					<Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.muted }} onPress={() => Linking.openURL('https://kushi.ng/privacy')}>
						Privacy
					</Text>
				</View>
			</ScrollView>
		</View>
	);
}
