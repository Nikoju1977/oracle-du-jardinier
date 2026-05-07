'use strict';
// ════════════════════════════════════════════════════════════
// ORACLE DU JARDINIER v16 - FULL SCRIPT
// ════════════════════════════════════════════════════════════

// CONSTANTS
const JOURS=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const MOIS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const MOIS_S=['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const now=new Date();

// GLOBALS
let db, cfgGardens, activeGarden;
let currentSun=null, camStream=null, diagImgB64=null, diagImgMime='image/jpeg';
let dashData=null, lastWeatherData=null, lastForecastData=null;
let meteoLoaded=false, hourlyLoaded=false;
let wchart=null,wichart=null,schart=null,mchart=null,healthChartObj=null;
let calY=now.getFullYear(),calM=now.getMonth();
let seedFilter=null,taskFilter=null,libCatFilter=null;
let notifTimers={},schedNotifs=[];
let mediaRec=null,audioChunks=[],isRecording=false,recordedAudioURL=null;

try{schedNotifs=JSON.parse(localStorage.getItem('o_sched')||'[]');}catch(e){}

// ════════════════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded',async()=>{
  try{
    await initDB();
    initTheme();
    initPWA();
    initOffline();
    initGardens();
    initAPIKey();
    updateHeader();
    renderGardenList();
    initNotifications();
    showToast('✅ Application prête','s');
  }catch(e){
    console.error('Init error:',e);
    showToast('⚠️ Erreur lors du démarrage','e');
  }
});

// ════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════
function showToast(msg,type='info'){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.className=type==='s'?'toast-ok':type==='e'?'toast-err':type==='w'?'toast-warn':'toast-info';
  t.style.display='block';
  setTimeout(()=>{t.style.display='none';},3000);
}

function getUTC(d=new Date()){return Math.floor(d.getTime()/1000);}
function formatDate(d){const dObj=d instanceof Date?d:new Date(d);return`${dObj.getDate()}/${dObj.getMonth()+1}/${dObj.getFullYear()}`;}
function formatTime(h,m){return`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;}

// ════════════════════════════════════════════════════════════
// THEME + PWA + OFFLINE
// ════════════════════════════════════════════════════════════
function initTheme(){applyTheme(localStorage.getItem('o_theme')||'dark');}
function toggleTheme(){
  const cur=document.documentElement.dataset.theme;
  const next=(cur==='terrain')?'dark':(cur==='dark')?'light':'dark';
  applyTheme(next);localStorage.setItem('o_theme',next);
}
function toggleTerrainContrast(){
  const cur=document.documentElement.dataset.theme;
  const next=cur==='terrain'?(localStorage.getItem('o_theme')||'dark'):'terrain';
  applyTheme(next);showToast(next==='terrain'?'⛺ Mode terrain':'🌙 Mode normal');
}
function applyTheme(t){
  document.documentElement.dataset.theme=t;
  document.getElementById('themeBtn').textContent=t==='dark'?'☀️':t==='light'?'⛺':'🌙';
  document.getElementById('metaTheme').content=t==='dark'?'#080e0a':t==='light'?'#f1f7f1':'#0a1a0a';
}

function initPWA(){
  const m={name:"L'Oracle du Jardinier v16",short_name:"Oracle 🌿",start_url:"./",display:"standalone",background_color:"#080e0a",theme_color:"#080e0a",icons:[{src:"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect fill='%234ade80' width='192' height='192'/><text x='50%' y='50%' font-size='120' text-anchor='middle' dy='.3em' fill='%23000'>🌿</text></svg>",sizes:"192x192",type:"image/svg+xml"}]};
  const manif=document.getElementById('pwaManifest');
  manif.href='data:application/manifest+json,'+encodeURIComponent(JSON.stringify(m));
  if('serviceWorker' in navigator){navigator.serviceWorker.register('data:application/javascript,console.log("Mock SW")');}
}

let deferredInstall=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;document.getElementById('installBtn').classList.remove('hidden');});
function installPWA(){if(!deferredInstall)return;deferredInstall.prompt();deferredInstall.userChoice.then(()=>document.getElementById('installBtn').classList.add('hidden'));}

function initOffline(){
  const u=()=>{
    const off=!navigator.onLine;
    document.getElementById('offBadge').style.display=off?'inline-flex':'none';
    document.getElementById('offBanner').classList.toggle('on',off);
  };
  u();
  window.addEventListener('online',u);
  window.addEventListener('offline',u);
}

// ════════════════════════════════════════════════════════════
// DATABASE
// ════════════════════════════════════════════════════════════
function initDB(){
  return new Promise((res,rej)=>{
    const req=indexedDB.open('OracleV16',9);
    req.onupgradeneeded=e=>{
      const d=e.target.result;
      ['briefings','seeds','journal','tasks','diagnostics','health_scores','meteo_history','photo_timeline'].forEach(s=>{
        if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id',autoIncrement:true});
      });
    };
    req.onsuccess=e=>{db=e.target.result;res(db);};
    req.onerror=()=>rej(req.error);
  });
}

function dbAdd(s,d){
  return new Promise((res,rej)=>{
    if(!db)return rej();
    const tx=db.transaction(s,'readwrite');
    const req=tx.objectStore(s).add(d);
    tx.oncomplete=()=>res(req.result);
    tx.onerror=()=>rej(tx.error);
  });
}

function dbGetAll(s){
  return new Promise((res,rej)=>{
    if(!db)return res([]);
    const tx=db.transaction(s,'readonly');
    const req=tx.objectStore(s).getAll();
    req.onsuccess=()=>res([...req.result].reverse());
    tx.onerror=()=>rej(tx.error);
  });
}

function dbDelete(s,id){
  return new Promise((res,rej)=>{
    if(!db)return rej();
    const tx=db.transaction(s,'readwrite');
    tx.objectStore(s).delete(id);
    tx.oncomplete=res;
    tx.onerror=()=>rej(tx.error);
  });
}

function dbUpdate(s,id,fn){
  return new Promise((res,rej)=>{
    if(!db)return rej();
    const tx=db.transaction(s,'readwrite');
    const st=tx.objectStore(s);
    const r=st.get(id);
    r.onsuccess=()=>{
      if(!r.result)return rej('not found');
      const updated=fn(r.result);
      st.put(updated);
      tx.oncomplete=()=>res(updated);
    };
    tx.onerror=()=>rej(tx.error);
  });
}

async function dbClear(s){
  if(!db)return;
  return new Promise(res=>{
    const tx=db.transaction(s,'readwrite');
    tx.objectStore(s).clear();
    tx.oncomplete=res;
  });
}

// ════════════════════════════════════════════════════════════
// API & GARDENS
// ════════════════════════════════════════════════════════════
function initAPIKey(){
  const k=localStorage.getItem('o_key');
  if(k)document.getElementById('apiKey').value=k;
  document.getElementById('apiKey').addEventListener('input',e=>{
    const v=e.target.value.trim();
    localStorage.setItem('o_key',v);
  });
}

function toggleKey(){
  const i=document.getElementById('apiKey');
  i.type=i.type==='password'?'text':'password';
}

const DEF_G={id:'default',name:'Le Jardin de Niko',emoji:'🌿',lat:47.55,lon:-1.40,soil:'limono-argileux',desc:'Bocage, Loire-Atlantique'};

function loadGardens(){
  try{
    const g=JSON.parse(localStorage.getItem('o_gardens')||'null');
    if(g&&g.length)return g;
  }catch(e){}
  return[DEF_G];
}

function saveGardens(){localStorage.setItem('o_gardens',JSON.stringify(cfgGardens));}

function initGardens(){
  cfgGardens=loadGardens();
  const aid=localStorage.getItem('o_active_garden')||cfgGardens[0].id;
  activeGarden=cfgGardens.find(g=>g.id===aid)||cfgGardens[0];
  refreshGardenSw();
  updateHeader();
}

function refreshGardenSw(){
  const sw=document.getElementById('gardenSw');
  sw.innerHTML=cfgGardens.map(g=>`<option value="${g.id}"${g.id===activeGarden.id?' selected':''}>${g.emoji} ${g.name}</option>`).join('');
}

function switchGarden(id){
  activeGarden=cfgGardens.find(g=>g.id===id)||cfgGardens[0];
  localStorage.setItem('o_active_garden',activeGarden.id);
  meteoLoaded=false;
  hourlyLoaded=false;
  localStorage.removeItem('o_wx_cache');
  updateHeader();
  showToast(`🌿 ${activeGarden.name}`);
}

function addGarden(){
  const name=document.getElementById('gName').value.trim();
  if(!name){showToast('⚠️ Nom requis','w');return;}
  const g={
    id:'g_'+Date.now(),
    name,
    emoji:document.getElementById('gEmoji').value||'🌿',
    lat:parseFloat(document.getElementById('gLat').value)||activeGarden.lat,
    lon:parseFloat(document.getElementById('gLon').value)||activeGarden.lon,
    soil:document.getElementById('gSoil').value,
    desc:document.getElementById('gDesc').value
  };
  cfgGardens.push(g);
  saveGardens();
  switchGarden(g.id);
  document.getElementById('gName').value='';
  document.getElementById('gDesc').value='';
  renderGardenList();
  showToast('✅ Jardin ajouté');
}

function deleteGarden(id){
  if(cfgGardens.length===1){showToast('⚠️ Un jardin minimum','w');return;}
  cfgGardens=cfgGardens.filter(g=>g.id!==id);
  if(activeGarden.id===id){activeGarden=cfgGardens[0];localStorage.setItem('o_active_garden',activeGarden.id);}
  saveGardens();
  renderGardenList();
  showToast('✅ Jardin supprimé');
}

function renderGardenList(){
  document.getElementById('gardenList').innerHTML=cfgGardens.map(g=>`<div class="gc${g.id===activeGarden.id?' active':''}" onclick="switchGarden('${g.id}')"><span style="flex:1"><strong>${g.emoji} ${g.name}</strong><br><span style="font-size:.7em;color:var(--tm)">${g.desc}</span></span><button class="btn bs" onclick="deleteGarden('${g.id}');event.stopPropagation()" style="font-size:.7em;padding:3px 6px">🗑</button></div>`).join('');
}

function updateHeader(){
  document.getElementById('hdDate').textContent=`${JOURS[now.getDay()]} ${now.getDate()} ${MOIS[now.getMonth()]} ${now.getFullYear()} · ${activeGarden.name}`;
}

// ════════════════════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════════════════════
function goTab(id,btn){
  document.querySelectorAll('.tp').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));
  document.getElementById('tab-'+id).classList.add('on');
  if(btn)btn.classList.add('on');
  
  const actions={
    oracle:()=>{fetchAndRenderWxWidget();renderPlantAlerts();renderHarvestAlerts();},
    terrain:()=>{renderTerrain();renderHarvestAlerts();},
    meteo:()=>{renderMoonStrip([]);if(!meteoLoaded)fetch7Day();if(!hourlyLoaded)fetchHourly();},
    diagnostic:()=>{renderDiagHistory();},
    maladies:()=>{renderLib();},
    taches:()=>{renderTasks();},
    semences:()=>{renderSeeds();},
    sante:()=>{renderHealthTab();},
    galerie:()=>{renderGallery();},
    meteohistory:()=>{renderMeteoHistory();},
    semis:()=>{renderSowingAssistant();},
    calendrier:()=>{renderCalendar();},
    stats:()=>{renderStats();},
    comparaison:()=>{initComparison();},
    historique:()=>{renderHistory();document.getElementById('dotHist').classList.remove('on');},
    journal:()=>{renderJournal();},
    notifs:()=>{renderNotifPanel();},
    jardins:()=>{renderGardenList();},
    config:()=>{}
  };
  
  if(actions[id])actions[id]();
}

// ════════════════════════════════════════════════════════════
// PLACEHOLDER FUNCTIONS (to be expanded)
// ════════════════════════════════════════════════════════════
function fetchAndRenderWxWidget(){}
function renderPlantAlerts(){}
function renderHarvestAlerts(){}
function renderTerrain(){}
function renderMoonStrip(){}
function fetch7Day(){}
function fetchHourly(){}
function renderDiagHistory(){}
function renderLib(){}
function renderTasks(){}
function renderSeeds(){}
function renderHealthTab(){}
function renderGallery(){}
function renderMeteoHistory(){}
function renderSowingAssistant(){}
function renderCalendar(){}
function renderStats(){}
function initComparison(){}
function renderHistory(){}
function renderJournal(){}
function renderNotifPanel(){}
function initNotifications(){}
function clearCache(){}
function exportPDF(){}
function shareBriefing(){}
function sharePNG(){}
function startCam(){}
function analyzeLight(){}
function launchOracle(){}
function handleDiagPhoto(){}
function runDiagnosis(){}
function clearDiag(){}
function clearSoilDiag(){}
function handleSoilPhoto(){}
function runSoilAnalysis(){}
function renderDiagHistory(){}
function clearDiagHistory(){}
function searchDiseaseMistral(){}
function filterLib(){}
function addTask(){}
function addSeed(){}
function calNav(){}
function runComparison(){}
function filterHistory(){}
function saveJournal(){}
function shareJournal(){}
function exportJournalTxt(){}
function exportJournalMd(){}
function toggleRecording(){}
function reqNotif(){}
function testNotif(){}
function addCustomNotif(){}
function nukeAll(){localStorage.clear();location.reload();}
function setGalFilter(){}
function closeLB(){}
function closeQR(){}
function downloadQR(){}
function generateQR(){}
function fetchAndSaveMeteoWeek(){}

// ════════════════════════════════════════════════════════════
// Ensure DOM is ready
// ════════════════════════════════════════════════════════════
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>initDB().then(()=>{initTheme();initPWA();initOffline();initGardens();initAPIKey();updateHeader();renderGardenList();initNotifications();}).catch(e=>console.error(e)));
}else{
  initDB().then(()=>{initTheme();initPWA();initOffline();initGardens();initAPIKey();updateHeader();renderGardenList();initNotifications();}).catch(e=>console.error(e));
}
