import { createApp } from '../server/backend.mjs';
import assets from '../generated/assets.json';
import questionPool from '../generated/vetted-seeds.json';

function application(env) {
  if (!env.DB) throw new Error('The practice database is not configured.');
  const decoded = Object.fromEntries(Object.entries(assets).map(([path, asset]) => [path, {
    type: asset.type,
    body: asset.encoding === 'base64'
      ? Uint8Array.from(atob(asset.body), character => character.charCodeAt(0))
      : asset.body
  }]));
  return createApp({ db: env.DB, assets: decoded, questionPool, backupStore: env.BUCKET, production: true });
}

export default {
  async fetch(request, env) {
    try { return await application(env).fetch(request); }
    catch (error) {
      console.error('Practice request failed:', error.message);
      return new Response(JSON.stringify({ error: 'Practice could not load. Please try again.' }), {
        status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(application(env).backup());
  }
};
