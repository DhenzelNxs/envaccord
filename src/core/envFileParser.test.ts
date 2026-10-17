import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseEnvFile } from './envFileParser';

suite('envFileParser', () => {
	let root: string;

	setup(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'envaccord-'));
	});

	teardown(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	test('parses simple KEY=VALUE lines', () => {
		const filePath = path.join(root, '.env.example');
		fs.writeFileSync(filePath, 'FOO=bar\nBAZ=qux\n');

		assert.deepStrictEqual(parseEnvFile(filePath).map((d) => d.name), ['FOO', 'BAZ']);
	});

	test('ignores comments and blank lines', () => {
		const filePath = path.join(root, '.env.example');
		fs.writeFileSync(filePath, '# a comment\n\nFOO=bar\n   \n# another\nBAZ=qux\n');

		assert.deepStrictEqual(parseEnvFile(filePath).map((d) => d.name), ['FOO', 'BAZ']);
	});

	test('tracks the line number of each declaration', () => {
		const filePath = path.join(root, '.env.example');
		fs.writeFileSync(filePath, '# header\nFOO=bar\nBAZ=qux\n');

		const declarations = parseEnvFile(filePath);

		assert.strictEqual(declarations.find((d) => d.name === 'FOO')!.line, 2);
		assert.strictEqual(declarations.find((d) => d.name === 'BAZ')!.line, 3);
	});

	test('handles an optional export prefix', () => {
		const filePath = path.join(root, '.env.example');
		fs.writeFileSync(filePath, 'export FOO=bar\n');

		assert.deepStrictEqual(parseEnvFile(filePath).map((d) => d.name), ['FOO']);
	});
});
