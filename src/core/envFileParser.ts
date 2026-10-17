import * as fs from 'fs';
import { EnvFileDeclaration } from './types';

const DECLARATION_PATTERN = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;

export function parseEnvContent(content: string, filePath: string): EnvFileDeclaration[] {
	const lines = content.split(/\r?\n/);
	const declarations: EnvFileDeclaration[] = [];

	lines.forEach((lineText, index) => {
		const trimmed = lineText.trim();
		if (trimmed === '' || trimmed.startsWith('#')) {
			return;
		}

		const match = DECLARATION_PATTERN.exec(lineText);
		if (match) {
			const character = lineText.indexOf(match[1], match.index);
			declarations.push({ name: match[1], file: filePath, line: index + 1, character });
		}
	});

	return declarations;
}

export function parseEnvFile(filePath: string): EnvFileDeclaration[] {
	return parseEnvContent(fs.readFileSync(filePath, 'utf8'), filePath);
}
