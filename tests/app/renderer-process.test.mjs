import test from 'node:test';
import assert from 'node:assert/strict';
import { rendererEnvironment, rendererPython } from '../../server/renderer-process.mjs';
test('Windows renderer keeps OS paths but never cloud credentials', () => {
  const env = rendererEnvironment({ Path: 'bin', SystemRoot: 'C:/Windows', TEMP: 'tmp', SUPABASE_SERVICE_ROLE_KEY: 'secret', OTHER_SECRET: 'secret' }, 'C:/studio', 'win32');
  assert.equal(env.PATH, 'bin');
  assert.equal(env.SystemRoot, 'C:/Windows');
  assert.equal(env.TEMP, 'tmp');
  assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, undefined);
  assert.equal(env.OTHER_SECRET, undefined);
  assert.equal(rendererPython({}, 'win32'), 'python');
  assert.equal(rendererPython({}, 'linux'), 'python3');
  assert.equal(rendererPython({ PYTHON: 'custom' }, 'win32'), 'custom');
});
