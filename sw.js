/* Oracle du Jardinier — proper same-origin Service Worker; no API/user-data caching. */
'use strict';
const CACHE='oracle-du-jardinier-shell-v19-safe-gardens';
const PREFIX='oracle-du-jardinier-shell-';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon.svg','./studio-niko-core.js'];
const URLS=new Set(SHELL.map(x=>new URL(x,self.registration.scope).pathname));
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE)
    .then(cache=>cache.addAll(SHELL))
    .then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>
    k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  if(url.search)return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(res=>{
      if(res.ok&&URLS.has(url.pathname)){
        const clone=res.clone();
        event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,clone)).catch(()=>{}));
      }
      return res;
    }).catch(async()=>await caches.match(req)||(await caches.match('./index.html'))||Response.error()));
    return;
  }
  if(!URLS.has(url.pathname))return;
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{
    if(res.ok&&res.type==='basic'){
      const clone=res.clone();
      event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,clone)).catch(()=>{}));
    }
    return res;
  })));
});
