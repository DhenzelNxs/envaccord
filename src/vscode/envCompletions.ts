import * as path from 'path';
import * as vscode from 'vscode';
import { suggestMissingVariableCompletion } from '../core/envSuggest';

const ENV_FILE_NAMES = new Set(['.env', '.env.example', '.env.sample', '.env.template']);

export class EnvInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
	constructor(private readonly getUsedVariableNames: () => Set<string>) {}

	provideInlineCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position
	): vscode.InlineCompletionItem[] | undefined {
		if (!ENV_FILE_NAMES.has(path.basename(document.fileName))) {
			return undefined;
		}

		const linePrefix = document.lineAt(position.line).text.slice(0, position.character);
		const insertText = suggestMissingVariableCompletion(
			this.getUsedVariableNames(),
			document.getText(),
			document.fileName,
			linePrefix
		);

		if (!insertText) {
			return undefined;
		}

		return [new vscode.InlineCompletionItem(insertText, new vscode.Range(position, position))];
	}
}
