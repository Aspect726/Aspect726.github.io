// A warm Worker reuses immutable assets and service objects. Each service still
// authenticates every request and reads that student's records from the database.
export function createWorkerRuntime({ assets, questionPool, createApplication, bootstrap }) {
  const applications = new WeakMap();
  let decoded;
  function publicAssets() {
    return decoded ??= Object.fromEntries(Object.entries(assets).map(([path, asset]) => [path, {
      type: asset.type,
      body: asset.encoding === 'base64' ? Uint8Array.from(atob(asset.body), character => character.charCodeAt(0)) : asset.body
    }]));
  }
  async function application(env) {
    const db = env.DB;
    if (!db || !['object', 'function'].includes(typeof db)) throw new Error('The practice database is not configured.');
    let entry = applications.get(db);
    const matches = entry && entry.bucket === env.BUCKET && entry.apiKey === env.OPENAI_API_KEY && entry.model === env.OPENAI_TUTOR_MODEL && entry.bootstrapConfig === env.BOOTSTRAP_ACCOUNTS_JSON;
    if (!matches) {
      entry = { bucket: env.BUCKET, apiKey: env.OPENAI_API_KEY, model: env.OPENAI_TUTOR_MODEL, bootstrapConfig: env.BOOTSTRAP_ACCOUNTS_JSON };
      applications.set(db, entry);
      entry.ready = (async () => {
        await bootstrap(db, entry.bootstrapConfig);
        return createApplication({ db, assets: publicAssets(), questionPool, backupStore: entry.bucket, production: true, ai: { apiKey: entry.apiKey, model: entry.model } });
      })();
    }
    try { return await entry.ready; }
    catch (error) { if (applications.get(db) === entry) applications.delete(db); throw error; }
  }
  return application;
}
