import React, { useState, useRef, useEffect } from 'react';

// QuantumTutorMVP.jsx
// Single-file React component (Tailwind-ready) to serve as an MVP web app that
// teaches quantum gates -> circuits -> higher-level steps.
// Default export a React component. No external math libs required.
// Usage: drop this component into a React app (Vite / Create React App) and
// ensure Tailwind is available for styling. The file is intentionally self-contained.

// -------------------- Small complex number & matrix helpers --------------------
const C = (re, im = 0) => ({ re, im });
const add = (a, b) => C(a.re + b.re, a.im + b.im);
const sub = (a, b) => C(a.re - b.re, a.im - b.im);
const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const scale = (a, k) => C(a.re * k, a.im * k);
const conj = (a) => C(a.re, -a.im);
const abs2 = (a) => a.re * a.re + a.im * a.im;

const dot = (v1, v2) => v1.reduce((acc, x, i) => add(acc, mul(conj(x), v2[i])), C(0, 0));

const matMul = (m, v) => {
  // m: 2x2 matrix of complex numbers, v: length-2 vector of complex numbers
  return [ add(m[0][0] ? mul(m[0][0], v[0]) : C(0,0), m[0][1] ? mul(m[0][1], v[1]) : C(0,0)),
           add(m[1][0] ? mul(m[1][0], v[0]) : C(0,0), m[1][1] ? mul(m[1][1], v[1]) : C(0,0)) ];
};

const norm = (v) => {
  const s = Math.sqrt(abs2(v[0]) + abs2(v[1]));
  return [ scale(v[0], 1 / s), scale(v[1], 1 / s) ];
};

// -------------------- Gate definitions --------------------
const GATES = {
  I: { name: 'I', matrix: [[C(1), C(0)], [C(0), C(1)]], description: 'Identity - does nothing' },
  X: { name: 'X', matrix: [[C(0), C(1)], [C(1), C(0)]], description: 'Pauli-X (bit-flip)' },
  Z: { name: 'Z', matrix: [[C(1), C(0)], [C(0), C(-1)]], description: 'Pauli-Z (phase flip)' },
  H: { name: 'H', matrix: [[C(1/Math.sqrt(2)), C(0)], [C(1/Math.sqrt(2)), C(0)]], description: 'Hadamard - makes superposition' },
  S: { name: 'S', matrix: [[C(1), C(0)], [C(0), C(0,1)]], description: 'Phase gate S (90°)' },
  T: { name: 'T', matrix: [[C(1), C(0)], [C(0), C(Math.cos(Math.PI/4), Math.sin(Math.PI/4))]], description: 'T gate (45°)'}
};

// -------------------- Bloch sphere helpers (2D projection) --------------------
function stateToBlochAngles([a, b]){
  // a,b are complex amplitudes, normalized
  // theta = 2 * arccos(|a|)
  // phi = arg(b) - arg(a)
  const ra = Math.sqrt(abs2(a));
  const rb = Math.sqrt(abs2(b));
  let theta = 2 * Math.acos(Math.min(1, Math.max(-1, ra))); // numeric safety

  // argument (phase)
  const arg = (z) => Math.atan2(z.im, z.re);
  const phi = arg(b) - arg(a);
  return { theta, phi };
}

function blochToXY(theta, phi) {
  // simple projection (x = sin theta cos phi, y = sin theta sin phi)
  const x = Math.sin(theta) * Math.cos(phi);
  const y = Math.sin(theta) * Math.sin(phi);
  const z = Math.cos(theta);
  return { x, y, z };
}

// -------------------- React component --------------------
export default function QuantumTutorMVP(){
  // |0> initial state
  const zero = [C(1,0), C(0,0)];
  const one  = [C(0,0), C(1,0)];

  const [state, setState] = useState(zero);
  const [circuit, setCircuit] = useState([]); // list of gate names
  const [history, setHistory] = useState([]); // states after each gate
  const [selectedGate, setSelectedGate] = useState('H');
  const [measurement, setMeasurement] = useState(null);

  const canvasRef = useRef(null);

  useEffect(() => {
    drawBloch(state, canvasRef.current);
  }, [state]);

  function applyGateName(gname, st = state){
    const gate = GATES[gname];
    if(!gate) return st;
    const out = matMul(gate.matrix, st);
    return norm(out);
  }

  function stepCircuit(){
    const newHistory = [];
    let st = zero;
    for(const g of circuit){
      st = applyGateName(g, st);
      newHistory.push({ gate: g, state: st });
    }
    setHistory(newHistory);
    if(newHistory.length) setState(newHistory[newHistory.length-1].state);
    else setState(zero);
  }

  function addGateToCircuit(){
    setCircuit(prev => [...prev, selectedGate]);
  }

  function clearCircuit(){
    setCircuit([]); setHistory([]); setState(zero); setMeasurement(null);
  }

  function runStep(index){
    // run up to index (inclusive)
    let st = zero;
    for(let i=0;i<=index && i<circuit.length;i++) st = applyGateName(circuit[i], st);
    setState(st);
  }

  function measure(){
    // probabilistic measurement in computational basis
    const p0 = abs2(state[0]);
    const r = Math.random();
    const outcome = r < p0 ? 0 : 1;
    setMeasurement(outcome);
    // collapse
    setState(outcome === 0 ? zero : one);
  }

  function drawBloch(st, canvas){
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const { theta, phi } = stateToBlochAngles(st);
    const v = blochToXY(theta, phi);

    const w = canvas.width; const h = canvas.height; const cx = w/2; const cy = h/2; const r = Math.min(w,h)/2 - 10;
    ctx.clearRect(0,0,w,h);

    // sphere outline
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.strokeStyle = '#111827'; ctx.lineWidth = 2; ctx.stroke();

    // equator
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r*0.3, 0, 0, Math.PI*2); ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);

    // draw vector
    const px = cx + v.x * r * 0.9;
    const py = cy - v.z * r * 0.9; // using z for vertical for clarity
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 3; ctx.stroke();

    // point
    ctx.beginPath(); ctx.arc(px, py, 6,0,Math.PI*2); ctx.fillStyle = '#0369a1'; ctx.fill();

    // labels
    ctx.fillStyle = '#111827'; ctx.font = '12px sans-serif';
    ctx.fillText(`θ: ${theta.toFixed(2)}`, 10, h - 30);
    ctx.fillText(`φ: ${phi.toFixed(2)}`, 10, h - 12);
  }

  // display complex vector as string
  function ampToStr(z){
    const re = Number(z.re.toFixed(3)); const im = Number(z.im.toFixed(3));
    if(Math.abs(im) < 1e-6) return `${re}`;
    if(Math.abs(re) < 1e-6) return `${im}i`;
    return `${re} ${im>=0?'+':'-'} ${Math.abs(im)}i`;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Quantum Tutor — MVP</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 md:col-span-2 bg-white rounded-lg shadow p-4">
          <h2 className="font-medium mb-2">State visualization</h2>
          <canvas ref={canvasRef} width={480} height={300} className="w-full border rounded-md"></canvas>

          <div className="mt-3 text-sm">
            <div><strong>State vector:</strong></div>
            <div>|ψ&gt; = {`(${ampToStr(state[0])}) |0>  +  (${ampToStr(state[1])}) |1>`}</div>
            <div className="mt-2"><strong>Measurement:</strong> {measurement === null ? 'not measured' : measurement}</div>
          </div>

          <div className="mt-4">
            <button onClick={() => setState(applyGateName('H'))} className="mr-2 px-3 py-1 rounded bg-sky-500 text-white">Apply H</button>
            <button onClick={() => setState(applyGateName('X'))} className="mr-2 px-3 py-1 rounded bg-sky-500 text-white">Apply X</button>
            <button onClick={() => setState(applyGateName('Z'))} className="mr-2 px-3 py-1 rounded bg-sky-500 text-white">Apply Z</button>
            <button onClick={() => setState(applyGateName('S'))} className="mr-2 px-3 py-1 rounded bg-sky-500 text-white">Apply S</button>
            <button onClick={() => setMeasurement(null) || setState(zero)} className="ml-2 px-3 py-1 rounded border">Reset</button>
            <button onClick={measure} className="ml-2 px-3 py-1 rounded bg-emerald-500 text-white">Measure</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium mb-2">Circuit builder</h3>
          <div className="flex items-center gap-2 mb-2">
            <select value={selectedGate} onChange={e=>setSelectedGate(e.target.value)} className="flex-1 rounded border p-1">
              {Object.keys(GATES).map(g => <option key={g} value={g}>{g} — {GATES[g].description}</option>)}
            </select>
            <button onClick={addGateToCircuit} className="px-3 py-1 rounded bg-indigo-500 text-white">Add</button>
          </div>

          <div className="mb-2">
            <strong>Current circuit:</strong>
            <div className="mt-2 flex flex-wrap gap-2">
              {circuit.length===0 && <div className="text-sm text-gray-500">(empty)</div>}
              {circuit.map((g,i)=> (
                <button key={i} onClick={()=>runStep(i)} className="px-2 py-1 rounded border bg-gray-50 text-sm">{i+1}: {g}</button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={stepCircuit} className="px-3 py-1 rounded bg-rose-500 text-white">Run</button>
            <button onClick={clearCircuit} className="px-3 py-1 rounded border">Clear</button>
          </div>

          <div className="mt-3 text-sm">
            <strong>History:</strong>
            <ol className="list-decimal ml-5 mt-1">
              {history.map((h,idx)=> (
                <li key={idx} className="mb-1">{h.gate} — |ψ&gt; = ({ampToStr(h.state[0])}) |0> + ({ampToStr(h.state[1])}) |1></li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <h3 className="font-medium">Learning path (MVP scope)</h3>
        <ul className="list-disc ml-5 mt-2 text-sm">
          <li>Single-qubit gates (X, Z, H, S, T) — visual + algebraic.</li>
          <li>Build 1-qubit circuits (sequences), step-through execution & state history.</li>
          <li>Measurement collapse and probabilities (computational basis).</li>
          <li>Mini-quiz: identify gate effects & predict outcomes (future enhancement).</li>
        </ul>

        <div className="mt-4 text-sm">
          <strong>Next-step features to add:</strong>
          <ol className="list-decimal ml-5 mt-1">
            <li>Two-qubit gates (CNOT), tensor products & multi-qubit visualization.</li>
            <li>Saved lessons, interactive quizzes, backend progress tracking.</li>
            <li>Export circuits, integrate with Qiskit backend for live execution.</li>
          </ol>
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-700">
        <strong>How to run</strong>
        <ol className="list-decimal ml-5 mt-1">
          <li>Create a React app (Vite or CRA). Install Tailwind if you want the same styling.</li>
          <li>Place this file as <code>QuantumTutorMVP.jsx</code> and import it in <code>App.jsx</code>.</li>
          <li>Start dev server: <code>npm run dev</code> or <code>npm start</code>.</li>
        </ol>
      </div>
    </div>
  );
}
