import { computeDrift } from './envDiff';
import { findEnvDocFile, findLocalEnvFile } from './envDocFile';
import { parseEnvFile } from './envFileParser';
import { scanFileForEnvUsages } from './envVarScanner';
import { walkSourceFiles } from './fileWalker';
import { DriftFinding } from './types';

export interface ScanResult {
	docFile: string | null;
	localEnvFile: string | null;
	findings: DriftFinding[];
}

export function scanProject(root: string): ScanResult {
	const usages = walkSourceFiles(root).flatMap((file) => scanFileForEnvUsages(file));

	const docFile = findEnvDocFile(root);
	const docDeclarations = docFile ? parseEnvFile(docFile) : null;

	const localEnvFile = findLocalEnvFile(root);
	const localDeclarations = localEnvFile ? parseEnvFile(localEnvFile) : null;

	const findings = computeDrift(usages, docDeclarations, localDeclarations);

	return { docFile, localEnvFile, findings };
}
