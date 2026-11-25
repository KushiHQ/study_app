// Persistent user preferences synced across Lesson Reader, Diagrams, Traces, and Settings.
import { create } from 'zustand';
import { prefs } from './storage';

export type AnimSpeed = 0.75 | 1 | 1.5;

const K_SPEED = 'ks.animSpeed';
const K_SCALE = 'ks.textScale';
const K_SOUNDS = 'ks.sounds';
const K_OLLIE = 'ks.showOllie';

function readSpeed(): AnimSpeed {
	const v = Number(prefs.get(K_SPEED));
	return v === 0.75 || v === 1.5 ? v : 1;
}
function readScale(): number {
	const v = Number(prefs.get(K_SCALE));
	if (!Number.isFinite(v) || v < 0.9 || v > 1.3) return 1;
	return Math.round(v * 20) / 20;
}
function readSounds(): boolean {
	return prefs.get(K_SOUNDS) !== '0';
}
function readShowOllie(): boolean {
	return prefs.get(K_OLLIE) !== '0';
}

export const useStudyPrefs = create<{
	animSpeed: AnimSpeed;
	textScale: number;
	sounds: boolean;
	showOllie: boolean;
	setAnimSpeed(v: AnimSpeed): void;
	setTextScale(v: number): void;
	setSounds(v: boolean): void;
	setShowOllie(v: boolean): void;
}>((set) => ({
	animSpeed: readSpeed(),
	textScale: readScale(),
	sounds: readSounds(),
	showOllie: readShowOllie(),
	setAnimSpeed(v) {
		prefs.set(K_SPEED, String(v));
		set({ animSpeed: v });
	},
	setTextScale(v) {
		const clamped = Math.round(Math.max(0.9, Math.min(1.3, v)) * 20) / 20;
		prefs.set(K_SCALE, String(clamped));
		set({ textScale: clamped });
	},
	setSounds(v) {
		prefs.set(K_SOUNDS, v ? '1' : '0');
		set({ sounds: v });
	},
	setShowOllie(v) {
		prefs.set(K_OLLIE, v ? '1' : '0');
		set({ showOllie: v });
	}
}));
