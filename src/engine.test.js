import test from 'node:test';
import assert from 'node:assert/strict';
import { auditFlow, cloneFlow, repairedFlow, sampleFlow } from './engine.js';

test('broken sample reports a dead end and an optional required dependency', () => {
  const result = auditFlow(sampleFlow);
  assert.equal(result.paths.length, 2);
  assert.equal(result.complete, 1);
  assert.equal(result.blocked, 1);
  assert.deepEqual(result.issues.map((issue) => issue.code).sort(), ['DEAD_END', 'UNGARANTEED_FIELD']);
});

test('repaired sample has two complete routes and no findings', () => {
  const result = auditFlow(repairedFlow());
  assert.equal(result.complete, 2);
  assert.equal(result.blocked, 0);
  assert.deepEqual(result.issues, []);
});

test('cycle and unreachable steps are detected without hanging', () => {
  const flow = cloneFlow(repairedFlow());
  flow.steps.find((step) => step.id === 'review').next = 'preferences';
  const result = auditFlow(flow);
  assert.equal(result.blocked, 2);
  assert.ok(result.issues.some((issue) => issue.code === 'CYCLE'));
  assert.ok(result.issues.some((issue) => issue.code === 'UNREACHABLE' && issue.stepId === 'submit'));
});
