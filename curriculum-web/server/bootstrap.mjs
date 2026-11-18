import {hash} from 'bcryptjs';
// Explicitly configured demo credentials live only in the host's secret store.
// Never change an existing account or reset a password during deployment.
export async function provisionDemoAccounts(db, configuration){
 if(!configuration)return;
 const accounts=JSON.parse(configuration);
 if(!Array.isArray(accounts)||accounts.length>2)throw Error('Invalid demo account configuration.');
 for(const account of accounts){
  if(!['student','teacher'].includes(account.role)||!/^demo-[a-f0-9-]+$/.test(account.id)||!/^preview_[a-z0-9_]+$/.test(account.username)||typeof account.password!=='string'||account.password.length<16||account.password.length>64)throw Error('Invalid demo account configuration.');
  if(await db.prepare('SELECT id FROM practice_users WHERE id=?').bind(account.id).first())continue;
  const occupied=await db.prepare('SELECT id FROM practice_users WHERE username=?').bind(account.username).first();
  if(occupied)throw Error('The demo username is already in use.');
  const passwordHash=await hash(account.password,12);
  await db.prepare('INSERT OR IGNORE INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind(account.id,account.username,account.role==='teacher'?'Teacher preview':'Student preview',account.role==='teacher'?'parent':'student',passwordHash,new Date().toISOString()).run();
 }
}
