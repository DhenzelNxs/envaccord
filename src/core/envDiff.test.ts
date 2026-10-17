import * as assert from 'assert';
import { computeDrift } from './envDiff';
import { EnvFileDeclaration, EnvVarUsage } from './types';

function usage(name: string): EnvVarUsage {
	return { name, file: 'src/index.ts', line: 1, character: 0, kind: 'process.env' };
}

function declaration(name: string): EnvFileDeclaration {
	return { name, file: '.env.example', line: 1, character: 0 };
}

suite('envDiff', () => {
	test('flags a variable used in code but missing from the docs and local env', () => {
		const findings = computeDrift([usage('STRIPE_KEY')], [], []);
		assert.deepStrictEqual(
			findings.map((f) => f.category),
			['missing-from-docs', 'missing-locally']
		);
	});

	test('does not flag a variable that is documented and declared locally', () => {
		const findings = computeDrift(
			[usage('STRIPE_KEY')],
			[declaration('STRIPE_KEY')],
			[declaration('STRIPE_KEY')]
		);
		assert.deepStrictEqual(findings, []);
	});

	test('flags a variable declared in docs but never used in code', () => {
		const findings = computeDrift([], [declaration('OLD_FLAG')], []);
		assert.deepStrictEqual(
			findings.map((f) => f.category),
			['stale-in-docs']
		);
	});

	test('flags a variable declared locally but never used in code', () => {
		const findings = computeDrift([], [], [declaration('UNUSED_FLAG')]);
		assert.deepStrictEqual(
			findings.map((f) => f.category),
			['stale-locally']
		);
	});

	test('skips documentation checks entirely when no docs file exists', () => {
		const findings = computeDrift([usage('STRIPE_KEY')], null, []);
		assert.deepStrictEqual(
			findings.map((f) => f.category),
			['missing-locally']
		);
	});

	test('skips local checks entirely when no local .env file exists', () => {
		const findings = computeDrift([usage('STRIPE_KEY')], [], null);
		assert.deepStrictEqual(
			findings.map((f) => f.category),
			['missing-from-docs']
		);
	});

	test('deduplicates repeated usage of the same variable across files', () => {
		const findings = computeDrift([usage('STRIPE_KEY'), usage('STRIPE_KEY')], [], []);
		assert.deepStrictEqual(
			findings.map((f) => f.category),
			['missing-from-docs', 'missing-locally']
		);
	});
});
