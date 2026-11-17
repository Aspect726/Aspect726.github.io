import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../public/api-client.mjs';
import { createWorkerRuntime } from '../worker/runtime.mjs';

const response = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('navigation shares concurrent reads while keeping live progress fresh on each visit', async () => {
  let reads = 0;
  const gate = deferred();
  const api = createApiClient({ fetcher: async () => { reads++; await gate.promise; return response({ answered: reads }); } });
  const first = api('/v2/student/summary'), second = api('/v2/student/summary');
  assert.equal(reads, 1);
  gate.resolve();
  assert.deepEqual(await first, { answered: 1 });
  assert.deepEqual(await second, { answered: 1 });
  assert.deepEqual(await api('/v2/student/summary'), { answered: 2 });
  assert.equal(reads, 2, 'a later page visit reads current saved progress');
});

test('account list is briefly cached, cloned and invalidated after edits or switching accounts', async () => {
  let reads = 0, time = 0;
  const api = createApiClient({ now: () => time, fetcher: async (path, options) => { if (options.method !== 'GET') return response({ ok: true }); reads++; return response({ students: [{ id: String(reads), name: 'Learner' }] }); } });
  const first = await api('/v2/teacher/students');
  first.students[0].name = 'Changed in one view';
  assert.equal((await api('/v2/teacher/students')).students[0].name, 'Learner');
  assert.equal(reads, 1);
  await api('/teacher/accounts', { name: 'Another student' });
  assert.equal((await api('/v2/teacher/students')).students[0].id, '2');
  api.invalidate();
  assert.equal((await api('/v2/teacher/students')).students[0].id, '3');
  time = 30001;
  assert.equal((await api('/v2/teacher/students')).students[0].id, '4');
});

test('an in-flight read cannot restore counts from before a saved answer', async () => {
  let reads = 0;
  const old = deferred();
  const api = createApiClient({ fetcher: async (path, options) => {
    if (options.method !== 'GET') return response({ ok: true });
    reads++;
    if (reads === 1) return old.promise;
    return response({ answered: 1 });
  } });
  const pending = api('/v2/student/summary');
  await api('/v2/student/answer', { answer: '2' });
  old.resolve(response({ answered: 0 }));
  assert.equal((await pending).answered, 1);
  assert.equal(reads, 2);
});

test('expired sessions clear account cache and failed reads are not cached', async () => {
  let calls = 0, expired = 0;
  const api = createApiClient({ onUnauthorized: () => expired++, fetcher: async () => {
    calls++;
    if (calls === 2) return new Response(JSON.stringify({ error: 'Sign in first.' }), { status: 401 });
    return response({ students: [{ id: String(calls) }] });
  } });
  await api('/v2/teacher/students');
  await assert.rejects(api('/v2/teacher/dashboard'), { status: 401 });
  assert.equal(expired, 1);
  assert.equal((await api('/v2/teacher/students')).students[0].id, '3');
});

test('warm Worker shares service construction and bootstrap across simultaneous requests', async () => {
  let created = 0, bootstraps = 0;
  const gate = deferred(), options = [];
  const application = createWorkerRuntime({ assets: { '/font': { type: 'font/woff2', encoding: 'base64', body: 'AQI=' } }, questionPool: {}, bootstrap: async () => { bootstraps++; await gate.promise; }, createApplication: config => { created++; options.push(config); return { number: created }; } });
  const DB = {};
  const first = application({ DB }), second = application({ DB });
  assert.equal(bootstraps, 1);
  gate.resolve();
  assert.equal(await first, await second);
  assert.equal(await application({ DB }), await first);
  assert.equal(created, 1);
  assert.deepEqual([...options[0].assets['/font'].body], [1, 2]);
  await application({ DB: {} });
  assert.equal(created, 2, 'another database gets an independent application');
  assert.equal(options[0].assets, options[1].assets, 'immutable assets decode once per Worker instance');
});

test('Worker refreshes configuration safely and retries failed bootstrap', async () => {
  let created = 0, tries = 0, failOnce = true;
  const configs = [];
  const application = createWorkerRuntime({ assets: {}, questionPool: {}, bootstrap: async () => { tries++; if (failOnce) { failOnce = false; throw Error('temporarily unavailable'); } }, createApplication: config => { created++; configs.push(config); return { number: created }; } });
  const DB = {}, BUCKET = {};
  await assert.rejects(application({ DB, BUCKET, OPENAI_API_KEY: 'test-old' }), /temporarily unavailable/);
  await application({ DB, BUCKET, OPENAI_API_KEY: 'test-old' });
  assert.equal(tries, 2);
  await application({ DB, BUCKET, OPENAI_API_KEY: 'test-new', OPENAI_TUTOR_MODEL: 'test-model' });
  assert.equal(created, 2);
  assert.equal(configs[1].ai.apiKey, 'test-new');
  assert.equal(configs[1].ai.model, 'test-model');
  await application({ DB, BUCKET: {}, OPENAI_API_KEY: 'test-new', OPENAI_TUTOR_MODEL: 'test-model' });
  assert.equal(created, 3, 'storage bindings are not accidentally reused');
});

test('private initial grades stay server-side and changing their configuration refreshes the Worker', async () => {
  const configs=[],DB={};
  const application=createWorkerRuntime({assets:{},questionPool:{},bootstrap:async()=>{},createApplication:config=>{configs.push(config);return config;}});
  const seed={seedId:'fixture',assessmentId:'week1-practice',score:4,maxScore:23,takenOn:null};
  await application({DB,GRADEBOOK_INITIAL_SCORE_JSON:JSON.stringify(seed)});
  assert.deepEqual(configs[0].initialScore,seed);
  assert.deepEqual(configs[0].assets,{});
  await application({DB,GRADEBOOK_INITIAL_SCORE_JSON:JSON.stringify({...seed,score:5})});
  assert.equal(configs.length,2);
  assert.equal(configs[1].initialScore.score,5);
  await assert.rejects(application({DB,GRADEBOOK_INITIAL_SCORE_JSON:'PRIVATE_INVALID_VALUE'}),error=>error.message==='The private initial grade configuration is not valid JSON.');
  assert.equal(configs.length,2,'invalid private data is not handed to the app');
});
