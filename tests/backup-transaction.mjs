import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const source=readFileSync('index.html','utf8');
const extract=name=>{const start=source.indexOf('function '+name+'(');assert.ok(start>=0);return source.slice(start,source.indexOf('\n}',start)+2);};
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();await page.route('https://backup.invalid/',r=>r.fulfill({body:'<!doctype html><title>Local IndexedDB fixture</title>',contentType:'text/html'}));await page.route('**/*',r=>r.request().url()==='https://backup.invalid/'?r.fallback():r.abort());
 await page.goto('https://backup.invalid/');
 const code=['prepareBackupStores','restoreBackupStores'].map(extract).join('\n');
 const result=await page.evaluate(async code=>{
  const req=indexedDB.open('backup-fixture',1);
  req.onupgradeneeded=()=>{for(const n of ['seeds','tasks','journal','briefings','diagnostics'])req.result.createObjectStore(n,{keyPath:'id',autoIncrement:true});};
  const db=await new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)});
  const api=eval(code+'\n;({prepareBackupStores,restoreBackupStores})');
  const read=n=>new Promise((res,rej)=>{const r=db.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result.map(({id,...rest})=>rest));r.onerror=()=>rej(r.error)});
  await api.restoreBackupStores(db,{seeds:[{name:'original'}],tasks:[{title:'original'}],journal:[{text:'preserved'}]});
  let invalid=false;try{api.prepareBackupStores({version:16,seeds:[null]})}catch{invalid=true}
  let rolledBack=false;try{await api.restoreBackupStores(db,{seeds:[{name:'new'}],tasks:[{title:()=>{}}]})}catch{rolledBack=true}
  const before={seeds:await read('seeds'),tasks:await read('tasks'),journal:await read('journal')};
  const prepared=api.prepareBackupStores({version:16,seeds:[{id:42,name:'restored'}],tasks:[]});
  await api.restoreBackupStores(db,prepared);const after={seeds:await read('seeds'),tasks:await read('tasks'),journal:await read('journal')};db.close();return {invalid,rolledBack,before,after};
 },code);
 assert.equal(result.invalid,true);assert.equal(result.rolledBack,true);
 assert.deepEqual(result.before,{seeds:[{name:'original'}],tasks:[{title:'original'}],journal:[{text:'preserved'}]});
 assert.deepEqual(result.after,{seeds:[{name:'restored'}],tasks:[],journal:[{text:'preserved'}]});
 console.log('PASS real IndexedDB rollback, valid replacement, omitted collection retained');
}finally{await browser.close();}
