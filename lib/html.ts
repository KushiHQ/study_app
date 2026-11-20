// A tiny HTML/SVG parser for lesson content. Lessons use a small fixed set of
// tags (p, strong, em, ul/ol/li, code, table, span, br, inline svg...), so a
// forgiving hand-written parser is enough and keeps the bundle small. Unknown
// tags inside text (e.g. "<string>" in prose about Android XML) are kept as text.

export interface HNode {
	/** '#text' for text nodes */
	name: string;
	attrs: Record<string, string>;
	children: HNode[];
	text?: string;
}

const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'wbr', 'source', 'col']);
export const KNOWN = new Set([
	'p', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark', 'small', 'sub', 'sup', 'code', 'kbd', 'pre', 'a', 'span', 'br', 'hr',
	'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'blockquote', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'img', 'figure', 'figcaption', 'dl', 'dt', 'dd', 'abbr', 'cite', 'q', 'var', 'samp', 'time', 'section', 'aside', 'details', 'summary',
	// svg
	'svg', 'g', 'rect', 'circle', 'ellipse', 'line', 'path', 'polygon', 'polyline', 'text', 'tspan', 'defs', 'marker', 'title', 'desc',
	'lineargradient', 'radialgradient', 'stop', 'use', 'clippath', 'mask', 'pattern', 'symbol', 'foreignobject', 'style', 'image', 'textpath'
]);

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', times: '×', divide: '÷', minus: '−', le: '≤', ge: '≥', ne: '≠', rarr: '→', larr: '←', harr: '↔', deg: '°', middot: '·', bull: '•', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', plusmn: '±', micro: 'µ', copy: '©', reg: '®', trade: '™', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', pi: 'π', sigma: 'σ', theta: 'θ', lambda: 'λ', mu: 'µ', omega: 'ω', infin: '∞', sum: '∑', radic: '√', frac12: '½', frac14: '¼', frac34: '¾', sup2: '²', sup3: '³' };

export function decode(s: string): string {
	return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e: string) => {
		if (e[0] === '#') {
			const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
			return Number.isFinite(n) ? String.fromCodePoint(n) : m;
		}
		return ENT[e.toLowerCase()] ?? m;
	});
}

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|<!--[\s\S]*?-->/g;
const ATTR = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

const cache = new Map<string, HNode[]>();

export function parse(html: string): HNode[] {
	const hit = cache.get(html);
	if (hit) return hit;
	const root: HNode = { name: '#root', attrs: {}, children: [] };
	const stack: HNode[] = [root];
	let last = 0;
	const pushText = (t: string) => {
		if (!t) return;
		const top = stack[stack.length - 1];
		const prev = top.children[top.children.length - 1];
		if (prev && prev.name === '#text') prev.text += t;
		else top.children.push({ name: '#text', attrs: {}, children: [], text: t });
	};
	let m: RegExpExecArray | null;
	TAG.lastIndex = 0;
	while ((m = TAG.exec(html))) {
		const [raw, close, tagRaw, attrStr, selfClose] = m;
		if (m.index > last) pushText(decode(html.slice(last, m.index)));
		last = m.index + raw.length;
		if (raw.startsWith('<!--')) continue;
		const tag = tagRaw.toLowerCase();
		if (!KNOWN.has(tag)) {
			pushText(raw); // not markup: keep the angle brackets as written
			continue;
		}
		if (close) {
			for (let i = stack.length - 1; i > 0; i--) {
				if (stack[i].name === tag) {
					stack.length = i;
					break;
				}
			}
			continue;
		}
		const attrs: Record<string, string> = {};
		ATTR.lastIndex = 0;
		let a: RegExpExecArray | null;
		while ((a = ATTR.exec(attrStr ?? ''))) attrs[a[1]] = decode(a[2] ?? a[3] ?? a[4] ?? '');
		// <p> can't hold another <p>/<ul>/<table>: close it, as browsers do.
		if (['p', 'ul', 'ol', 'table', 'div', 'pre', 'blockquote'].includes(tag) && stack[stack.length - 1].name === 'p') stack.pop();
		if (tag === 'li') {
			const i = stack.map((n) => n.name).lastIndexOf('li');
			const list = Math.max(stack.map((n) => n.name).lastIndexOf('ul'), stack.map((n) => n.name).lastIndexOf('ol'));
			if (i > list && i > 0) stack.length = i;
		}
		const node: HNode = { name: tag, attrs, children: [] };
		stack[stack.length - 1].children.push(node);
		if (!selfClose && !VOID.has(tag)) stack.push(node);
	}
	if (last < html.length) pushText(decode(html.slice(last)));
	cache.set(html, root.children);
	return root.children;
}

/** Plain text of a node tree (tags dropped, $ kept off). */
export function textOf(nodes: HNode[]): string {
	return nodes.map((n) => (n.name === '#text' ? (n.text ?? '') : textOf(n.children))).join('');
}

/** Strip tags and maths delimiters: for short plain-text labels. */
export function plain(html: string | null | undefined): string {
	return decode((html ?? '').replace(/<[^>]+>/g, '')).replace(/\$/g, '');
}

/** "--i: 2; fill: red" → { '--i': '2', fill: 'red' } */
export function styleMap(s: string | undefined): Record<string, string> {
	const out: Record<string, string> = {};
	for (const part of (s ?? '').split(';')) {
		const i = part.indexOf(':');
		if (i > 0) out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
	}
	return out;
}
