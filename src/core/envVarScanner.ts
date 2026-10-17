import * as fs from 'fs';
import * as ts from 'typescript';
import { EnvUsageKind, EnvVarUsage } from './types';

export function scanFileForEnvUsages(filePath: string): EnvVarUsage[] {
	const sourceText = fs.readFileSync(filePath, 'utf8');
	const sourceFile = ts.createSourceFile(
		filePath,
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		scriptKindForFile(filePath)
	);

	const usages: EnvVarUsage[] = [];

	function visit(node: ts.Node): void {
		const directUsage = matchDirectEnvUsage(node, sourceFile, filePath);
		if (directUsage) {
			usages.push(directUsage);
		}

		usages.push(...matchDestructuredEnvUsages(node, sourceFile, filePath));

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return usages;
}

function scriptKindForFile(filePath: string): ts.ScriptKind {
	if (filePath.endsWith('.tsx')) {
		return ts.ScriptKind.TSX;
	}
	if (filePath.endsWith('.jsx')) {
		return ts.ScriptKind.JSX;
	}
	if (filePath.endsWith('.ts')) {
		return ts.ScriptKind.TS;
	}
	return ts.ScriptKind.JS;
}

/** Position of the variable-name token itself, not the whole expression — so an editor can underline just the name. */
function positionOf(node: ts.Node, sourceFile: ts.SourceFile): { line: number; character: number } {
	const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
	return { line: line + 1, character };
}

/** Matches `process.env.NAME` and `process.env['NAME']` (and the import.meta.env equivalents). */
function matchDirectEnvUsage(node: ts.Node, sourceFile: ts.SourceFile, filePath: string): EnvVarUsage | null {
	if (ts.isPropertyAccessExpression(node)) {
		const kind = envObjectKind(node.expression);
		if (kind) {
			return { name: node.name.text, file: filePath, ...positionOf(node.name, sourceFile), kind };
		}
	}

	if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
		const kind = envObjectKind(node.expression);
		if (kind) {
			return {
				name: node.argumentExpression.text,
				file: filePath,
				...positionOf(node.argumentExpression, sourceFile),
				kind
			};
		}
	}

	return null;
}

/** Matches `const { NAME, OTHER: renamed } = process.env` (and import.meta.env). */
function matchDestructuredEnvUsages(node: ts.Node, sourceFile: ts.SourceFile, filePath: string): EnvVarUsage[] {
	if (!ts.isVariableDeclaration(node) || !node.initializer || !ts.isObjectBindingPattern(node.name)) {
		return [];
	}

	const kind = envObjectKind(node.initializer);
	if (!kind) {
		return [];
	}

	const usages: EnvVarUsage[] = [];
	for (const element of node.name.elements) {
		if (element.dotDotDotToken) {
			continue; // rest spread (...rest) can't be resolved to a specific variable name
		}

		const propertyName = element.propertyName ?? element.name;
		if (ts.isIdentifier(propertyName)) {
			usages.push({ name: propertyName.text, file: filePath, ...positionOf(propertyName, sourceFile), kind });
		}
	}
	return usages;
}

/** Recognizes a `process.env` or `import.meta.env` expression. */
function envObjectKind(expr: ts.Expression): EnvUsageKind | null {
	if (!ts.isPropertyAccessExpression(expr) || expr.name.text !== 'env') {
		return null;
	}

	if (ts.isIdentifier(expr.expression) && expr.expression.text === 'process') {
		return 'process.env';
	}

	if (ts.isMetaProperty(expr.expression) && expr.expression.keywordToken === ts.SyntaxKind.ImportKeyword) {
		return 'import.meta.env';
	}

	return null;
}
