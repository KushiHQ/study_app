import { useRef, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from 'urql';
import { AccountField, AccountPage } from '../components/AccountPage';
import { Button, Card, ErrorBox, Pill, Press, T, hair } from '../components/ui';
import { APPLY_REFERRAL, BANKS, CANCEL_WITHDRAWAL, REFERRALS, REQUEST_WITHDRAWAL, SET_PAYOUT_ACCOUNT } from '../lib/api/queries';
import { errorText, gql } from '../lib/api/client';
import type { BankOption, Referrals } from '../lib/api/types';
import { naira, shortDate } from '../lib/study/ids';
import { useTheme } from '../lib/theme';

export default function InviteFriends() {
	const t = useTheme();
	const [{ data, fetching, error: loadError }, reload] = useQuery<{ referrals: Referrals }>({ query: REFERRALS, requestPolicy: 'cache-and-network' });
	const [editingBank, setEditingBank] = useState(false);
	const [{ data: banksData, fetching: banksLoading, error: banksError }, reloadBanks] = useQuery<{ banks: BankOption[] }>({ query: BANKS, pause: !editingBank });
	const [bankSearch, setBankSearch] = useState('');
	const [bank, setBank] = useState<BankOption | null>(null);
	const [accountNumber, setAccountNumber] = useState('');
	const [amount, setAmount] = useState('');
	const [withdrawReview, setWithdrawReview] = useState<number | null>(null);
	const [referralCode, setReferralCode] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');
	const active = useRef(false);
	const r = data?.referrals;

	const perform = async (action: () => Promise<unknown>, success: string, onSuccess?: () => void) => {
		if (active.current) return;
		active.current = true;
		setError('');
		setMessage('');
		setBusy(true);
		try {
			await action();
			onSuccess?.();
			setMessage(success);
			reload({ requestPolicy: 'network-only' });
		} catch (e) {
			setError(errorText(e));
		} finally {
			active.current = false;
			setBusy(false);
		}
	};

	const copy = async () => {
		if (!r?.link) return;
		try {
			if (!await Clipboard.setStringAsync(r.link)) throw new Error('The invite link could not be copied.');
			setError('');
			setMessage('Invite link copied.');
		} catch (e) {
			setError(errorText(e));
		}
	};

	const reviewWithdrawal = () => {
		if (!r?.payoutAccount || active.current) return;
		const input = amount.replace(/[₦,\s]/g, '');
		const proposed = input && /^\d+(\.\d{1,2})?$/.test(input) ? Math.round(Number(input) * 100) : input ? NaN : r.balanceKobo;
		if (!Number.isSafeInteger(proposed) || proposed < r.minWithdrawalKobo || proposed > r.balanceKobo) {
			setError(`Enter an amount from ${naira(r.minWithdrawalKobo)} to ${naira(r.balanceKobo)}.`);
			return;
		}
		setError('');
		setWithdrawReview(proposed);
	};
	const matchedBanks = (banksData?.banks ?? []).filter((item) => item.name.toLowerCase().includes(bankSearch.trim().toLowerCase()));

	return (
		<AccountPage title="Invite friends" description="Share your link, see who joined, and manage your referral rewards.">
			{!r && fetching ? <T>Loading your referrals…</T> : null}
			{loadError && !r ? <ErrorBox message={errorText(loadError)} onRetry={() => reload({ requestPolicy: 'network-only' })} /> : null}
			{error ? <ErrorBox message={error} /> : null}
			{message ? <T v="bodyStrong" color={t.success} accessibilityLiveRegion="polite">{message}</T> : null}
			{r ? (
				<>
					{r.enabled ? (
						<Card style={{ gap: 10, backgroundColor: t.accentSoft }}>
							<T v="h2">Your invite link</T>
							<T>Earn {r.rewardBps / 100}% of qualifying payments from friends who join using your link.</T>
							<T selectable color={t.accent}>{r.link}</T>
							<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
								<Button small title="Copy link" onPress={() => void copy()} />
								{Platform.OS !== 'web' ? <Button small kind="ghost" title="Share link" onPress={() => void Share.share({ message: r.link }).catch((e) => setError(errorText(e)))} /> : null}
							</View>
						</Card>
					) : <T>New referral rewards are currently paused.</T>}
					<Card style={{ gap: 10 }}>
						<T v="h2">Rewards wallet</T>
						<T v="display" color={t.accent}>{naira(r.balanceKobo)}</T>
						<T v="small">Available · {r.invitedCount} joined · {r.paidCount} paid</T>
						{r.pendingWithdrawalKobo > 0 ? <T v="small">Pending withdrawal: {naira(r.pendingWithdrawalKobo)}</T> : null}
						<T v="small">Minimum withdrawal: {naira(r.minWithdrawalKobo)}</T>
						{r.payoutAccount ? <T v="bodyStrong">{r.payoutAccount.bankName} ••{r.payoutAccount.accountLast4} · {r.payoutAccount.accountName}</T> : null}
						<Button kind="ghost" small title={editingBank ? 'Close bank form' : r.payoutAccount ? 'Change payout account' : 'Add payout account'} disabled={busy || withdrawReview !== null} onPress={() => {
							setEditingBank(!editingBank); setBank(null); setBankSearch(''); setAccountNumber('');
						}} />
						{editingBank ? (
							<View style={{ gap: 9 }}>
								<AccountField label="Search banks" value={bankSearch} onChangeText={setBankSearch} />
								{banksError ? <ErrorBox message={errorText(banksError)} onRetry={() => reloadBanks({ requestPolicy: 'network-only' })} /> : null}
								{banksLoading ? <T v="small">Loading banks…</T> : null}
								{matchedBanks.slice(0, 12).map((item) => (
									<Press key={item.code} accessibilityRole="radio" accessibilityState={{ checked: bank?.code === item.code }} onPress={() => setBank(item)}
										style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderBottomWidth: hair, borderColor: t.line, backgroundColor: bank?.code === item.code ? t.accentSoft : undefined }}>
										<T>{item.name}</T>
									</Press>
								))}
								{matchedBanks.length > 12 ? <T v="small">Search to see more banks.</T> : null}
								{!matchedBanks.length && !banksLoading && !banksError ? <T v="small">No banks found.</T> : null}
								{bank ? <T v="bodyStrong">Selected bank: {bank.name}</T> : null}
								<AccountField label="Account number" value={accountNumber} onChangeText={(value) => setAccountNumber(value.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={10} />
								<Button title="Save payout account" busy={busy} disabled={!bank || accountNumber.length !== 10} onPress={() => void perform(
									() => gql(SET_PAYOUT_ACCOUNT, { bank: bank?.code, number: accountNumber }), 'Payout account saved.',
									() => { setEditingBank(false); setAccountNumber(''); }
								)} />
							</View>
						) : null}
						{r.payoutAccount && r.balanceKobo >= r.minWithdrawalKobo && !editingBank ? (
							withdrawReview === null ? (
								<View style={{ gap: 8 }}>
									<AccountField label="Withdrawal amount in naira" placeholder="Leave blank for the full balance" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
									<Button title="Review withdrawal" disabled={busy} onPress={reviewWithdrawal} />
								</View>
							) : (
								<View style={{ gap: 8 }}>
									<T>Withdraw {naira(withdrawReview)} to {r.payoutAccount.bankName} ••{r.payoutAccount.accountLast4}?</T>
									<Button title="Confirm withdrawal" busy={busy} onPress={() => void perform(
										() => gql(REQUEST_WITHDRAWAL, { amount: withdrawReview }), 'Withdrawal requested.',
										() => { setWithdrawReview(null); setAmount(''); }
									)} />
									<Button kind="ghost" title="Go back" disabled={busy} onPress={() => setWithdrawReview(null)} />
								</View>
							)
						) : null}
						{r.withdrawals.map((item) => (
							<View key={item.id} style={{ gap: 5, paddingTop: 12, borderTopWidth: hair, borderColor: t.line }}>
								<T v="bodyStrong">{naira(item.amountKobo)} · {item.bankName} ••{item.accountLast4}</T>
								<T v="small">{shortDate(item.createdAt)}</T>
								<Pill label={item.status} tone={item.status === 'paid' ? 'good' : 'muted'} />
								{item.note ? <T v="small">{item.note}</T> : null}
								{item.status === 'pending' ? <Button small kind="ghost" title="Cancel withdrawal" disabled={busy} onPress={() => void perform(
									() => gql(CANCEL_WITHDRAWAL, { id: item.id }), 'Withdrawal cancelled.'
								)} /> : null}
							</View>
						))}
					</Card>
					{r.people.length ? <Card style={{ gap: 9 }}>
						<T v="h2">People you invited</T>
						{r.people.map((item) => <View key={`${item.joinedAt}-${item.name}`} style={{ gap: 3 }}>
							<T v="bodyStrong">{item.name}</T><T v="small">{item.status} · {shortDate(item.joinedAt)}{item.rewardKobo === null ? '' : ` · ${naira(item.rewardKobo)}`}</T>
						</View>)}
					</Card> : null}
					{r.entries.length ? <Card style={{ gap: 9 }}>
						<T v="h2">Wallet activity</T>
						{r.entries.map((item) => <View key={item.id} style={{ gap: 3 }}>
							<T v="bodyStrong">{naira(item.amountKobo)} · {item.note || item.kind.replace(/_/g, ' ')}</T>
							<T v="small">{shortDate(item.createdAt)}</T>
						</View>)}
					</Card> : null}
					{r.referredBy ? <T v="small">You joined with an invite from {r.referredBy}.</T> : null}
					{r.canApplyCode ? <Card style={{ gap: 10 }}>
						<T v="h2">Have an invite code?</T>
						<AccountField label="Invite code" value={referralCode} onChangeText={setReferralCode} autoCapitalize="characters" />
						<Button title="Apply code" disabled={!referralCode.trim() || busy} onPress={() => void perform(() => gql(APPLY_REFERRAL, { code: referralCode.trim() }), 'Invite code applied.', () => setReferralCode(''))} />
					</Card> : null}
				</>
			) : null}
		</AccountPage>
	);
}
