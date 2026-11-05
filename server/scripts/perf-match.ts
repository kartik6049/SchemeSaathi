/**
 * PERF-01 (NFR-01): measures POST /api/match latency under concurrency.
 *   npm run perf -- [requests=1000] [concurrency=50] [baseUrl=http://127.0.0.1:4000]
 * Requires the API to be running. Uses random realistic profiles.
 * The API's per-IP rate limit (default 300/min) must be raised for the run:
 *   API_RATE_LIMIT=1000000 npm run dev
 */
const [requests = 1000, concurrency = 50] = process.argv.slice(2, 4).map(Number);
const base = process.argv[4] ?? 'http://127.0.0.1:4000';

const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const profile = () => ({
  state: pick(['UP', 'MH', 'BR', 'KA', 'TN', 'WB', 'DL']),
  age: 15 + Math.floor(Math.random() * 70),
  gender: pick(['female', 'male']),
  occupation: pick(['farmer', 'student', 'unorganised_worker', 'salaried', 'homemaker']),
  incomeRange: pick(['below_1L', '1L_2_5L', '2_5L_5L', '5L_8L']),
  bplCard: pick([true, false, undefined]),
});

const latencies: number[] = [];
let errors = 0;
let sent = 0;

async function worker() {
  while (sent < requests) {
    sent++;
    const t0 = performance.now();
    const res = await fetch(`${base}/api/match`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile()) }).catch(() => null);
    latencies.push(performance.now() - t0);
    if (!res?.ok) errors++;
    await res?.arrayBuffer();
  }
}

const start = performance.now();
await Promise.all(Array.from({ length: concurrency }, worker));
const total = (performance.now() - start) / 1000;
latencies.sort((a, b) => a - b);
const pct = (p: number) => latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))].toFixed(1);

console.log(`requests=${requests} concurrency=${concurrency} errors=${errors} rps=${(requests / total).toFixed(0)}`);
console.log(`p50=${pct(50)}ms p95=${pct(95)}ms p99=${pct(99)}ms max=${latencies.at(-1)!.toFixed(1)}ms`);
console.log(Number(pct(95)) < 500 && errors === 0 ? 'PASS: p95 < 500 ms' : 'FAIL');
process.exit(Number(pct(95)) < 500 && errors === 0 ? 0 : 1);
