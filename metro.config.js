const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Web previews (local checks only) swap native-only modules for a no-op stub.
const WEB_STUBS = ['@react-native-google-signin/google-signin', 'react-native-purchases', 'expo-apple-authentication', 'expo-sqlite'];
const stub = path.resolve(__dirname, 'web-stubs/universal.js');
const base = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, name, platform) => {
	if (platform === 'web' && WEB_STUBS.some((m) => name === m || name.startsWith(m + '/'))) return { type: 'sourceFile', filePath: stub };
	return base ? base(context, name, platform) : context.resolveRequest(context, name, platform);
};

module.exports = config;
