export type EnvUsageKind = 'process.env' | 'import.meta.env';

export interface EnvVarUsage {
	name: string;
	file: string;
	line: number;
	character: number;
	kind: EnvUsageKind;
}

export interface EnvFileDeclaration {
	name: string;
	file: string;
	line: number;
	character: number;
}

export type DriftCategory = 'missing-from-docs' | 'missing-locally' | 'stale-in-docs' | 'stale-locally';

export interface DriftFinding {
	category: DriftCategory;
	name: string;
	usage?: EnvVarUsage;
	declaration?: EnvFileDeclaration;
}
