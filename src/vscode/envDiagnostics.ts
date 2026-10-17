import * as path from 'path';
import * as vscode from 'vscode';
import { findEnvDocFile, findLocalEnvFile } from '../core/envDocFile';
import { parseEnvFile } from '../core/envFileParser';
import { scanFileForEnvUsages } from '../core/envVarScanner';
import { isSourceFile, walkSourceFiles } from '../core/fileWalker';
import { DriftCategory, EnvFileDeclaration } from '../core/types';

export const DIAGNOSTIC_SOURCE = 'envaccord';

interface ProjectState {
	docFile: string | null;
	docDeclarations: EnvFileDeclaration[] | null;
	docNames: Set<string>;
	localEnvFile: string | null;
	localDeclarations: EnvFileDeclaration[] | null;
	localNames: Set<string> | null;
	usedNames: Set<string>;
}

const EMPTY_STATE: ProjectState = {
	docFile: null,
	docDeclarations: null,
	docNames: new Set(),
	localEnvFile: null,
	localDeclarations: null,
	localNames: null,
	usedNames: new Set()
};

/**
 * Owns the diagnostic collection and the cached, parsed state of the
 * project's env doc/local files. Per-file checks (missing-from-docs,
 * missing-locally) are cheap and run on every open/save of a source file.
 * The stale checks need the whole source tree, so the usedNames set is
 * only recomputed on activation and whenever the env files themselves
 * change — then reused for both the doc file and the local .env.
 */
export class EnvDiagnostics {
	private readonly collection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
	private state: ProjectState = EMPTY_STATE;

	constructor(private readonly workspaceRoot: string) {}

	dispose(): void {
		this.collection.dispose();
	}

	get diagnosticCollection(): vscode.DiagnosticCollection {
		return this.collection;
	}

	getDocFilePath(): string | null {
		return this.state.docFile;
	}

	getUsedVariableNames(): Set<string> {
		return this.state.usedNames;
	}

	refreshProjectState(): void {
		const docFile = findEnvDocFile(this.workspaceRoot);
		const docDeclarations = docFile ? parseEnvFile(docFile) : null;

		const localEnvFile = findLocalEnvFile(this.workspaceRoot);
		const localDeclarations = localEnvFile ? parseEnvFile(localEnvFile) : null;

		const usedNames = new Set<string>();
		for (const file of walkSourceFiles(this.workspaceRoot)) {
			for (const usage of scanFileForEnvUsages(file)) {
				usedNames.add(usage.name);
			}
		}

		this.state = {
			docFile,
			docDeclarations,
			docNames: new Set((docDeclarations ?? []).map((d) => d.name)),
			localEnvFile,
			localDeclarations,
			localNames: localDeclarations ? new Set(localDeclarations.map((d) => d.name)) : null,
			usedNames
		};

		this.refreshStaleDiagnostics(this.state.docFile, this.state.docDeclarations, 'stale-in-docs');
		this.refreshStaleDiagnostics(this.state.localEnvFile, this.state.localDeclarations, 'stale-locally');
	}

	refreshFileDiagnostics(document: vscode.TextDocument): void {
		if (document.uri.scheme !== 'file' || !isSourceFile(document.uri.fsPath)) {
			return;
		}

		const usages = scanFileForEnvUsages(document.uri.fsPath);
		const diagnostics: vscode.Diagnostic[] = [];

		for (const usage of usages) {
			const range = new vscode.Range(
				usage.line - 1,
				usage.character,
				usage.line - 1,
				usage.character + usage.name.length
			);

			if (this.state.docFile && !this.state.docNames.has(usage.name)) {
				diagnostics.push(
					this.buildDiagnostic(
						range,
						`Environment variable '${usage.name}' is used here but not declared in ${path.basename(this.state.docFile)}.`,
						'missing-from-docs',
						usage.name,
						vscode.DiagnosticSeverity.Warning
					)
				);
			}

			if (this.state.localEnvFile && this.state.localNames && !this.state.localNames.has(usage.name)) {
				diagnostics.push(
					this.buildDiagnostic(
						range,
						`Environment variable '${usage.name}' is used here but not declared in your local .env.`,
						'missing-locally',
						usage.name,
						vscode.DiagnosticSeverity.Warning
					)
				);
			}
		}

		this.collection.set(document.uri, diagnostics);
	}

	clearFileDiagnostics(uri: vscode.Uri): void {
		this.collection.delete(uri);
	}

	/** Flags declarations in `file` (either the docs file or the local .env) that no source file uses anywhere. */
	private refreshStaleDiagnostics(
		file: string | null,
		declarations: EnvFileDeclaration[] | null,
		category: Extract<DriftCategory, 'stale-in-docs' | 'stale-locally'>
	): void {
		if (!file || !declarations) {
			return;
		}

		const diagnostics: vscode.Diagnostic[] = [];
		for (const declaration of declarations) {
			if (!this.state.usedNames.has(declaration.name)) {
				const range = new vscode.Range(
					declaration.line - 1,
					declaration.character,
					declaration.line - 1,
					declaration.character + declaration.name.length
				);
				diagnostics.push(
					this.buildDiagnostic(
						range,
						`Environment variable '${declaration.name}' is declared here but not used anywhere in the code.`,
						category,
						declaration.name,
						vscode.DiagnosticSeverity.Information
					)
				);
			}
		}

		this.collection.set(vscode.Uri.file(file), diagnostics);
	}

	private buildDiagnostic(
		range: vscode.Range,
		message: string,
		category: DriftCategory,
		name: string,
		severity: vscode.DiagnosticSeverity
	): vscode.Diagnostic {
		const diagnostic = new vscode.Diagnostic(range, message, severity);
		diagnostic.source = DIAGNOSTIC_SOURCE;
		diagnostic.code = `${category}:${name}`;
		return diagnostic;
	}
}
