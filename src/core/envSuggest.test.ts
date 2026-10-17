import * as assert from 'assert';
import { suggestMissingVariableCompletion } from './envSuggest';

suite('envSuggest', () => {
	test('suggests a missing variable on an empty line', () => {
		const result = suggestMissingVariableCompletion(['STRIPE_KEY'], '', '.env.example', '');
		assert.strictEqual(result, 'STRIPE_KEY=');
	});

	test('completes the remainder when a partial prefix is typed', () => {
		const result = suggestMissingVariableCompletion(['STRIPE_KEY'], '', '.env.example', 'STRI');
		assert.strictEqual(result, 'PE_KEY=');
	});

	test('suggests just the equals sign once the full name has been typed', () => {
		const result = suggestMissingVariableCompletion(['STRIPE_KEY'], '', '.env.example', 'STRIPE_KEY');
		assert.strictEqual(result, '=');
	});

	test('returns null once the line already has an equals sign', () => {
		const result = suggestMissingVariableCompletion(['STRIPE_KEY'], '', '.env.example', 'STRIPE_KEY=');
		assert.strictEqual(result, null);
	});

	test('returns null when the prefix does not match any missing variable', () => {
		const result = suggestMissingVariableCompletion(['STRIPE_KEY'], '', '.env.example', 'ZZZ');
		assert.strictEqual(result, null);
	});

	test('does not suggest a variable that is already declared in the document content', () => {
		const result = suggestMissingVariableCompletion(['STRIPE_KEY'], 'STRIPE_KEY=123\n', '.env.example', '');
		assert.strictEqual(result, null);
	});

	test('picks the alphabetically first missing variable on an empty line when there are several', () => {
		const result = suggestMissingVariableCompletion(['DATABASE_URL', 'API_URL'], '', '.env.example', '');
		assert.strictEqual(result, 'API_URL=');
	});

	test('returns null when there is nothing missing', () => {
		const result = suggestMissingVariableCompletion([], '', '.env.example', '');
		assert.strictEqual(result, null);
	});
});
