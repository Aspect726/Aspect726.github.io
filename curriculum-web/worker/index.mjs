import { provisionDemoAccounts } from '../server/bootstrap.mjs';
import { createApp } from '../server/backend.mjs';
import { createWorkerRuntime } from './runtime.mjs';
import assets from '../generated/assets.json';
import questionPool from '../generated/vetted-seeds.json';
import initialDocuments from '../generated/initial-test-documents.json';

const application = createWorkerRuntime({ assets, questionPool, initialDocuments, createApplication: createApp, bootstrap: provisionDemoAccounts });

export default {
  async fetch(request, env) {
    try { return await (await application(env)).fetch(request); }
    catch (error) {
      console.error('Practice request failed:', error.message);
      return new Response(JSON.stringify({ error: 'Practice could not load. Please try again.' }), {
        status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(application(env).then(app => app.backup()));
  }
};
