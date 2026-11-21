import { Text } from 'react-native';
import type { CodeRun } from '../lib/highlight';
import type { Palette } from '../lib/theme';

export function CodeRuns({ runs, palette }: { runs: CodeRun[]; palette: Palette }) {
	const { hues, muted } = palette;
	const color = {
		keyword: hues.lilac.ink,
		string: hues.sage.ink,
		comment: muted,
		number: hues.peach.ink,
		function: hues.sky.ink,
		property: hues.honey.ink,
		name: hues.rose.ink
	};
	return runs.map(({ text, token }, index) => token ? (
		<Text key={index} style={{ color: color[token], fontStyle: token === 'comment' ? 'italic' : undefined }}>{text}</Text>
	) : text);
}
