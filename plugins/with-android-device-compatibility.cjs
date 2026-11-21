const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

module.exports = function withAndroidDeviceCompatibility(config) {
	return withAndroidManifest(config, (mod) => {
		const androidManifest = mod.modResults;
		const activity = AndroidConfig.Manifest.getMainActivityOrThrow(androidManifest);
		delete activity.$['android:screenOrientation'];

		const manifest = androidManifest.manifest;
		const optionalFeatures = ['android.hardware.screen.portrait', 'android.hardware.wifi'];
		manifest['uses-feature'] = [
			...(manifest['uses-feature'] ?? []).filter((feature) => !optionalFeatures.includes(feature.$['android:name'])),
			...optionalFeatures.map((name) => ({
				$: { 'android:name': name, 'android:required': 'false' }
			}))
		];
		return mod;
	});
};
