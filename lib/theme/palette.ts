// Bright Day and Fresh Night, the two looks of study.kushi.ng (study_web_app
// src/app.css). Colours are resolved here because React Native has no
// color-mix(): soft/wash tints are mixed in JS once per theme.

export type ThemeName = 'day' | 'night';
export const HUES = ['sage', 'sky', 'lilac', 'peach', 'rose', 'honey'] as const;
export type Hue = (typeof HUES)[number];

export interface HueSet {
	/** the hue itself: rings, icon tiles, fills */
	base: string;
	/** text in the hue, readable on the surface */
	ink: string;
	/** a soft fill (chips, tiles) */
	soft: string;
	/** a faint wash (headers, card backgrounds) */
	wash: string;
}

export interface Palette {
	name: ThemeName;
	bg: string;
	bg2: string;
	surface: string;
	surface2: string;
	line: string;
	line2: string;
	fg: string;
	fg2: string;
	muted: string;
	/** accent text (deeper amber on day) */
	accent: string;
	/** brand amber: fills and primary buttons */
	amber: string;
	onAmber: string;
	accentSoft: string;
	signal: string;
	signalSoft: string;
	success: string;
	successSoft: string;
	danger: string;
	dangerSoft: string;
	/** text on a solid course-hue fill */
	onHue: string;
	hues: Record<Hue, HueSet>;
	/** iOS-style card shadow */
	shadow: { color: string; opacity: number; radius: number; y: number };
	statusBar: 'light' | 'dark';
}

function hex(c: string): [number, number, number] {
	const h = c.replace('#', '');
	return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
/** color-mix(in srgb, a pct%, b) */
export function mix(a: string, pct: number, b: string): string {
	const [r1, g1, b1] = hex(a);
	const [r2, g2, b2] = hex(b);
	const p = pct / 100;
	const ch = (x: number, y: number) => Math.round(x * p + y * (1 - p)).toString(16).padStart(2, '0');
	return `#${ch(r1, r2)}${ch(g1, g2)}${ch(b1, b2)}`;
}
export function alpha(c: string, a: number): string {
	const [r, g, b] = hex(c);
	return `rgba(${r},${g},${b},${a})`;
}

const AMBER = '#F59E0B';

function hues(base: Record<Hue, [string, string]>, surface: string, soft: number, wash: number): Record<Hue, HueSet> {
	const out = {} as Record<Hue, HueSet>;
	for (const h of HUES) {
		const [b, ink] = base[h];
		out[h] = { base: b, ink, soft: mix(b, soft, surface), wash: mix(b, wash, surface) };
	}
	return out;
}

const nightSurface = '#121a2e';
export const night: Palette = {
	name: 'night',
	bg: '#0a0f1e',
	bg2: '#0d1326',
	surface: nightSurface,
	surface2: '#182139',
	line: 'rgba(170,190,255,0.085)',
	line2: 'rgba(170,190,255,0.16)',
	fg: '#f6f8fd',
	fg2: '#c9d1e4',
	muted: '#8c97b2',
	accent: '#fbbf24',
	amber: AMBER,
	onAmber: '#120C02',
	accentSoft: mix(AMBER, 14, nightSurface),
	signal: '#6aa6ff',
	signalSoft: mix('#6aa6ff', 14, nightSurface),
	success: '#3ddc97',
	successSoft: mix('#3ddc97', 14, nightSurface),
	danger: '#ff6b6b',
	dangerSoft: mix('#ff6b6b', 13, nightSurface),
	onHue: '#0a0f1e',
	hues: hues(
		{
			sage: ['#5ccb94', '#9be5be'],
			sky: ['#62a8fb', '#acd0fd'],
			lilac: ['#a78bfa', '#d0c1fd'],
			peach: ['#fb9a6b', '#fdc6a9'],
			rose: ['#f47496', '#f9b2c5'],
			honey: ['#e3c14f', '#f2dc93']
		},
		nightSurface,
		18,
		9
	),
	shadow: { color: '#000000', opacity: 0.45, radius: 18, y: 10 },
	statusBar: 'light'
};

const daySurface = '#ffffff';
export const day: Palette = {
	name: 'day',
	bg: '#f4f6fb',
	bg2: '#ebeff7',
	surface: daySurface,
	surface2: '#f6f8fc',
	line: 'rgba(15,23,42,0.075)',
	line2: 'rgba(15,23,42,0.14)',
	fg: '#0d1426',
	fg2: '#36405a',
	muted: '#66708a',
	accent: '#b45309',
	amber: AMBER,
	onAmber: '#120C02',
	accentSoft: mix(AMBER, 14, daySurface),
	signal: '#2563eb',
	signalSoft: mix('#2563eb', 14, daySurface),
	success: '#0f9466',
	successSoft: mix('#0f9466', 14, daySurface),
	danger: '#d63031',
	dangerSoft: mix('#d63031', 13, daySurface),
	onHue: '#ffffff',
	hues: hues(
		{
			sage: ['#2e9e6b', '#13623f'],
			sky: ['#2f80ed', '#164e9e'],
			lilac: ['#7c5ce0', '#4a2fa8'],
			peach: ['#ea7a45', '#9a3f14'],
			rose: ['#e0527a', '#9c2247'],
			honey: ['#c9a227', '#6e5500']
		},
		daySurface,
		13,
		6
	),
	shadow: { color: '#1e2952', opacity: 0.12, radius: 16, y: 8 },
	statusBar: 'dark'
};

export const PALETTES: Record<ThemeName, Palette> = { day, night };

/**
 * Stable hue for a course slug or code (study_web_app src/lib/tint.ts).
 * Courses in one subject with consecutive numbers always get different hues.
 */
export function tintOf(slugOrCode: string | null | undefined): Hue {
	const s = (slugOrCode ?? '').toLowerCase();
	const n = Number(s.match(/(\d+)\s*$/)?.[1] ?? 0);
	let h = 0;
	for (const ch of s.replace(/[^a-z]/g, '')) h = (h * 23 + ch.charCodeAt(0)) % 997;
	return HUES[(n + h) % HUES.length];
}

export const radius = { sm: 12, md: 20, lg: 28, pill: 999 };
export const space = (n: number) => n * 4;

export const fonts = {
	display: 'Unbounded_500Medium',
	body: 'InterTight_400Regular',
	bodyMedium: 'InterTight_500Medium',
	bodySemi: 'InterTight_600SemiBold',
	bodyBold: 'InterTight_700Bold',
	mono: 'JetBrainsMono_500Medium',
	/** the reading voice inside lessons, quizzes and cards (Study Nook) */
	read: 'Nunito_400Regular',
	readItalic: 'Nunito_400Regular_Italic',
	readBold: 'Nunito_700Bold',
	readHeavy: 'Nunito_800ExtraBold',
	serif: 'Fraunces_600SemiBold',
	serifItalic: 'Fraunces_400Regular_Italic'
};
