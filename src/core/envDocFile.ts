import * as fs from 'fs';
import * as path from 'path';

const DOC_FILE_CANDIDATES = ['.env.example', '.env.sample', '.env.template'];

export function findEnvDocFile(root: string): string | null {
	for (const name of DOC_FILE_CANDIDATES) {
		const candidate = path.join(root, name);
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}
	return null;
}

export function findLocalEnvFile(root: string): string | null {
	const candidate = path.join(root, '.env');
	return fs.existsSync(candidate) ? candidate : null;
}
