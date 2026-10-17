import { parseEnvContent } from './envFileParser';

/**
 * Suggests the rest of a `NAME=` declaration for an env file, Copilot-style
 * (ghost text you can accept the rest of). Given what's already typed on
 * the current line, finds a variable that's used somewhere in the code but
 * not yet declared in this document's current content, and returns just
 * the remaining text to insert — or null if nothing applies.
 */
export function suggestMissingVariableCompletion(
	usedNames: Iterable<string>,
	documentContent: string,
	documentPath: string,
	linePrefix: string
): string | null {
	if (linePrefix.includes('=')) {
		return null;
	}

	const declared = new Set(parseEnvContent(documentContent, documentPath).map((d) => d.name));
	const missing = [...usedNames].filter((name) => !declared.has(name)).sort();

	const match = missing.find((name) => name.startsWith(linePrefix));
	if (!match) {
		return null;
	}

	const insertText = `${match}=`.slice(linePrefix.length);
	return insertText.length > 0 ? insertText : null;
}
