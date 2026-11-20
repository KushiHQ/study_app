// Bundles study_web_app's mock GraphQL API into a standalone Node server with CORS,
// so the Expo app (web) can sign in with code 123456 without touching production.
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
const WEB = process.argv[2];
const OUT = process.argv[3];
const require = createRequire(path.join(WEB, 'package.json'));
const esbuild = require('esbuild');
const lib = path.join(WEB, 'src/lib');
const globPlugin = {
	name: 'glob',
	setup(b) {
		b.onLoad({ filter: /mock.index.ts$/ }, (args) => {
			let src = readFileSync(args.path, 'utf8');
			const dir = path.join(path.dirname(args.path), 'bundles');
			const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
			const imports = files.map((f, i) => `import __b${i} from './bundles/${f}';`).join('\n');
			const obj = `{${files.map((f, i) => `'${f}': __b${i}`).join(',')}}`;
			src = src.replace(/import\.meta\.glob<[^>]+>\([^)]*\)/, obj);
			return { contents: imports + '\n' + src, loader: 'ts', resolveDir: path.dirname(args.path) };
		});
	}
};
await esbuild.build({
	stdin: {
		contents: `
import http from 'node:http';
import { execute } from '${path.join(lib, 'server/mock/index.ts').split(path.sep).join('/')}';
const port = Number(process.env.PORT || 4100);
http.createServer(async (req, res) => {
	res.setHeader('access-control-allow-origin', '*');
	res.setHeader('access-control-allow-headers', 'content-type, authorization');
	res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
	if (req.method === 'OPTIONS') return res.end();
	let body = '';
	for await (const c of req) body += c;
	try {
		const { query, variables } = JSON.parse(body || '{}');
		const token = (req.headers.authorization || '').replace(/^Bearer /, '') || null;
		const out = await execute(query, variables, token);
		res.setHeader('content-type', 'application/json');
		res.end(JSON.stringify(out));
	} catch (e) {
		res.statusCode = 400;
		res.end(JSON.stringify({ errors: [{ message: String(e) }] }));
	}
}).listen(port, () => console.log('mock api on ' + port));
`,
		resolveDir: WEB,
		loader: 'ts'
	},
	bundle: true,
	platform: 'node',
	format: 'esm',
	outfile: OUT,
	alias: { $lib: lib },
	define: { __MOCK_API__: 'true' },
	plugins: [globPlugin],
	banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
	logLevel: 'warning'
});
console.log('built', OUT);
