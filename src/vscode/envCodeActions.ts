import * as path from 'path';
import * as vscode from 'vscode';
import { DIAGNOSTIC_SOURCE } from './envDiagnostics';

export class EnvCodeActionProvider implements vscode.CodeActionProvider {
	static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

	constructor(private readonly getDocFilePath: () => string | null) {}

	provideCodeActions(
		_document: vscode.TextDocument,
		_range: vscode.Range | vscode.Selection,
		context: vscode.CodeActionContext
	): vscode.CodeAction[] {
		const docFile = this.getDocFilePath();
		if (!docFile) {
			return [];
		}

		const actions: vscode.CodeAction[] = [];

		for (const diagnostic of context.diagnostics) {
			if (diagnostic.source !== DIAGNOSTIC_SOURCE || typeof diagnostic.code !== 'string') {
				continue;
			}

			const [category, name] = diagnostic.code.split(':');
			if (category !== 'missing-from-docs') {
				continue;
			}

			const action = new vscode.CodeAction(
				`Add '${name}' to ${path.basename(docFile)}`,
				vscode.CodeActionKind.QuickFix
			);
			action.diagnostics = [diagnostic];
			action.command = {
				command: 'envaccord.addToDocs',
				title: 'Add to docs file',
				arguments: [docFile, name]
			};
			actions.push(action);
		}

		return actions;
	}
}

export async function addVariableToDocFile(docFile: string, name: string): Promise<void> {
	const uri = vscode.Uri.file(docFile);
	const document = await vscode.workspace.openTextDocument(uri);

	const lastLine = document.lineAt(document.lineCount - 1);
	const needsNewlineBefore = lastLine.text.trim().length > 0;

	const edit = new vscode.WorkspaceEdit();
	edit.insert(uri, lastLine.range.end, `${needsNewlineBefore ? '\n' : ''}${name}=\n`);
	await vscode.workspace.applyEdit(edit);
	await document.save();
}
