// Persistent user preferences synced across Lesson Reader, Diagrams, Traces, Focus Timer, and Settings.
import { create } from 'zustand';
import { prefs } from './storage';

const K_ANIM_SPEED = 'ks.animSpeed';
const K_STEP_SPEED = 'ks.stepSpeed';
const K_SCALE = 'ks.textScale';
const K_SOUNDS = 'ks.sounds';
const K_OLLIE = 'ks.showOllie';
const K_FOCUS_MIN = 'ks.focusMinutes';
const K_BREAK_MIN = 'ks.breakMinutes';

function clampStep(v: number, min: number, max: number, step: number, fallback: number): number {
	if (!Number.isFinite(v)) return fallback;
	const clamped = Math.max(min, Math.min(max, v));
	return Math.round(clamped / step) * step;
}

function readAnimSpeed(): number {
	const raw = prefs.get(K_ANIM_SPEED);
	if (raw == null) return 1;
	return clampStep(Number(raw), 0.5, 2.0, 0.25, 1);
}
function readStepSpeed(): number {
	const raw = prefs.get(K_STEP_SPEED);
	if (raw == null) return 1;
	return clampStep(Number(raw), 0.5, 2.5, 0.25, 1);
}
function readScale(): number {
	const raw = prefs.get(K_SCALE);
	if (raw == null) return 1;
	return clampStep(Number(raw), 0.9, 1.3, 0.05, 1);
}
function readSounds(): boolean {
	return prefs.get(K_SOUNDS) !== '0';
}
function readShowOllie(): boolean {
	return prefs.get(K_OLLIE) !== '0';
}
function readFocusMinutes(): number {
	const raw = prefs.get(K_FOCUS_MIN);
	if (raw == null) return 25;
	return clampStep(Number(raw), 5, 60, 5, 25);
}
function readBreakMinutes(): number {
	const raw = prefs.get(K_BREAK_MIN);
	if (raw == null) return 5;
	return clampStep(Number(raw), 1, 20, 1, 5);
}

export type AnimSpeed = number;

export const useStudyPrefs = create<{
	/** Motion speed multiplier for transitions/springs (0.5× – 2.0×). */
	animSpeed: number;
	/** Step pacing multiplier for auto-playing traces & diagrams (0.5× – 2.5×). */
	stepSpeed: number;
	textScale: number;
	sounds: boolean;
	showOllie: boolean;
	focusMinutes: number;
	breakMinutes: number;
	setAnimSpeed(v: number): void;
	setStepSpeed(v: number): void;
	setTextScale(v: number): void;
	setSounds(v: boolean): void;
	setShowOllie(v: boolean): void;
	setFocusMinutes(v: number): void;
	setBreakMinutes(v: number): void;
}>((set) => ({
	animSpeed: readAnimSpeed(),
	stepSpeed: readStepSpeed(),
	textScale: readScale(),
	sounds: readSounds(),
	showOllie: readShowOllie(),
	focusMinutes: readFocusMinutes(),
	breakMinutes: readBreakMinutes(),
	setAnimSpeed(v) {
		const next = clampStep(v, 0.5, 2.0, 0.25, 1);
		prefs.set(K_ANIM_SPEED, String(next));
		set({ animSpeed: next });
	},
	setStepSpeed(v) {
		const next = clampStep(v, 0.5, 2.5, 0.25, 1);
		prefs.set(K_STEP_SPEED, String(next));
		set({ stepSpeed: next });
	},
	setTextScale(v) {
		const next = clampStep(v, 0.9, 1.3, 0.05, 1);
		prefs.set(K_SCALE, String(next));
		set({ textScale: next });
	},
	setSounds(v) {
		prefs.set(K_SOUNDS, v ? '1' : '0');
		set({ sounds: v });
	},
	setShowOllie(v) {
		prefs.set(K_OLLIE, v ? '1' : '0');
		set({ showOllie: v });
	},
	setFocusMinutes(v) {
		const next = clampStep(v, 5, 60, 5, 25);
		prefs.set(K_FOCUS_MIN, String(next));
		set({ focusMinutes: next });
	},
	setBreakMinutes(v) {
		const next = clampStep(v, 1, 20, 1, 5);
		prefs.set(K_BREAK_MIN, String(next));
		set({ breakMinutes: next });
	}
}));
