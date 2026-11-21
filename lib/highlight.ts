import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import dart from 'highlight.js/lib/languages/dart';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import matlab from 'highlight.js/lib/languages/matlab';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import r from 'highlight.js/lib/languages/r';
import rust from 'highlight.js/lib/languages/rust';
import scss from 'highlight.js/lib/languages/scss';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import x86asm from 'highlight.js/lib/languages/x86asm';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { parse, textOf, type HNode } from './html';

const languages = { bash, c, cpp, csharp, css, dart, go, java, javascript, json, kotlin, markdown, matlab, php, python, r, rust, scss, shell, sql, swift, typescript, x86asm, xml, yaml };
for (const [name, definition] of Object.entries(languages)) hljs.registerLanguage(name, definition);
hljs.registerAliases(['nasm', 'asm', 'assembly'], { languageName: 'x86asm' });
hljs.registerAliases(['sh', 'console', 'terminal'], { languageName: 'bash' });
hljs.registerAliases(['mysql', 'postgresql', 'postgres', 'sqlite', 'plsql'], { languageName: 'sql' });
hljs.registerAliases(['html5', 'xhtml'], { languageName: 'xml' });
hljs.registerAliases(['node', 'nodejs', 'jsx'], { languageName: 'javascript' });

type Token = 'keyword' | 'string' | 'comment' | 'number' | 'function' | 'property' | 'name';
export type CodeRun = { text: string; token?: Token };

const tokenClasses = new Map<string, Token>([
	['keyword', 'keyword'], ['selector-tag', 'keyword'], ['doctag', 'keyword'], ['k', 'keyword'],
	['string', 'string'], ['regexp', 'string'], ['template-tag', 'string'], ['addition', 'string'], ['s', 'string'],
	['comment', 'comment'], ['quote', 'comment'], ['c', 'comment'],
	['number', 'number'], ['literal', 'number'], ['meta', 'number'], ['n', 'number'], ['a', 'number'],
	['title', 'function'], ['built_in', 'function'], ['symbol', 'function'], ['bullet', 'function'], ['link', 'function'],
	['attr', 'property'], ['attribute', 'property'], ['property', 'property'], ['type', 'property'], ['variable', 'property'],
	['template-variable', 'property'], ['section', 'property'], ['attr-name', 'property'],
	['name', 'name'], ['selector-id', 'name'], ['selector-class', 'name'], ['selector-pseudo', 'name'], ['deletion', 'name']
]);

function collectRuns(nodes: HNode[], inherited?: Token): CodeRun[] {
	return nodes.flatMap((node) => {
		if (node.name === '#text') return [{ text: node.text ?? '', token: inherited }];
		const scope = (node.attrs.class ?? '').split(/\s+/).map((name) => tokenClasses.get(name.replace(/^hljs-/, ''))).find(Boolean);
		return collectRuns(node.children, scope ?? inherited);
	});
}

export function highlightCode(code: string, lang?: string, markup?: HNode[]): CodeRun[] {
	if (markup && textOf(markup) === code) {
		const supplied = collectRuns(markup);
		if (supplied.some((run) => run.token)) return supplied;
	}
	const language = lang?.trim().toLowerCase();
	if (!language || !hljs.getLanguage(language)) return [{ text: code }];
	const html = hljs.highlight(code, { language, ignoreIllegals: true }).value;
	return collectRuns(parse(html));
}

export function codeLines(runs: CodeRun[]): CodeRun[][] {
	const lines: CodeRun[][] = [[]];
	for (const { text, token } of runs) {
		text.split(/\r?\n/).forEach((part, index) => {
			if (index) lines.push([]);
			if (part) lines[lines.length - 1].push({ text: part, token });
		});
	}
	return lines;
}
