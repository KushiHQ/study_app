// App Store / Google Play subscription through RevenueCat. RevenueCat's
// app_user_id is our user id, and its webhook tells study_server, which writes
// the subscription (method app_store / play_store). Access itself always comes
// from the server's `access` query, never from the store SDK alone.
import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

const KEY = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_RC_IOS_KEY : Platform.OS === 'android' ? process.env.EXPO_PUBLIC_RC_ANDROID_KEY : undefined;
let configured = false;

function ensure(): boolean {
	if (!KEY || Platform.OS === 'web') return false;
	if (!configured) {
		try {
			Purchases.configure({ apiKey: KEY });
			configured = true;
		} catch {
			return false;
		}
	}
	return true;
}

export interface StoreOffer {
	pkg: PurchasesPackage;
	/** the store's localised price, e.g. "₦3,500.00" */
	price: string;
	title: string;
}

export const purchases = {
	/** True when store purchases are set up in this build. */
	get available() {
		return !!KEY && Platform.OS !== 'web';
	},
	async logIn(userId: string) {
		if (!ensure()) return;
		await Purchases.logIn(userId).catch(() => {});
	},
	async logOut() {
		if (!configured) return;
		await Purchases.logOut().catch(() => {});
	},
	async monthly(): Promise<StoreOffer | null> {
		if (!ensure()) return null;
		try {
			const o = await Purchases.getOfferings();
			const pkg = o.current?.monthly ?? o.current?.availablePackages[0];
			if (!pkg) return null;
			return { pkg, price: pkg.product.priceString, title: pkg.product.title };
		} catch {
			return null;
		}
	},
	/** Resolves true when the store confirms; false when the student cancels. */
	async buy(offer: StoreOffer): Promise<boolean> {
		if (!ensure()) return false;
		try {
			await Purchases.purchasePackage(offer.pkg);
			return true;
		} catch (e) {
			if ((e as { userCancelled?: boolean }).userCancelled) return false;
			throw e;
		}
	},
	async restore(): Promise<boolean> {
		if (!ensure()) return false;
		const info = await Purchases.restorePurchases();
		return Object.keys(info.entitlements.active).length > 0 || info.activeSubscriptions.length > 0;
	},
	async manageUrl(): Promise<string | null> {
		if (!ensure()) return null;
		const info = await Purchases.getCustomerInfo().catch(() => null);
		return info?.managementURL ?? null;
	}
};
