// Course icons: the website's drawings (lib/icons.ts, Lucide names), drawn with SvgXml.
import { SvgXml } from 'react-native-svg';
import { ICON_PATHS, iconKey } from '../lib/icons';

export function CourseIcon({ name, size = 24, color, stroke = 1.9 }: { name: string | null | undefined; size?: number; color: string; stroke?: number }) {
	const { key } = iconKey(name || '');
	const xml = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[key]}</svg>`;
	return <SvgXml xml={xml} width={size} height={size} />;
}
