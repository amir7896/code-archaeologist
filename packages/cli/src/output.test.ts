import assert from 'node:assert/strict';
import { test } from 'node:test';
import { writeErr, writeOk } from './output';

test('JSON output never includes raw bearer tokens', () => {
  let stdout = '';
  const io = { stdout: { write: (chunk: string) => { stdout += chunk; } }, stderr: { write: () => undefined } };
  writeErr(io, true, 'status', 'AUTH', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signaturexx');
  assert.match(stdout, /\[redacted\]/);
  assert.doesNotMatch(stdout, /Bearer eyJ/);
});

test('text success writes a plain line', () => {
  let stdout = '';
  const io = { stdout: { write: (chunk: string) => { stdout += chunk; } }, stderr: { write: () => undefined } };
  writeOk(io, false, 'status', { ok: true }, 'READY');
  assert.equal(stdout, 'READY\n');
});
