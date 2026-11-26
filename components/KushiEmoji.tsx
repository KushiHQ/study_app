// Bundled Microsoft Fluent 3D Emojis (MIT) — renders identically on iOS, Android, and Web.
import { Image, type ImageSource } from 'expo-image';

export type KushiEmojiName = 'bulb' | 'book' | 'brain' | 'warning' | 'think' | 'write' | 'fire' | 'sparkles';

const ASSETS: Record<KushiEmojiName, ImageSource> = {
	bulb: require('../assets/emojis/bulb.png'),
	book: require('../assets/emojis/book.png'),
	brain: require('../assets/emojis/brain.png'),
	warning: require('../assets/emojis/warning.png'),
	think: require('../assets/emojis/think.png'),
	write: require('../assets/emojis/write.png'),
	fire: require('../assets/emojis/fire.png'),
	sparkles: require('../assets/emojis/sparkles.png')
};

export function KushiEmoji({ name, size = 22 }: { name: KushiEmojiName; size?: number }) {
	return (
		<Image
			source={ASSETS[name]}
			style={{ width: size, height: size }}
			contentFit="contain"
			accessible={false}
			transition={0}
		/>
	);
}
