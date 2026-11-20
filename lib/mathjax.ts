// TeX → SVG on the phone with MathJax (no web view, no maths fonts to ship).
// Until the content compiler pre-renders formulas (plan: phase 3 tooling),
// the app renders the same $…$ / $$…$$ TeX the website renders with KaTeX.
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import 'mathjax-full/js/input/tex/base/BaseConfiguration.js';
import 'mathjax-full/js/input/tex/ams/AmsConfiguration.js';
import 'mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js';
import 'mathjax-full/js/input/tex/noundefined/NoUndefinedConfiguration.js';
import 'mathjax-full/js/input/tex/boldsymbol/BoldsymbolConfiguration.js';
import 'mathjax-full/js/input/tex/color/ColorConfiguration.js';
import 'mathjax-full/js/input/tex/cancel/CancelConfiguration.js';
import 'mathjax-full/js/input/tex/mhchem/MhchemConfiguration.js';
import 'mathjax-full/js/input/tex/textmacros/TextMacrosConfiguration.js';

export interface MathSvg {
	xml: string;
	/** in ex units */
	width: number;
	height: number;
	/** vertical-align in ex (negative = below the baseline) */
	valign: number;
}

let doc: ReturnType<typeof mathjax.document> | null = null;
let adaptor: ReturnType<typeof liteAdaptor> | null = null;

function setup() {
	if (doc) return;
	adaptor = liteAdaptor();
	RegisterHTMLHandler(adaptor);
	const tex = new TeX({ packages: ['base', 'ams', 'newcommand', 'noundefined', 'boldsymbol', 'color', 'cancel', 'mhchem', 'textmacros'] });
	const svg = new SVG({ fontCache: 'none' });
	doc = mathjax.document('', { InputJax: tex, OutputJax: svg });
}

const cache = new Map<string, MathSvg | null>();

export function texToSvg(tex: string, display: boolean): MathSvg | null {
	const key = (display ? 'D' : 'I') + tex;
	if (cache.has(key)) return cache.get(key)!;
	let out: MathSvg | null = null;
	try {
		setup();
		const node = doc!.convert(tex, { display });
		let xml = adaptor!.innerHTML(node);
		const w = /width="([\d.]+)ex"/.exec(xml);
		const h = /height="([\d.]+)ex"/.exec(xml);
		const va = /vertical-align:\s*(-?[\d.]+)ex/.exec(xml);
		// react-native-svg wants plain numbers; size is set by the component.
		xml = xml.replace(/ (width|height)="[\d.]+ex"/g, '').replace(/ style="[^"]*"/, '');
		if (xml.includes('data-mjx-error') || xml.includes('merror')) out = null;
		else out = { xml, width: w ? +w[1] : 1, height: h ? +h[1] : 1, valign: va ? +va[1] : 0 };
	} catch {
		out = null;
	}
	cache.set(key, out);
	return out;
}

export type Piece = { kind: 'text'; text: string } | { kind: 'math'; tex: string; display: boolean };

/** Splits text on $$…$$ (display) and $…$ (inline) like the web's rich(). */
export function splitMath(s: string): Piece[] {
	const out: Piece[] = [];
	const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
	let last = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(s))) {
		if (m.index > last) out.push({ kind: 'text', text: s.slice(last, m.index) });
		out.push(m[1] != null ? { kind: 'math', tex: m[1].trim(), display: true } : { kind: 'math', tex: m[2].trim(), display: false });
		last = m.index + m[0].length;
	}
	if (last < s.length) out.push({ kind: 'text', text: s.slice(last) });
	return out;
}
