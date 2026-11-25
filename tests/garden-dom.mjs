import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
// Isolate the exact function bodies. Never load the real application or access stored user data.
const extract=(s,name)=>{const i=s.indexOf('function '+name+'(');assert.ok(i>=0);const e=s.indexOf('\n',i),line=s.slice(i,e);return line.endsWith('}')?line:s.slice(i,s.indexOf('\n}',e)+2);};
const browser=await chromium.launch({headless:true});
try{
 for(const path of ['index.html','script.js']){
  const old=readFileSync(process.env.GARDEN_BASE+'/'+path,'utf8'),next=readFileSync(path,'utf8');
  for(const [label,s] of [['before',old],['after',next]]){
   const page=await browser.newPage({serviceWorkers:'block'});await page.route('**/*',r=>r.abort());
   await page.setContent('<select id="gardenSw"></select><div id="gardenList"></div>');
   const code=['refreshGardenSw','renderGardenList',...(label==='after'?['validateGardenRecords']:[])].map(n=>extract(s,n)).join('\n');
   const result=await page.evaluate(({code,label})=>{
    const cfgGardens=[{id:'normal',name:'Potager',emoji:'🌿',desc:'Terre',soil:'limoneux',lat:0,lon:0},{id:"odd'quote",name:'<b>Nom</b>',emoji:'<span data-fixture="marker">test</span>',desc:'<i>Texte</i>',soil:'limoneux',lat:12,lon:30}];
    const activeGarden=cfgGardens[0];let switched=null,deleted=null;
    const SOIL={limoneux:{label:'Limon'}},switchGarden=id=>{switched=id},deleteGarden=id=>{deleted=id},esc=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    return eval(code+'\nrefreshGardenSw();renderGardenList();'+`(()=>{const list=document.querySelector('#gardenList');const marker=!!list.querySelector('[data-fixture]');let valid=null,invalid=null;if(label==='after'){valid=validateGardenRecords(cfgGardens).length===2;try{validateGardenRecords([{...cfgGardens[0],lat:999}]);invalid=false}catch{invalid=true}list.children[1].click();list.children[1].querySelector('button').click();}return {marker,valid,invalid,switched,deleted,options:document.querySelector('#gardenSw').options.length,text:list.textContent};})()`);
   },{code,label});
   assert.equal(result.marker,label==='before',path+' '+label+' DOM marker');
   if(label==='after'){assert.equal(result.valid,true);assert.equal(result.invalid,true);assert.equal(result.switched,"odd'quote");assert.equal(result.deleted,"odd'quote");assert.equal(result.options,2);assert.ok(result.text.includes('<span data-fixture='));}
   console.log(JSON.stringify({path,label,injectedMarkup:result.marker,normalControls:label==='after'?true:null}));await page.close();
  }
 }
}finally{await browser.close();}
