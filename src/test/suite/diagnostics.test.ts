import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

suite('EnvAccord — Diagnostics', () => {
	suiteSetup(async () => {
		const extension = vscode.extensions.getExtension('your-publisher-id.envaccord');
		await extension?.activate();
	});

	test('flags a variable used in code but missing from docs and local .env', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		assert.ok(
			workspaceFolders && workspaceFolders.length > 0,
			'test host was not launched with the demo project open'
		);

		const fileUri = vscode.Uri.file(path.join(workspaceFolders![0].uri.fsPath, 'src', 'index.ts'));
		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(fileUri));

		// Diagnostics are published asynchronously relative to showTextDocument.
		await new Promise((resolve) => setTimeout(resolve, 500));

		const diagnostics = vscode.languages.getDiagnostics(fileUri);
		const codes = diagnostics.map((d) => d.code);

		assert.ok(codes.includes('missing-from-docs:STRIPE_SECRET_KEY'), 'expected a missing-from-docs diagnostic');
		assert.ok(codes.includes('missing-locally:STRIPE_SECRET_KEY'), 'expected a missing-locally diagnostic');
	});

	test('flags a declared variable that is never used, on the docs file itself', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		assert.ok(workspaceFolders && workspaceFolders.length > 0);

		const docUri = vscode.Uri.file(path.join(workspaceFolders![0].uri.fsPath, '.env.example'));
		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(docUri));

		await new Promise((resolve) => setTimeout(resolve, 500));

		const diagnostics = vscode.languages.getDiagnostics(docUri);
		const codes = diagnostics.map((d) => d.code);

		assert.ok(codes.includes('stale-in-docs:OLD_FEATURE_FLAG'), 'expected a stale-in-docs diagnostic');
	});

	test('flags a locally declared variable that is never used, on the local .env file', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		assert.ok(workspaceFolders && workspaceFolders.length > 0);

		const envUri = vscode.Uri.file(path.join(workspaceFolders![0].uri.fsPath, '.env'));
		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(envUri));

		await new Promise((resolve) => setTimeout(resolve, 500));

		const diagnostics = vscode.languages.getDiagnostics(envUri);
		const codes = diagnostics.map((d) => d.code);

		assert.ok(codes.includes('stale-locally:IN_DEBUG'), 'expected a stale-locally diagnostic');
	});

	test('keeps the stale-in-docs diagnostic after the docs file is closed and reopened', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		assert.ok(workspaceFolders && workspaceFolders.length > 0);

		const docUri = vscode.Uri.file(path.join(workspaceFolders![0].uri.fsPath, '.env.example'));

		for (let i = 0; i < 3; i++) {
			await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(docUri));
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		}

		await new Promise((resolve) => setTimeout(resolve, 500));

		const diagnostics = vscode.languages.getDiagnostics(docUri);
		const codes = diagnostics.map((d) => d.code);

		assert.ok(
			codes.includes('stale-in-docs:OLD_FEATURE_FLAG'),
			'stale-in-docs diagnostic should survive open/close cycles on the docs file'
		);
	});

	test('offers a quick fix to add the missing variable to the docs file', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		assert.ok(workspaceFolders && workspaceFolders.length > 0);

		const fileUri = vscode.Uri.file(path.join(workspaceFolders![0].uri.fsPath, 'src', 'index.ts'));
		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(fileUri));
		await new Promise((resolve) => setTimeout(resolve, 500));

		const diagnostics = vscode.languages
			.getDiagnostics(fileUri)
			.filter((d) => d.code === 'missing-from-docs:STRIPE_SECRET_KEY');
		assert.ok(diagnostics.length > 0, 'expected the missing-from-docs diagnostic to exist first');

		const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
			'vscode.executeCodeActionProvider',
			fileUri,
			diagnostics[0].range
		);

		assert.ok(
			actions?.some((a) => a.title.includes("Add 'STRIPE_SECRET_KEY'")),
			'expected a quick fix offering to add STRIPE_SECRET_KEY to the docs file'
		);
	});
});
