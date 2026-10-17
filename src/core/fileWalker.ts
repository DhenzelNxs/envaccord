import * as fs from 'fs';
import * as path from 'path';

const IGNORED_DIR_NAMES = new Set(['node_modules', 'dist', 'build', 'out', '.git', '.vscode-test']);
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

export function isSourceFile(filePath: string): boolean {
	return SOURCE_EXTENSIONS.has(path.extname(filePath));
}

export function walkSourceFiles(root: string): string[] {
	const results: string[] = [];

	function walk(dir: string): void {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				if (!IGNORED_DIR_NAMES.has(entry.name) && !entry.name.startsWith('.')) {
					walk(path.join(dir, entry.name));
				}
				continue;
			}

			if (isSourceFile(entry.name)) {
				results.push(path.join(dir, entry.name));
			}
		}
	}

	walk(root);
	return results;
}
