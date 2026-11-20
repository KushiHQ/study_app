// Theme follows the phone's light/dark setting until the student picks one
// (Account → Look), the same rule as the website.
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import { prefs } from '../storage';
import { PALETTES, tintOf, type HueSet, type Palette, type ThemeName } from './palette';

export * from './palette';

export type ThemeChoice = 'system' | ThemeName;
const KEY = 'ks.theme';

export const useThemeChoice = create<{ choice: ThemeChoice; set(c: ThemeChoice): void }>((set) => ({
	choice: (prefs.get(KEY) as ThemeChoice | null) ?? 'system',
	set(c) {
		prefs.set(KEY, c);
		set({ choice: c });
	}
}));

const Ctx = createContext<Palette>(PALETTES.night);

export function ThemeProvider({ children }: { children: ReactNode }) {
	const scheme = useColorScheme();
	const choice = useThemeChoice((s) => s.choice);
	const name: ThemeName = choice === 'system' ? (scheme === 'light' ? 'day' : 'night') : choice;
	return <Ctx.Provider value={PALETTES[name]}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);

/** The course's own hue in the current theme. */
export function useTint(slugOrCode: string | null | undefined): HueSet {
	const t = useTheme();
	return useMemo(() => t.hues[tintOf(slugOrCode)], [t, slugOrCode]);
}
