import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { scanFileForEnvUsages } from './envVarScanner';

suite('envVarScanner', () => {
	let root: string;

	setup(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'envaccord-'));
	});

	teardown(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	function writeAndScan(fileName: string, content: string) {
		const filePath = path.join(root, fileName);
		fs.writeFileSync(filePath, content);
		return scanFileForEnvUsages(filePath);
	}

	test('finds direct property access on process.env', () => {
		const usages = writeAndScan('a.ts', 'const key = process.env.STRIPE_KEY;');
		assert.deepStrictEqual(usages.map((u) => [u.name, u.kind]), [['STRIPE_KEY', 'process.env']]);
	});

	test('finds bracket access on process.env', () => {
		const usages = writeAndScan('a.ts', "const key = process.env['STRIPE_KEY'];");
		assert.deepStrictEqual(usages.map((u) => u.name), ['STRIPE_KEY']);
	});

	test('finds destructured variables from process.env', () => {
		const usages = writeAndScan('a.ts', 'const { STRIPE_KEY, API_URL } = process.env;');
		assert.deepStrictEqual(usages.map((u) => u.name).sort(), ['API_URL', 'STRIPE_KEY']);
	});

	test('finds renamed destructured variables by their source property name', () => {
		const usages = writeAndScan('a.ts', 'const { STRIPE_KEY: key } = process.env;');
		assert.deepStrictEqual(usages.map((u) => u.name), ['STRIPE_KEY']);
	});

	test('ignores rest spread in destructuring', () => {
		const usages = writeAndScan('a.ts', 'const { STRIPE_KEY, ...rest } = process.env;');
		assert.deepStrictEqual(usages.map((u) => u.name), ['STRIPE_KEY']);
	});

	test('finds import.meta.env usage', () => {
		const usages = writeAndScan('a.ts', 'const url = import.meta.env.API_URL;');
		assert.deepStrictEqual(usages.map((u) => [u.name, u.kind]), [['API_URL', 'import.meta.env']]);
	});

	test('records the line number of the usage', () => {
		const usages = writeAndScan('a.ts', '\n\nconst key = process.env.STRIPE_KEY;');
		assert.strictEqual(usages[0].line, 3);
	});

	test('does not false-positive on unrelated property access', () => {
		const usages = writeAndScan('a.ts', 'const key = someOtherObject.env.STRIPE_KEY;');
		assert.deepStrictEqual(usages, []);
	});

	test('parses JSX files without throwing', () => {
		const usages = writeAndScan('a.tsx', 'export const C = () => <div>{process.env.STRIPE_KEY}</div>;');
		assert.deepStrictEqual(usages.map((u) => u.name), ['STRIPE_KEY']);
	});
});
