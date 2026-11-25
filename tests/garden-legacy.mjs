import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import vm from 'node:vm';
const extract=(s,name)=>{const start=s.indexOf('function '+name+'(');assert.ok(start>=0);const end=s.indexOf('\n',start);return s.slice(start,end).endsWith('}')?s.slice(start,end):s.slice(start,s.indexOf('\n}',end)+2);};
for(const path of ['index.html','script.js']){
 const source=readFileSync(path,'utf8');
 const code=['validateGardenRecords','loadGardens','saveGardens'].map(n=>extract(source,n)).join('\n');
 const valid={id:'legacy',name:'Jardin ancien',lat:0,lon:0},bad='{"broken":true}',map=new Map();
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const ctx=vm.createContext({safeStorage:storage,localStorage:storage,DEF_G:{id:'default',name:'Default',lat:1,lon:2,emoji:'🌿',desc:'',soil:'limoneux'}});
 vm.runInContext('let gardenStorageBlocked=false,cfgGardens;'+code,ctx);
 map.set('o_gardens',JSON.stringify([valid]));const l=vm.runInContext('cfgGardens=loadGardens(); JSON.stringify(cfgGardens)',ctx);
 assert.deepEqual(JSON.parse(l),[{...valid,emoji:'🌿',desc:'',soil:'limono-argileux'}]);vm.runInContext('saveGardens()',ctx);
 map.set('o_gardens',bad);vm.runInContext('cfgGardens=loadGardens()',ctx);assert.throws(()=>vm.runInContext('saveGardens()',ctx),/écriture bloquée/);assert.equal(map.get('o_gardens'),bad);
 console.log('PASS legacy profile compatibility and preservation of unreadable storage '+path);
}
