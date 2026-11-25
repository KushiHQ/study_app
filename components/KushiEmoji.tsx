// Glossy Fluent-style vector emojis matching the vibrant Windows/web look on
// both iOS and Android (so phones never fall back to flat system emojis).
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

export type KushiEmojiName = 'bulb' | 'book' | 'brain' | 'warning' | 'think' | 'write' | 'fire';

export function KushiEmoji({ name, size = 24 }: { name: KushiEmojiName; size?: number }) {
	switch (name) {
		case 'warning':
			return (
				<Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
					<Defs>
						<LinearGradient id="ke-warn" x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
							<Stop offset="0%" stopColor="#FFE14D" />
							<Stop offset="65%" stopColor="#FFB020" />
							<Stop offset="100%" stopColor="#F5820B" />
						</LinearGradient>
					</Defs>
					<Path
						d="M14.1 4.6a2.2 2.2 0 0 1 3.8 0l11.2 19.6a2.2 2.2 0 0 1-1.9 3.3H4.8a2.2 2.2 0 0 1-1.9-3.3L14.1 4.6Z"
						fill="url(#ke-warn)"
					/>
					<Rect x="14.5" y="11" width="3" height="8.5" rx="1.5" fill="#1C1917" />
					<Circle cx="16" cy="23.2" r="1.75" fill="#1C1917" />
				</Svg>
			);

		case 'book':
			return (
				<Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
					<Defs>
						<LinearGradient id="ke-book-cov" x1="3" y1="8" x2="29" y2="27" gradientUnits="userSpaceOnUse">
							<Stop offset="0%" stopColor="#4F9CF9" />
							<Stop offset="100%" stopColor="#2563EB" />
						</LinearGradient>
						<LinearGradient id="ke-book-pg" x1="16" y1="6" x2="16" y2="25" gradientUnits="userSpaceOnUse">
							<Stop offset="0%" stopColor="#FFFFFF" />
							<Stop offset="100%" stopColor="#DCE8FF" />
						</LinearGradient>
					</Defs>
					<Rect x="2.5" y="7.5" width="27" height="19" rx="3" fill="url(#ke-book-cov)" />
					<Path
						d="M5 7c4.5 0 8.5 1.2 11 3.2C18.5 8.2 22.5 7 27 7v16.5c-4.5 0-8.5 1.1-11 3-2.5-1.9-6.5-3-11-3V7Z"
						fill="url(#ke-book-pg)"
					/>
					<Path d="M16 10.2V26.2" stroke="#93C5FD" strokeWidth="1.4" />
					<Path d="M8 12.2h5M8 15.8h5M19 12.2h5M19 15.8h5" stroke="#94A3B8" strokeWidth="1.3" strokeLinecap="round" />
				</Svg>
			);

		case 'bulb':
			return (
				<Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
					<Defs>
						<RadialGradient id="ke-bulb" cx="45%" cy="35%" r="65%">
							<Stop offset="0%" stopColor="#FFF7B2" />
							<Stop offset="55%" stopColor="#FFD43B" />
							<Stop offset="100%" stopColor="#F59E0B" />
						</RadialGradient>
						<LinearGradient id="ke-base" x1="12" y1="22" x2="20" y2="29" gradientUnits="userSpaceOnUse">
							<Stop offset="0%" stopColor="#CBD5E1" />
							<Stop offset="100%" stopColor="#64748B" />
						</LinearGradient>
					</Defs>
					<Path
						d="M16 3.5c-5.4 0-9.6 4.1-9.6 9.3 0 3.3 1.7 6 4.1 7.7.7.5 1.2 1.3 1.3 2.2h8.4c.1-.9.6-1.7 1.3-2.2 2.4-1.7 4.1-4.4 4.1-7.7 0-5.2-4.2-9.3-9.6-9.3Z"
						fill="url(#ke-bulb)"
					/>
					<Rect x="11.5" y="22.8" width="9" height="4.2" rx="1.6" fill="url(#ke-base)" />
					<Path d="M13.2 27.5h5.6a2.8 2.8 0 0 1-5.6 0Z" fill="#475569" />
					<Path d="M13.5 14.5c.8-1 1.7-1 2.5 0 .8-1 1.7-1 2.5 0" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" />
				</Svg>
			);

		case 'brain':
			return (
				<Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
					<Defs>
						<LinearGradient id="ke-brain" x1="6" y1="5" x2="26" y2="27" gradientUnits="userSpaceOnUse">
							<Stop offset="0%" stopColor="#FDA4AF" />
							<Stop offset="55%" stopColor="#FB7185" />
							<Stop offset="100%" stopColor="#E11D48" />
						</LinearGradient>
					</Defs>
					<Path
						d="M15.5 7.2c-1.1-1.7-3.4-2.5-5.4-1.7-2 .8-3.1 2.8-2.8 4.8-1.9.9-3.1 3-2.7 5.2.3 1.7 1.4 3.1 2.9 3.7-.3 2.1.8 4.3 2.8 5.2 2 .9 4.3.2 5.4-1.5V7.2Z"
						fill="url(#ke-brain)"
					/>
					<Path
						d="M16.5 7.2c1.1-1.7 3.4-2.5 5.4-1.7 2 .8 3.1 2.8 2.8 4.8 1.9.9 3.1 3 2.7 5.2-.3 1.7-1.4 3.1-2.9 3.7.3 2.1-.8 4.3-2.8 5.2-2 .9-4.3.2-5.4-1.5V7.2Z"
						fill="url(#ke-brain)"
					/>
					<Path
						d="M12.2 10.5c-1.4.4-2.2 1.6-1.8 3m1.6 3.5c-1.5.5-2.1 2-1.4 3.2m9.2-9.7c1.4.4 2.2 1.6 1.8 3m-1.6 3.5c1.5.5 2.1 2 1.4 3.2"
						stroke="#FFE4E6"
						strokeWidth="1.4"
						strokeLinecap="round"
					/>
				</Svg>
			);

		case 'think':
			return (
				<Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
					<Defs>
						<RadialGradient id="ke-face" cx="42%" cy="32%" r="68%">
							<Stop offset="0%" stopColor="#FFE96B" />
							<Stop offset="65%" stopColor="#FFC226" />
							<Stop offset="100%" stopColor="#F59E0B" />
						</RadialGradient>
					</Defs>
					<Circle cx="16" cy="15.5" r="12" fill="url(#ke-face)" />
					<Path d="M10.2 11.4c1.2-.9 2.6-.9 3.6-.3" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
					<Path d="M18.4 10.2c1.1-.8 2.5-.6 3.5.3" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
					<Ellipse cx="12" cy="14.2" rx="1.4" ry="1.8" fill="#292524" />
					<Ellipse cx="20" cy="14" rx="1.4" ry="1.8" fill="#292524" />
					<Path d="M13 19.6c1.8-.8 3.9-.6 5.5.4" stroke="#78350F" strokeWidth="1.6" strokeLinecap="round" />
					<Path
						d="M10.5 22.8c1.5-.8 3.6-.5 4.8.6l1.7 1.5c.8.7.6 2-.4 2.4l-4.5 1.4c-1.4.4-2.9-.4-3.2-1.8l-.4-1.8c-.2-1 .5-1.8 1.5-2.1l.5-.2Z"
						fill="#F59E0B"
						stroke="#B45309"
						strokeWidth="1"
					/>
				</Svg>
			);

		case 'write':
			return (
				<Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
					<Defs>
						<LinearGradient id="ke-pen" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
							<Stop offset="0%" stopColor="#FDE047" />
							<Stop offset="100%" stopColor="#F59E0B" />
						</LinearGradient>
					</Defs>
					<Path d="M21.8 4.8a2.6 2.6 0 0 1 3.7 0l1.7 1.7a2.6 2.6 0 0 1 0 3.7L12.6 24.8l-6.4 1.6 1.6-6.4L21.8 4.8Z" fill="url(#ke-pen)" />
					<Path d="M21.8 4.8a2.6 2.6 0 0 1 3.7 0l1.7 1.7a2.6 2.6 0 0 1 0 3.7l-2.3 2.3-5.4-5.4 2.3-2.3Z" fill="#FB7185" />
					<Path d="M7.8 20l4.8 4.8-6.4 1.6 1.6-6.4Z" fill="#FDE68A" />
					<Path d="M6.2 26.4l2.2-.6-1.6-1.6-.6 2.2Z" fill="#1E293B" />
				</Svg>
			);

		case 'fire':
			return (
				<Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
					<Defs>
						<LinearGradient id="ke-fire-out" x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
							<Stop offset="0%" stopColor="#F97316" />
							<Stop offset="60%" stopColor="#EA580C" />
							<Stop offset="100%" stopColor="#DC2626" />
						</LinearGradient>
						<LinearGradient id="ke-fire-in" x1="16" y1="13" x2="16" y2="28" gradientUnits="userSpaceOnUse">
							<Stop offset="0%" stopColor="#FEF08A" />
							<Stop offset="100%" stopColor="#FBBF24" />
						</LinearGradient>
					</Defs>
					<Path
						d="M17.2 3.2c.6 3.6-1.6 6.2-3.5 8.1-1.9 1.9-3.7 4-3.7 7.2 0 4.6 3.5 8.3 8 8.3 5 0 8.5-3.8 8.5-8.9 0-4.9-2.8-8.7-5.5-11.2-.2 1.9-1.1 3.1-2.2 3.6.7-2.6-.1-5.4-1.6-7.1Z"
						fill="url(#ke-fire-out)"
					/>
					<Path
						d="M17.4 14.2c-.3 1.8-1.5 2.8-2.4 3.9-.9 1.1-1.6 2.2-1.6 3.8 0 2.5 1.9 4.5 4.4 4.5 2.6 0 4.5-2 4.5-4.7 0-2.6-1.5-4.7-3.4-6.2-.2 1-.7 1.6-1.3 1.9.4-1.2.2-2.3-.2-3.2Z"
						fill="url(#ke-fire-in)"
					/>
				</Svg>
			);
	}
}
