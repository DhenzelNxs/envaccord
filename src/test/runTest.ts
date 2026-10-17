import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
	try {
		const extensionDevelopmentPath = path.resolve(__dirname, '..', '..');
		const extensionTestsPath = path.resolve(__dirname, 'suite', 'index');
		const demoProjectPath = path.resolve(extensionDevelopmentPath, 'examples', 'demo-project');

		await runTests({
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: [demoProjectPath]
		});
	} catch (err) {
		console.error('Failed to run tests:', err);
		process.exit(1);
	}
}

main();
