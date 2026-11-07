import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/** D1-shaped SQLite adapter. The same request handler runs locally and hosted. */
export function createSQLiteDB(path = ':memory:') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const native = new DatabaseSync(path);
  native.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  class Statement {
    constructor(sql, args = []) { this.sql = sql; this.args = args; }
    bind(...args) { return new Statement(this.sql, args); }
    async first(column) { const row = native.prepare(this.sql).get(...this.args); return row ? (column ? row[column] : { ...row }) : null; }
    async all() { return { results: native.prepare(this.sql).all(...this.args).map(r => ({ ...r })), success: true }; }
    async run() { const result = native.prepare(this.sql).run(...this.args); return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }; }
  }
  return {
    prepare(sql) { return new Statement(sql); },
    async batch(statements) {
      native.exec('BEGIN IMMEDIATE');
      try { const results = []; for (const statement of statements) { const result = native.prepare(statement.sql).run(...statement.args); results.push({ success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }); } native.exec('COMMIT'); return results; }
      catch (error) { native.exec('ROLLBACK'); throw error; }
    },
    async exec(sql) { native.exec(sql); },
    close() { native.close(); },
    migrate() { native.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)'); for (const file of readdirSync(new URL('../migrations/', import.meta.url)).filter(f=>f.endsWith('.sql')).sort()) { if (native.prepare('SELECT name FROM local_migrations WHERE name=?').get(file)) continue; native.exec('BEGIN'); try { native.exec(readFileSync(new URL('../migrations/'+file, import.meta.url),'utf8')); native.prepare('INSERT INTO local_migrations(name) VALUES(?)').run(file); native.exec('COMMIT'); } catch(error) { native.exec('ROLLBACK'); throw error; } } }
  };
}
