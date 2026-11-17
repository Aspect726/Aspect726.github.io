import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/backend.mjs';

test('reviewed modules and styles are public with correct types, without account queries', async () => {
  const styles = ['/styles.css','/teacher-backlog.css','/student-learning.css','/tutor-panel.css'];
  const modules = ['/app.js','/api-client.mjs','/student.mjs','/teacher.mjs','/learning-character.mjs','/tutor-panel.mjs'];
  const assets = { '/index.html': '<!doctype html><title>Sign in</title>' };
  for (const path of styles) assets[path] = 'body { color: #123456; }';
  for (const path of modules) assets[path] = 'export const available = true;';
  const db = { prepare: () => { throw Error('Public shell assets must not query student records.'); } };
  const app = createApp({ db, assets });
  for (const path of [...styles, ...modules]) {
    const response = await app.fetch(new Request(`https://practice.test${path}`, { headers: { cookie: 'practice_session=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } }));
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), path.endsWith('.css') ? /text\/css/ : /javascript/);
    assert.equal(await response.text(), assets[path]);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
  const head = await app.fetch(new Request('https://practice.test/api-client.mjs', { method: 'HEAD' }));
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  for (const path of ['/login','/s/today','/s/learn/D-SUB','/t/dashboard','/t/students/student-123']) {
    const response = await app.fetch(new Request(`https://practice.test${path}`));
    assert.equal(response.status, 200, path); assert.match(await response.text(), /Sign in/);
  }
});

test('private, unknown and source paths remain denied even if accidentally bundled', async () => {
  const blocked = ['/private','/server','/.env','/.git/config','/server/backend.mjs','/private/vetted-seeds.json','/data/course.json','/paper_questions.json','/resources/packets/day.pdf','/unknown.css','/unknown.mjs'];
  const assets = { '/index.html': '<title>Sign in</title>', ...Object.fromEntries(blocked.map(path => [path, 'never public'])) };
  const app = createApp({ db: {}, assets });
  for (const path of blocked) {
    const response = await app.fetch(new Request(`https://practice.test${path}`));
    assert.equal(response.status, 404, path);
    assert.doesNotMatch(await response.text(), /never public|Sign in/);
  }
});
