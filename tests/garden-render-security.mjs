import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const base='6e7dc2e41a01c0b652a55116fa0c5cf350dc89b3';
function extract(s,name,next){const a=s.indexOf('function '+name+'('),b=s.indexOf('function '+next+'(',a+1);assert.ok(a>=0&&b>a);return s.slice(a,b);}
const browser=await chromium.launch({headless:true});
try{
 for(const path of ['index.html','script.js']){
  for(const version of ['before','after']){
   const source=version==='before'?execFileSync('git',['show',base+':'+path],{encoding:'utf8',maxBuffer:2*1024*1024}):readFileSync(path,'utf8');
   const context=await browser.newContext({serviceWorkers:'block'});
   try{
    await context.route('**/*',r=>r.abort());
    const page=await context.newPage();
    await page.setContent('<select id="gardenSw"></select><div id="gardenList"></div>');
    await page.addScriptTag({content:`let cfgGardens=[],activeGarden;const SOIL={};const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');function switchGarden(id){window.selectedId=id}function deleteGarden(id){window.deletedId=id}window.__gardenProbe=0;`});
    await page.addScriptTag({content:extract(source,'refreshGardenSw','switchGarden')+extract(source,'renderGardenList','updateHeader')});
    const payload='<img src="invalid-local-probe" onerror="window.__gardenProbe=1">';
    await page.evaluate(p=>{cfgGardens=[{id:'default',name:'Normal',emoji:'🌿',lat:47,lon:-1,soil:'normal',desc:''},{id:'literal-id',name:'Nom '+p,emoji:p,lat:47.3,lon:-1.2,soil:p,desc:p}];activeGarden=cfgGardens[0];refreshGardenSw();renderGardenList();},payload);
    if(version==='before'){
     await page.waitForFunction(()=>window.__gardenProbe===1,{},{timeout:5000});
     assert.ok(await page.locator('#gardenList img').count()>0);
    }else{
     assert.equal(await page.locator('#gardenList img').count(),0);
     assert.equal(await page.evaluate(()=>window.__gardenProbe),0);
     assert.ok((await page.locator('#gardenList').textContent()).includes(payload));
     assert.equal(await page.locator('#gardenSw option').count(),2);
     await page.evaluate(()=>{cfgGardens[1].id="id'quoted";cfgGardens[1].lat='bad';refreshGardenSw();renderGardenList();});
     assert.equal(await page.locator('#gardenSw option').nth(1).getAttribute('value'),"id'quoted");
     await page.locator('#gardenList .gc').nth(1).press('Enter');
     assert.equal(await page.evaluate(()=>window.selectedId),"id'quoted");
     await page.locator('#gardenList .gc').nth(1).locator('button').click();
     assert.equal(await page.evaluate(()=>window.deletedId),"id'quoted");
     assert.equal(await page.locator('#gardenList [onclick]').count(),0);
    }
    console.log('GARDEN_RENDER '+JSON.stringify({path,version,probeExecuted:version==='before',passed:true,scope:'isolated real DOM functions only'}));
   }finally{await context.close();}
  }
 }
}finally{await browser.close();}
