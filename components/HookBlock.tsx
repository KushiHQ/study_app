// Editorial lesson opening hook matching study_web_app (.hook + ::first-letter drop cap):
// Fraunces serif body text with a 3px course-accent left bar and a true 2-line wrapping drop cap.
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useStudyPrefs } from '../lib/prefs';
import { fonts, useTheme, type HueSet } from '../lib/theme';
import { Html } from './Html';

function stripTags(html: string): string {
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, ' ')
		.trim();
}

export function HookBlock({ html, hue }: { html: string; hue: HueSet }) {
	const t = useTheme();
	const scale = useStudyPrefs((s) => s.textScale);
	const fontSize = Math.round(18.5 * scale);
	const lineHeight = Math.round(28.5 * scale);
	const dropSize = Math.round(52 * scale);

	// Check if the hook is clean prose (no math/code/lists) so we can render a true 2-line drop cap.
	const parsed = useMemo(() => {
		const hasRich = /<(code|pre|ul|ol|table|math|span\s+class="math")/i.test(html) || /\$/.test(html);
		if (hasRich) return null;
		const paras = html
			.split(/<\/p>\s*<p[^>]*>|\n\n+/i)
			.map((p) => stripTags(p))
			.filter(Boolean);
		if (!paras.length) return null;
		const first = paras[0];
		const m = /^([A-Za-z0-9“"‘']?[A-Za-z])(.*)$/s.exec(first);
		if (!m) return null;
		return {
			drop: m[1],
			rest: m[2].replace(/^\s+/, ''),
			extra: paras.slice(1)
		};
	}, [html]);

	const [splitAt, setSplitAt] = useState<number | null>(null);
	const [sideW, setSideW] = useState(0);

	useEffect(() => {
		setSplitAt(null);
	}, [html, scale, sideW]);

	if (!parsed) {
		return (
			<View style={{ borderLeftWidth: 3, borderLeftColor: hue.base, paddingLeft: 18, paddingVertical: 2 }}>
				<Html html={html} hue={hue} style={{ fontFamily: fonts.serifRegular, fontSize, lineHeight }} />
			</View>
		);
	}

	const topText = splitAt !== null ? parsed.rest.slice(0, splitAt).trimEnd() : parsed.rest;
	const botText = splitAt !== null ? parsed.rest.slice(splitAt).trimStart() : '';

	return (
		<View style={{ borderLeftWidth: 3, borderLeftColor: hue.base, paddingLeft: 18, paddingVertical: 2, gap: 10 }}>
			<View>
				{/* Top row: giant Fraunces Bold drop cap on the left + first 2 wrapped lines on the right */}
				<View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
					<Text
						allowFontScaling={false}
						style={{
							fontFamily: fonts.serifBold,
							fontSize: dropSize,
							lineHeight: Math.round(dropSize * 1.02),
							color: hue.base,
							marginRight: 10,
							marginTop: 2,
							includeFontPadding: false
						}}
					>
						{parsed.drop}
					</Text>
					<View style={{ flex: 1 }} onLayout={(e) => setSideW(e.nativeEvent.layout.width)}>
						{/* Hidden measurer to split cleanly after line 2 so lines 3+ wrap full-width under the drop cap */}
						{sideW > 0 && splitAt === null ? (
							<Text
								pointerEvents="none"
								style={{
									position: 'absolute',
									opacity: 0,
									width: sideW,
									fontFamily: fonts.serifRegular,
									fontSize,
									lineHeight
								}}
								onTextLayout={(e) => {
									const lines = e.nativeEvent.lines;
									if (lines.length <= 2) {
										setSplitAt(parsed.rest.length);
									} else {
										setSplitAt(lines[0].text.length + lines[1].text.length);
									}
								}}
							>
								{parsed.rest}
							</Text>
						) : null}

						<Text style={{ fontFamily: fonts.serifRegular, fontSize, lineHeight, color: t.fg }}>
							{topText}
						</Text>
					</View>
				</View>

				{/* Lines 3+ flowing full-width directly underneath the drop cap */}
				{botText ? (
					<Text style={{ fontFamily: fonts.serifRegular, fontSize, lineHeight, color: t.fg }}>
						{botText}
					</Text>
				) : null}
			</View>

			{parsed.extra.map((p, i) => (
				<Text key={i} style={{ fontFamily: fonts.serifRegular, fontSize, lineHeight, color: t.fg }}>
					{p}
				</Text>
			))}
		</View>
	);
}
