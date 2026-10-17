#!/usr/bin/env node
import { scanProject } from './core/scan';
import { DriftFinding } from './core/types';

function main(): void {
	const args = process.argv.slice(2);
	const jsonFlag = args.includes('--json');
	const root = args.find((a) => !a.startsWith('--')) ?? process.cwd();

	const result = scanProject(root);

	if (jsonFlag) {
		console.log(JSON.stringify(result, null, 2));
		return;
	}

	if (!result.docFile) {
		console.log('No .env.example/.env.sample/.env.template found — skipping documentation checks.');
	}
	if (!result.localEnvFile) {
		console.log('No local .env file found — skipping local checks.');
	}

	if (result.findings.length === 0) {
		console.log('No drift found.');
		return;
	}

	for (const finding of result.findings) {
		console.log(formatFinding(finding));
	}

	const staleCategories = new Set(['stale-in-docs', 'stale-locally']);
	process.exitCode = result.findings.some((f) => !staleCategories.has(f.category)) ? 1 : 0;
}

function formatFinding(finding: DriftFinding): string {
	switch (finding.category) {
		case 'missing-from-docs':
			return `[missing-from-docs] ${finding.name} — used at ${finding.usage!.file}:${finding.usage!.line}, not declared in the docs file`;
		case 'missing-locally':
			return `[missing-locally] ${finding.name} — used at ${finding.usage!.file}:${finding.usage!.line}, not declared in your local .env`;
		case 'stale-in-docs':
			return `[stale-in-docs] ${finding.name} — declared at ${finding.declaration!.file}:${finding.declaration!.line}, not used anywhere in the code`;
		case 'stale-locally':
			return `[stale-locally] ${finding.name} — declared at ${finding.declaration!.file}:${finding.declaration!.line}, not used anywhere in the code`;
	}
}

main();
