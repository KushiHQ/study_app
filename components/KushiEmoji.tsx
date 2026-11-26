// Renders native color emojis matching study_web_app (.emoji in src/app.css).
import { Text } from 'react-native';

export type KushiEmojiName = 'bulb' | 'book' | 'brain' | 'warning' | 'think' | 'write' | 'fire' | 'sparkles';

const CHAR: Record<KushiEmojiName, string> = {
	bulb: '💡',
	book: '📖',
	brain: '🧠',
	warning: '⚠️',
	think: '🤔',
	write: '✍️',
	fire: '🔥',
	sparkles: '✨'
};

export function KushiEmoji({ name, size = 22 }: { name: KushiEmojiName; size?: number }) {
	return (
		<Text
			accessible={false}
			allowFontScaling={false}
			style={{ fontSize: size, lineHeight: Math.round(size * 1.18), textAlign: 'center' }}
		>
			{CHAR[name]}
		</Text>
	);
}
