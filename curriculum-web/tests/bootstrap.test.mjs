import test from 'node:test';
import assert from 'node:assert/strict';
import {createSQLiteDB} from '../server/storage.mjs';
import {provisionDemoAccounts} from '../server/bootstrap.mjs';
import {compare} from 'bcryptjs';
test('configured demo users are created once; deployments never reset existing passwords',async()=>{
 const db=createSQLiteDB();db.migrate();try{
 const data=[{id:'demo-abc123',username:'preview_teacher',role:'teacher',password:'a-strong-test-password'}];
 await provisionDemoAccounts(db,JSON.stringify(data));const u=await db.prepare('SELECT * FROM practice_users').first();assert.equal(u.role,'parent');assert.ok(await compare(data[0].password,u.password_hash));
 data[0].password='another-strong-password';await provisionDemoAccounts(db,JSON.stringify(data));assert.equal((await db.prepare('SELECT * FROM practice_users').first()).password_hash,u.password_hash);
 db.migrate();assert.equal((await db.prepare('SELECT COUNT(*) n FROM practice_users').first()).n,1);
 }finally{db.close();}
});
