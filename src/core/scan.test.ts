import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { scanProject } from './scan';

suite('scanProject', () => {
	let root: string;

	setup(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'envaccord-'));
	});

	teardown(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	test('finds drift across a small project tree', () => {
		fs.writeFileSync(path.join(root, '.env.example'), 'API_URL=\nOLD_FLAG=\n');
		fs.writeFileSync(path.join(root, '.env'), 'API_URL=http://localhost\nUNUSED_FLAG=true\n');

		const srcDir = path.join(root, 'src');
		fs.mkdirSync(srcDir);
		fs.writeFileSync(
			path.join(srcDir, 'index.ts'),
			'const url = process.env.API_URL;\nconst key = process.env.STRIPE_KEY;\n'
		);

		const result = scanProject(root);

		const categories = result.findings.map((f) => `${f.category}:${f.name}`).sort();
		assert.deepStrictEqual(categories, [
			'missing-from-docs:STRIPE_KEY',
			'missing-locally:STRIPE_KEY',
			'stale-in-docs:OLD_FLAG',
			'stale-locally:UNUSED_FLAG'
		]);
	});

	test('ignores node_modules', () => {
		fs.writeFileSync(path.join(root, '.env.example'), '');

		const nodeModules = path.join(root, 'node_modules', 'some-pkg');
		fs.mkdirSync(nodeModules, { recursive: true });
		fs.writeFileSync(path.join(nodeModules, 'index.js'), 'const x = process.env.SHOULD_BE_IGNORED;');

		const result = scanProject(root);

		assert.deepStrictEqual(result.findings, []);
	});
});
