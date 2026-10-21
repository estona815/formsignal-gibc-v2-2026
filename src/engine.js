export const sampleFlow = {
  name: 'Newsletter sign-up',
  startId: 'start',
  steps: [
    { id: 'start', title: 'Start', subtitle: 'Landing point for the form', kind: 'start', next: 'contact', fields: [], requires: [] },
    { id: 'contact', title: 'Contact', subtitle: 'Collect basic information', kind: 'form', next: 'preferences', fields: [{ id: 'email', label: 'Email address', required: false, type: 'email' }], requires: [] },
    { id: 'preferences', title: 'Preferences', subtitle: 'Choose email updates', kind: 'decision', branches: { yes: 'review', no: null }, fields: [{ id: 'updates', label: 'Email updates', required: false, type: 'choice' }], requires: [] },
    { id: 'review', title: 'Review', subtitle: 'Confirm details before submitting', kind: 'form', next: 'submit', fields: [], requires: ['email'] },
    { id: 'submit', title: 'Submit', subtitle: 'Form complete', kind: 'end', fields: [], requires: [] }
  ]
};

export function cloneFlow(flow) {
  return JSON.parse(JSON.stringify(flow));
}

export function repairedFlow() {
  const flow = cloneFlow(sampleFlow);
  flow.steps.find((step) => step.id === 'preferences').branches.no = 'review';
  flow.steps.find((step) => step.id === 'contact').fields[0].required = true;
  return flow;
}

export function auditFlow(flow) {
  const byId = new Map(flow.steps.map((step) => [step.id, step]));
  const issues = [];
  const paths = [];
  const seenIssues = new Set();
  function addIssue(issue) {
    const key = `${issue.code}:${issue.stepId}:${issue.branch ?? ''}:${issue.fieldId ?? ''}`;
    if (!seenIssues.has(key)) { seenIssues.add(key); issues.push(issue); }
  }
  function visit(id, trail, guaranteed, seen) {
    const step = byId.get(id);
    if (!step) {
      addIssue({ code: 'MISSING_STEP', severity: 'error', stepId: trail.at(-1) ?? 'start', title: 'Path points to a missing step', detail: `The destination “${id}” does not exist.` });
      paths.push({ steps: trail, status: 'blocked' });
      return;
    }
    if (seen.has(id)) {
      addIssue({ code: 'CYCLE', severity: 'error', stepId: id, title: 'Path can loop before completion', detail: `The path returns to “${step.title}” before it can finish.` });
      paths.push({ steps: [...trail, id], status: 'blocked' });
      return;
    }
    const nextTrail = [...trail, id];
    const nextGuaranteed = new Set(guaranteed);
    for (const field of step.fields ?? []) if (field.required) nextGuaranteed.add(field.id);
    for (const fieldId of step.requires ?? []) {
      if (!nextGuaranteed.has(fieldId)) addIssue({ code: 'UNGARANTEED_FIELD', severity: 'warning', stepId: id, fieldId, title: `Required ${fieldId} is not guaranteed`, detail: `A user can reach “${step.title}” without a required ${fieldId} value. Make its input required or remove this dependency.` });
    }
    if (step.kind === 'end') {
      paths.push({ steps: nextTrail, status: 'complete' });
      return;
    }
    const outgoing = step.kind === 'decision'
      ? [['yes', step.branches?.yes], ['no', step.branches?.no]]
      : [['next', step.next]];
    for (const [branch, destination] of outgoing) {
      if (!destination) {
        addIssue({ code: 'DEAD_END', severity: 'error', stepId: id, branch, title: `Dead end on ${branch === 'next' ? 'next' : branch.toUpperCase()} branch`, detail: `The ${branch} path from “${step.title}” does not lead to another step. Users taking it cannot complete the form.` });
        paths.push({ steps: nextTrail, branch, status: 'blocked' });
      } else visit(destination, nextTrail, nextGuaranteed, new Set([...seen, id]));
    }
  }
  visit(flow.startId, [], new Set(), new Set());
  const reached = new Set(paths.flatMap((path) => path.steps));
  for (const step of flow.steps) if (!reached.has(step.id)) addIssue({ code: 'UNREACHABLE', severity: 'warning', stepId: step.id, title: `${step.title} is unreachable`, detail: 'No path from Start reaches this step.' });
  return { paths, issues, complete: paths.filter((path) => path.status === 'complete').length, blocked: paths.filter((path) => path.status === 'blocked').length };
}

export function updateStep(flow, stepId, updater) {
  return { ...flow, steps: flow.steps.map((step) => step.id === stepId ? updater(step) : step) };
}
