import * as vscode from 'vscode';
import { isSourceFile } from '../core/fileWalker';
import { addVariableToDocFile, EnvCodeActionProvider } from './envCodeActions';
import { EnvInlineCompletionProvider } from './envCompletions';
import { EnvDiagnostics } from './envDiagnostics';

export function activate(context: vscode.ExtensionContext): void {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		return;
	}

	const diagnostics = new EnvDiagnostics(workspaceFolder.uri.fsPath);

	const refreshAll = () => {
		diagnostics.refreshProjectState();
		for (const document of vscode.workspace.textDocuments) {
			diagnostics.refreshFileDiagnostics(document);
		}
	};
	refreshAll();

	const codeActionProvider = vscode.languages.registerCodeActionsProvider(
		{ scheme: 'file' },
		new EnvCodeActionProvider(() => diagnostics.getDocFilePath()),
		{ providedCodeActionKinds: EnvCodeActionProvider.providedCodeActionKinds }
	);

	const inlineCompletionProvider = vscode.languages.registerInlineCompletionItemProvider(
		{ pattern: '**/.env*' },
		new EnvInlineCompletionProvider(() => diagnostics.getUsedVariableNames())
	);

	const addToDocsCommand = vscode.commands.registerCommand(
		'envaccord.addToDocs',
		async (docFile: string, name: string) => {
			await addVariableToDocFile(docFile, name);
			refreshAll();
		}
	);

	const openListener = vscode.workspace.onDidOpenTextDocument((document) =>
		diagnostics.refreshFileDiagnostics(document)
	);
	const saveListener = vscode.workspace.onDidSaveTextDocument((document) =>
		diagnostics.refreshFileDiagnostics(document)
	);
	const closeListener = vscode.workspace.onDidCloseTextDocument((document) => {
		// Only clear per-file diagnostics for source files. The docs file's
		// stale-in-docs diagnostics must survive its tab being closed (e.g.
		// VS Code's preview-tab auto-close on single-click navigation) —
		// they represent project-wide state, not "this open file has an
		// issue".
		if (isSourceFile(document.uri.fsPath)) {
			diagnostics.clearFileDiagnostics(document.uri);
		}
	});

	const envWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspaceFolder, '.env*'));
	envWatcher.onDidChange(refreshAll);
	envWatcher.onDidCreate(refreshAll);
	envWatcher.onDidDelete(refreshAll);

	context.subscriptions.push(
		diagnostics,
		codeActionProvider,
		inlineCompletionProvider,
		addToDocsCommand,
		openListener,
		saveListener,
		closeListener,
		envWatcher
	);
}

export function deactivate(): void {}
