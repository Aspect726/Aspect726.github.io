// Cache only the account picker between pages. Progress, points, questions and
// learning history always come from the server; no records go into localStorage.
export function createApiClient({ fetcher = (...args) => fetch(...args), now = Date.now, onUnauthorized = () => {}, onInvalidate = () => {} } = {}) {
  const pending = new Map(), saved = new Map();
  let generation = 0;
  const copy = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  const ttl = path => path === '/v2/teacher/students' ? 30000 : 0;
  function invalidate() {
    generation++;
    pending.clear();
    saved.clear();
    onInvalidate();
  }
  async function request(path, body, method = body === undefined ? 'GET' : 'POST') {
    const read = method === 'GET';
    if (!read) invalidate();
    const started = generation;
    if (read) {
      const cached = saved.get(path);
      if (cached && cached.expires > now()) return copy(cached.value);
      if (pending.has(path)) return copy(await pending.get(path));
    }
    const work = (async () => {
      const response = await fetcher('/api' + path, { method, credentials: 'same-origin', cache: 'no-store', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const result = await response.json().catch(() => ({ error: 'The response could not be read. Try again.' }));
      // An answer, sign-out or account switch happened while this read was in
      // flight. Fetch under the current session rather than resurrect old data.
      if (read && started !== generation) return request(path);
      if (!response.ok) {
        if (response.status === 401 && started === generation) { invalidate(); onUnauthorized(); }
        throw Object.assign(new Error(result.error || 'That did not save. Check the connection and try again.'), { status: response.status });
      }
      if (read && ttl(path) && started === generation) saved.set(path, { value: copy(result), expires: now() + ttl(path) });
      return result;
    })();
    if (read) pending.set(path, work);
    try { return copy(await work); }
    finally {
      if (read && pending.get(path) === work) pending.delete(path);
      if (!read) invalidate();
    }
  }
  request.invalidate = invalidate;
  return request;
}
