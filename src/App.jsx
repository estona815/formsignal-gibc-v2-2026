import React, { useMemo, useState } from 'react';
import { auditFlow, cloneFlow, repairedFlow, sampleFlow, updateStep } from './engine.js';

const icons = {
  folder: <><path d="M3 5h6l2 2h10v12H3z" /><path d="M3 9h18" /></>,
  play: <path d="m7 4 13 8-13 8z" />,
  file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  back: <path d="M20 12H4m6-6-6 6 6 6" />,
  rotate: <><path d="M4 11a8 8 0 1 1 2 6" /><path d="M4 4v7h7" /></>,
  check: <path d="m4 12 5 5L20 6" />,
  alert: <><path d="m12 2 10 18H2z" /><path d="M12 8v5m0 3v.1" /></>,
  spark: <><path d="m12 2 2 7 7 3-7 2-2 8-2-8-7-2 7-3z" /></>,
  close: <path d="M5 5l14 14M19 5 5 19" />,
};
function Icon({ name, size = 18 }) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>;
}

function stepById(flow, id) { return flow.steps.find((step) => step.id === id); }

function diagram(flow) {
  const coords = new Map();
  const sequence = [];
  let id = flow.startId;
  const visited = new Set();
  while (id && !visited.has(id) && sequence.length < 20) {
    visited.add(id); sequence.push(id);
    const step = stepById(flow, id);
    id = step?.kind === 'decision' ? step.branches?.yes : step?.next;
  }
  sequence.forEach((stepId, index) => coords.set(stepId, { x: index < 3 ? 270 : 145, y: 72 + index * 124 }));
  const decision = flow.steps.find((step) => step.kind === 'decision');
  const deadEnd = decision && !decision.branches?.no ? { x: 390, y: 72 + sequence.indexOf(decision.id) * 124 + 124 } : null;
  return { coords, sequence, decision, deadEnd, height: Math.max(670, 155 + (sequence.length - 1) * 124) };
}

function Connector({ from, to, color = '#7890a5', branch, bend = false }) {
  if (!from || !to) return null;
  const x1 = from.x, y1 = from.y + 34, x2 = to.x, y2 = to.y - 34;
  const curve = bend || x1 !== x2;
  const path = curve ? `M ${x1} ${y1} C ${x1} ${y1 + 48}, ${x2} ${y2 - 48}, ${x2} ${y2}` : `M ${x1} ${y1} L ${x2} ${y2}`;
  return <g><path d={path} fill="none" stroke={color} strokeWidth="2.1" markerEnd={color === '#dc4b4b' ? 'url(#arrowRed)' : 'url(#arrowDefault)'} />{branch && <text x={(x1 + x2) / 2 + (x2 > x1 ? 9 : -24)} y={(y1 + y2) / 2 - 10} fill={color} fontSize="15" fontWeight="700">{branch}</text>}</g>;
}

function FlowGraph({ flow, selectedId, onSelect }) {
  const view = diagram(flow);
  return <div className="graph-scroll"><div className="graph-canvas" style={{ height: view.height }}>
    <svg className="graph-lines" width="520" height={view.height} viewBox={`0 0 520 ${view.height}`} aria-hidden="true">
      <defs><marker id="arrowDefault" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="#7890a5" strokeWidth="1.8" /></marker><marker id="arrowRed" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="#dc4b4b" strokeWidth="1.8" /></marker></defs>
      {view.sequence.slice(0, -1).map((id, index) => {
        const current = stepById(flow, id); const next = view.coords.get(view.sequence[index + 1]);
        const sharedDestination = current.kind === 'decision' && current.branches?.yes === current.branches?.no;
        return <Connector key={id} from={view.coords.get(id)} to={next} color={current.kind === 'decision' ? '#168f81' : '#718496'} branch={current.kind === 'decision' ? sharedDestination ? 'Yes / No' : 'Yes' : undefined} />;
      })}
      {view.decision && (view.deadEnd ? <Connector from={view.coords.get(view.decision.id)} to={view.deadEnd} color="#dc4b4b" branch="No" bend /> : view.decision.branches.no !== view.decision.branches.yes && <Connector from={view.coords.get(view.decision.id)} to={view.coords.get(view.decision.branches.no)} color="#168f81" branch="No" bend />)}
    </svg>
    {view.sequence.map((id, index) => { const step = stepById(flow, id); const point = view.coords.get(id); return <button type="button" key={id} className={`graph-node ${step.kind} ${selectedId === id ? 'selected' : ''}`} style={{ left: point.x, top: point.y }} onClick={() => onSelect(id)} aria-label={`Select ${step.title} step`}><span className="node-index">{index + 1}</span><span><strong>{step.title}</strong><small>{step.subtitle}</small></span></button>; })}
    {view.deadEnd && <div className="graph-node dead" style={{ left: view.deadEnd.x, top: view.deadEnd.y }}><span className="node-index">!</span><span><strong>Dead end</strong><small>No next step</small></span></div>}
    <div className="graph-key"><span><i className="line green" /> Normal path</span><span><i className="line red" /> Dead end path</span><span><i className="diamond" /> Decision</span></div>
  </div></div>;
}

function StepCard({ step, index, selected, flow, onSelect, onFieldChange, onAddField, onRouteChange }) {
  return <article className={`step-card ${selected ? 'selected' : ''}`}>
    <button type="button" className="step-card-head" onClick={onSelect} aria-expanded={selected}>
      <span className="step-number">{index + 1}</span><span className="step-title-wrap"><strong>{step.title}</strong><small>{step.subtitle}</small></span><span className="step-chevron">{selected ? '−' : '+'}</span>
    </button>
    <div className="step-tags"><span>{step.kind === 'decision' ? 'Branches Yes / No' : step.kind === 'end' ? 'Final step' : step.kind === 'start' ? 'Entry point' : `${step.fields.length} field${step.fields.length === 1 ? '' : 's'}`}</span>{step.fields.some((field) => field.required) && <span>Required input</span>}</div>
    {selected && <div className="step-details">
      {step.fields.map((field) => <div className="field-row" key={field.id}><input aria-label={`${step.title} field label`} value={field.label} onChange={(event) => onFieldChange(step.id, field.id, { label: event.target.value })} /><label><input type="checkbox" checked={field.required} onChange={(event) => onFieldChange(step.id, field.id, { required: event.target.checked })} /> Required</label></div>)}
      {step.kind === 'decision' && <div className="route-selects">{['yes', 'no'].map((branch) => <label key={branch}>{branch === 'yes' ? 'Yes goes to' : 'No goes to'}<select value={step.branches?.[branch] ?? ''} onChange={(event) => onRouteChange(step.id, branch, event.target.value || null)}><option value="">Dead end</option>{flow.steps.filter((candidate) => candidate.id !== step.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select></label>)}</div>}
      {step.kind !== 'start' && step.kind !== 'end' && <button type="button" className="add-field" onClick={() => onAddField(step.id)}><Icon name="plus" size={15} /> Add field</button>}
      {step.kind === 'start' && <p className="step-note">Every path begins here.</p>}{step.kind === 'end' && <p className="step-note">A successful path finishes here.</p>}
    </div>}
  </article>;
}

function Simulator({ flow, currentId, history, choice, setChoice, email, setEmail, onNext, onBack, onReset }) {
  const step = stepById(flow, currentId);
  const isDead = currentId === 'dead-end';
  const blocked = step?.kind === 'form' && step.fields.some((field) => field.id === 'email' && field.required) && !email.includes('@');
  return <section className="simulator"><div className="sim-head"><div><h3>Live path simulator</h3><p>Step through the form the way a user would.</p></div><button type="button" className="soft-button" onClick={onReset}><Icon name="rotate" size={16} /> Reset</button></div>
    <div className="progress-track" aria-label="Simulation progress">{['Start', 'Contact', 'Preferences', 'Review', 'Submit'].map((label, index) => <span className={history.some((id) => stepById(flow, id)?.title === label) || step?.title === label ? 'done' : ''} key={label}><b>{index + 1}</b><small>{label}</small></span>)}</div>
    <div className="sim-card">{isDead ? <><strong>Dead end</strong><p>This choice has no next step. Change the route above, or go back.</p></> : <><strong>{step?.title === 'Submit' ? 'Form complete' : `Step: ${step?.title}`}</strong><p>{step?.subtitle}</p>{step?.id === 'contact' && <label className="sim-input">Email address<input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />{blocked && <small>Enter a valid email to continue.</small>}</label>}{step?.kind === 'decision' && <fieldset><legend>Email updates</legend><label><input type="radio" name="choice" checked={choice === 'yes'} onChange={() => setChoice('yes')} /> Yes, keep me updated</label><label><input type="radio" name="choice" checked={choice === 'no'} onChange={() => setChoice('no')} /> No, thanks</label></fieldset>}{step?.id === 'review' && <p className="review-value">Email: {email || 'not supplied'}</p>}{step?.id === 'submit' && <p className="review-value">This is a local simulation. No information was sent.</p>}</>}
      <div className="sim-actions"><button type="button" className="soft-button" onClick={onBack} disabled={history.length === 0}><Icon name="back" size={16} /> Back</button><button type="button" className="primary-button" onClick={onNext} disabled={isDead || !step || step.kind === 'end' || blocked}>{step?.kind === 'decision' ? 'Follow path' : 'Next'} <Icon name="arrow" size={16} /></button></div>
    </div>
  </section>;
}

export default function App() {
  const [flow, setFlow] = useState(() => cloneFlow(sampleFlow));
  const [selectedId, setSelectedId] = useState('preferences');
  const [filter, setFilter] = useState('all');
  const [auditNumber, setAuditNumber] = useState(1);
  const [simId, setSimId] = useState('start');
  const [history, setHistory] = useState([]);
  const [choice, setChoice] = useState('yes');
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('');
  const result = useMemo(() => auditFlow(flow), [flow]);
  const visibleIssues = result.issues.filter((issue) => filter === 'all' || issue.severity === filter);
  function resetSimulation() { setSimId(flow.startId); setHistory([]); setChoice('yes'); setEmail(''); }
  function load(nextFlow, message) { setFlow(cloneFlow(nextFlow)); setSelectedId('preferences'); setSimId(nextFlow.startId); setHistory([]); setChoice('yes'); setEmail(''); setAuditNumber((value) => value + 1); setNotice(message); }
  function changeField(stepId, fieldId, patch) { setFlow((current) => updateStep(current, stepId, (step) => ({ ...step, fields: step.fields.map((field) => field.id === fieldId ? { ...field, ...patch } : field) }))); }
  function addField(stepId) { setFlow((current) => updateStep(current, stepId, (step) => ({ ...step, fields: [...step.fields, { id: `field-${Date.now()}`, label: 'New field', required: false, type: 'text' }] }))); }
  function changeRoute(stepId, branch, destination) { setFlow((current) => updateStep(current, stepId, (step) => ({ ...step, branches: { ...step.branches, [branch]: destination } }))); }
  function addStep() {
    if (flow.steps.length >= 8) { setNotice('This prototype supports up to eight steps.'); return; }
    const id = `step-${Date.now()}`;
    setFlow((current) => { const decision = current.steps.find((step) => step.kind === 'decision'); const previous = decision?.branches?.yes; const newStep = { id, title: 'New step', subtitle: 'Describe this form step', kind: 'form', next: previous, fields: [], requires: [] }; return { ...current, steps: [...current.steps.slice(0, -2), newStep, ...current.steps.slice(-2)].map((step) => step.id === decision?.id ? { ...step, branches: { ...step.branches, yes: id } } : step) }; });
    setSelectedId(id); setNotice('Step added to the Yes path.');
  }
  function nextSimulation() { const step = stepById(flow, simId); if (!step || step.kind === 'end') return; const next = step.kind === 'decision' ? step.branches?.[choice] : step.next; setHistory((items) => [...items, simId]); setSimId(next || 'dead-end'); }
  function backSimulation() { if (!history.length) return; setSimId(history.at(-1)); setHistory((items) => items.slice(0, -1)); }
  function exportReport() { const report = { app: 'FormSignal', flow, audit: result, exportedAt: new Date().toISOString(), note: 'Static local analysis. Not a compliance certification.' }; const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'formsignal-audit.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Audit report exported locally.'); }
  const errors = result.issues.filter((issue) => issue.severity === 'error').length;
  const warnings = result.issues.filter((issue) => issue.severity === 'warning').length;
  return <div className="app-shell"><header className="topbar"><div className="brand"><div className="brand-symbol"><Icon name="spark" size={19} /></div><strong>FormSignal</strong></div><span className="tagline">Map every path through a form</span><div className="top-actions"><button type="button" className="soft-button" onClick={() => load(sampleFlow, 'Sample with two findings loaded.')}><Icon name="folder" /> Load sample</button><button type="button" className="primary-button" onClick={() => { setAuditNumber((value) => value + 1); setNotice(`Audit ${auditNumber + 1} checked ${result.paths.length} paths.`); }}><Icon name="play" size={15} /> Run audit</button><button type="button" className="soft-button" onClick={exportReport}><Icon name="file" /> Export report</button></div></header>
    <main className="workspace"><section className="steps-panel"><div className="panel-heading"><div><h1>Form steps</h1><p>Edit the structure, fields and rules.</p></div><button type="button" className="soft-button" onClick={addStep}><Icon name="plus" size={16} /> Add step</button></div><div className="step-list">{flow.steps.map((step, index) => <StepCard key={step.id} step={step} index={index} selected={selectedId === step.id} flow={flow} onSelect={() => setSelectedId(step.id)} onFieldChange={changeField} onAddField={addField} onRouteChange={changeRoute} />)}</div></section>
      <section className="graph-panel"><div className="panel-heading"><div><h2>Form flow</h2><p>Visualize how users move through your form.</p></div><div className="graph-tools"><button type="button" onClick={() => load(repairedFlow(), 'Repaired example loaded: both paths can finish.')} className="soft-button">Load repaired example</button></div></div><FlowGraph flow={flow} selectedId={selectedId} onSelect={setSelectedId} /></section>
      <aside className="audit-panel"><div className="audit-heading"><div><h2>Accessibility audit</h2><p><strong>{result.paths.length} paths checked</strong><br />A local graph check for form completion issues.</p></div></div><div className="audit-tabs" role="group" aria-label="Filter findings"><button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All ({result.issues.length})</button><button type="button" className={filter === 'error' ? 'active' : ''} onClick={() => setFilter('error')}>Errors ({errors})</button><button type="button" className={filter === 'warning' ? 'active' : ''} onClick={() => setFilter('warning')}>Warnings ({warnings})</button></div><div className="finding-list" aria-live="polite">{visibleIssues.length ? visibleIssues.map((issue) => <article key={`${issue.code}-${issue.stepId}-${issue.branch ?? ''}`} className={`finding ${issue.severity}`}><div className="finding-icon"><Icon name="alert" size={17} /></div><div><div className="finding-top"><h3>{issue.title}</h3><span>{issue.severity}</span></div><p>{issue.detail}</p><button type="button" onClick={() => setSelectedId(issue.stepId)}>Go to step <Icon name="arrow" size={15} /></button></div></article>) : <div className="all-clear"><Icon name="check" size={20} /><strong>No findings in this view</strong><p>Both example paths now reach the final step when inputs are required.</p></div>}</div><Simulator flow={flow} currentId={simId} history={history} choice={choice} setChoice={setChoice} email={email} setEmail={setEmail} onNext={nextSimulation} onBack={backSimulation} onReset={resetSimulation} /><p className="audit-disclaimer">FormSignal checks only the model shown here. It is not a WCAG or legal compliance certification.</p></aside></main>{notice && <div className="toast" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}><Icon name="close" size={14} /></button></div>}</div>;
}
