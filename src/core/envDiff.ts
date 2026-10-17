import { DriftFinding, EnvFileDeclaration, EnvVarUsage } from './types';

/**
 * `null` for either declaration list means that file doesn't exist at all —
 * that category of check is skipped entirely rather than flagging every
 * single usage, since "you have no .env.example" is a different problem
 * than "this one variable is undocumented".
 */
export function computeDrift(
	usages: EnvVarUsage[],
	docDeclarations: EnvFileDeclaration[] | null,
	localDeclarations: EnvFileDeclaration[] | null
): DriftFinding[] {
	const findings: DriftFinding[] = [];
	const usedNames = new Set(usages.map((u) => u.name));

	if (docDeclarations) {
		const docNames = new Set(docDeclarations.map((d) => d.name));
		const seen = new Set<string>();
		for (const usage of usages) {
			if (!docNames.has(usage.name) && !seen.has(usage.name)) {
				seen.add(usage.name);
				findings.push({ category: 'missing-from-docs', name: usage.name, usage });
			}
		}

		for (const declaration of docDeclarations) {
			if (!usedNames.has(declaration.name)) {
				findings.push({ category: 'stale-in-docs', name: declaration.name, declaration });
			}
		}
	}

	if (localDeclarations) {
		const localNames = new Set(localDeclarations.map((d) => d.name));
		const seen = new Set<string>();
		for (const usage of usages) {
			if (!localNames.has(usage.name) && !seen.has(usage.name)) {
				seen.add(usage.name);
				findings.push({ category: 'missing-locally', name: usage.name, usage });
			}
		}

		for (const declaration of localDeclarations) {
			if (!usedNames.has(declaration.name)) {
				findings.push({ category: 'stale-locally', name: declaration.name, declaration });
			}
		}
	}

	return findings;
}
