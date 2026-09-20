import { photos as demoPhotos, albums } from './data.js';
import { BridgeAdapter } from './bridge-adapter.js';

const app = document.querySelector('#app');
const state = { route:'home', selected:null, query:'', upload:null, photos:[...demoPhotos], bridge:{configured:false,connected:false,mode:'demo',health:null,error:null} };

const icon = name => {
  const paths = {
    home:'<path d="M3 11.5 12 4l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    albums:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="m7 15 3-3 3 3 2-2 3 3"/><path d="M8 5V3h8v2"/>',
    add:'<path d="M12 5v14M5 12h14"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    more:'<path d="M5 7h14M5 12h14M5 17h14"/>',
    heart:'<path d="M20.8 4.6c-1.6-1.6-4.2-1.6-5.8 0L12 7.6 9 4.6A4.1 4.1 0 0 0 3.2 10.4L12 19l8.8-8.6a4.1 4.1 0 0 0 0-5.8Z"/>',
    cloud:'<path d="M17.5 19H6.3A4.3 4.3 0 0 1 5.4 10.5 6.8 6.8 0 0 1 18.2 9a5 5 0 0 1-.7 10Z"/>',
    camera:'<path d="M14.5 5 16 7h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4l1.5-2Z"/><circle cx="12" cy="13" r="4"/>',
    share:'<circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/>',
    download:'<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 21h14"/>',
    edit:'<path d="m4 20 4.5-1 10-10-3.5-3.5-10 10Z"/><path d="m13.5 6.5 3.5 3.5"/>',
    map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||''}</svg>`;
};

function render() {
  app.innerHTML = `
    <div class="shell">
      <aside class="desktop-sidebar">
        ${brand()}
        <nav>${desktopNav()}</nav>
        <div class="storage-card"><div>${icon('cloud')}<span>JATcam Bridge</span></div><div class="storage-track"><span style="width:${state.bridge.connected?'100':'18'}%"></span></div><small>${bridgeStatusLabel()}</small></div>
        <button class="side-settings">Settings</button>
      </aside>
      <main class="main">${topbar()}${routeView()}</main>
      ${bottomNav()}
      ${state.selected ? photoModal(state.selected) : ''}
    </div>`;
  bindEvents();
}

function brand(){return `<button class="brand" data-route="home"><span class="brand-mark">${icon('camera')}</span><span><strong>JATcam</strong><small>Capture. Organize. Share.</small></span></button>`}

function bridgeStatusLabel(){
  if(state.bridge.connected) return 'PC bridge connected';
  if(state.bridge.configured) return 'Bridge unavailable';
  return 'Demo mode';
}

function topbar(){return `<header class="topbar"><div class="mobile-brand">${brand()}</div><div class="topbar-search">${icon('search')}<input id="globalSearch" value="${state.query}" placeholder="Search your photos…"/></div><div class="sync-pill">${icon('cloud')}<span>${state.bridge.connected?'Bridge':'Demo'}<small>${bridgeStatusLabel()}</small></span></div><button class="avatar">J</button></header>`}

function desktopNav(){
 const items=[['home','Photos','home'],['albums','Albums','albums'],['heart','Favorites','favorites'],['map','Explore (Map)','search'],['share','Shared Links','more']];
 return items.map(([i,l,r])=>`<button class="side-nav ${state.route===r?'active':''}" data-route="${r}">${icon(i)}<span>${l}</span></button>`).join('') + `<button class="side-nav">${icon('more')}<span>Trash</span></button>`;
}

function bottomNav(){
 const items=[['home','Home','home'],['albums','Albums','albums'],['add','Add','upload'],['search','Search','search'],['more','More','more']];
 return `<nav class="bottom-nav">${items.map(([i,l,r])=>`<button class="${state.route===r?'active':''} ${r==='upload'?'add-button':''}" data-route="${r}">${icon(i)}<span>${l}</span></button>`).join('')}</nav>`;
}

function routeView(){
 if(state.route==='albums') return albumsView();
 if(state.route==='upload') return uploadView();
 if(state.route==='search') return searchView();
 if(state.route==='favorites') return libraryView(state.photos.filter(p=>p.favorite),'Favorites');
 if(state.route==='more') return moreView();
 return homeView();
}

function homeView(){
 return `<section class="page home-page">
   <div class="hero-row"><div><p class="eyebrow">PRIVATE PHOTO LIBRARY</p><h1>Good evening, JAT.</h1><p>${state.photos.length} photos · ${bridgeStatusLabel()}</p></div><div class="hero-badge">${icon('lock')} Private by design</div></div>
   <div class="quick-links">
    ${quick('clock','Recent','home')}${quick('albums','Albums','albums')}${quick('heart','Favorites','favorites')}${quick('camera','RAW','home')}${quick('edit','Edited','albums')}
   </div>
   ${librarySection('Recent', state.photos)}
 </section>`;
}
function quick(i,label,route){return `<button class="quick" data-route="${route}"><span>${icon(i==='clock'?'camera':i)}</span><small>${label}</small></button>`}
function librarySection(title,list){return `<div class="section-head"><h2>${title}</h2><button>See all</button></div><div class="photo-grid">${list.map(photoCard).join('')}</div>`}
function libraryView(list,title){return `<section class="page"><div class="page-title"><div><p class="eyebrow">LIBRARY</p><h1>${title}</h1></div><span>${list.length} shown</span></div>${librarySection(title,list)}</section>`}
function photoCard(p){return `<button class="photo-card" data-photo="${p.id}" aria-label="Open ${p.title}"><img src="${p.src}" alt="${p.title}" loading="lazy"/><span class="photo-overlay"><strong>${p.title}</strong><small>${p.type} · ${p.rating}★</small></span>${p.favorite?'<span class="fav">♥</span>':''}</button>`}

function albumsView(){return `<section class="page"><div class="page-title"><div><p class="eyebrow">COLLECTIONS</p><h1>Albums</h1></div><button class="round-action">+</button></div><div class="segmented"><button class="selected">My Albums</button><button>Shared</button><button>Favorites</button></div><div class="album-list">${albums.map(a=>{const p=state.photos.find(x=>x.id===a.cover) || demoPhotos.find(x=>x.id===a.cover);return `<button class="album-row"><img src="${p.src}" alt=""/><span><strong>${a.name}</strong><small>${a.count} photos</small></span><b>•••</b></button>`}).join('')}</div></section>`}

function uploadView(){return `<section class="page narrow"><div class="page-title"><div><p class="eyebrow">IMPORT</p><h1>Upload Photos</h1></div></div><label class="dropzone"><input type="file" id="fileInput" accept="image/*,.cr2" multiple/><span class="plus">+</span><strong>Add Photos</strong><small>Tap to select photos or RAW files</small></label><div class="upload-options"><button>${icon('camera')}<span><strong>Camera Connect</strong><small>Import after transfer from your Canon camera</small></span>›</button><button id="phoneUpload">${icon('add')}<span><strong>From Phone</strong><small>Choose from this device</small></span>›</button><button>${icon('albums')}<span><strong>From SD Card</strong><small>Use your device or card reader</small></span>›</button><button>${icon('download')}<span><strong>From Desktop</strong><small>Drag & drop or select files</small></span>›</button></div>${uploadStatus()}</section>`}
function uploadStatus(){if(!state.upload)return `<div class="upload-note">${icon('cloud')}<span><strong>RAW + JPG supported</strong><small>Original quality. Private OneDrive storage.</small></span></div>`;return `<div class="upload-progress"><div>${icon('cloud')}<span><strong>Uploading to OneDrive…</strong><small>${state.upload.complete} of ${state.upload.total}${state.upload.name?` · ${state.upload.name}`:''}</small></span></div><progress max="${state.upload.total}" value="${state.upload.complete}"></progress></div>`}

function searchView(){
 const q=state.query.toLowerCase().trim(); const filtered=state.photos.filter(p=>!q || [p.title,p.album,p.camera,p.type,p.location,...p.tags].join(' ').toLowerCase().includes(q));
 return `<section class="page"><div class="page-title"><div><p class="eyebrow">FIND</p><h1>Search</h1></div></div><div class="mobile-search">${icon('search')}<input id="mobileSearch" value="${state.query}" placeholder="Search photos, albums, tags…"/></div><div class="chips"><button class="active">All</button><button>Photos</button><button>Favorites</button><button>RAW</button><button>Location ▾</button><button>Date ▾</button><button>Camera ▾</button></div><div class="map-card"><div>${icon('map')}<strong>Explore by location</strong><small>Map view will use photo location metadata.</small></div><span>Yosemite · 142 photos</span></div><div class="section-head"><h2>Results</h2><button>${filtered.length} photos</button></div><div class="photo-grid">${filtered.map(photoCard).join('')}</div></section>`;
}

function moreView(){return `<section class="page narrow"><div class="page-title"><div><p class="eyebrow">JATCAM</p><h1>More</h1></div></div>
  <div class="bridge-settings">
    <div class="bridge-settings-head"><span class="status-dot ${state.bridge.connected?'online':''}"></span><div><strong>JATcam Bridge</strong><small>${bridgeStatusLabel()}</small></div></div>
    <p>Your Windows PC acts as the private gateway to the JATcam folder inside your locally synced OneDrive.</p>
    <label>Private bridge URL<input id="bridgeUrl" type="url" value="${BridgeAdapter.getUrl()}" placeholder="https://your-pc.your-tailnet.ts.net"/></label>
    <div class="bridge-actions"><button id="saveBridge" class="primary-action">Save & connect</button><button id="refreshBridge">Refresh library</button></div>
    ${state.bridge.error?`<p class="bridge-error">${state.bridge.error}</p>`:''}
    ${state.bridge.health?`<dl class="bridge-health"><div><dt>Storage</dt><dd>${state.bridge.health.storage}</dd></div><div><dt>Library</dt><dd>${state.bridge.health.libraryRoot}</dd></div></dl>`:''}
  </div>
  <div class="feature-cards"><article><span>${icon('cloud')}</span><div><strong>OneDrive-backed</strong><p>The bridge writes into your normal OneDrive sync folder. No Azure or Graph API is required.</p></div></article><article><span>${icon('camera')}</span><div><strong>Canon friendly</strong><p>Transfer from the T7i to phone or SD card, then upload through JATcam.</p></div></article><article><span>${icon('lock')}</span><div><strong>Tailnet only</strong><p>Use Tailscale Serve so the bridge is reachable by your devices without making it public.</p></div></article></div></section>`}

function photoModal(p){return `<div class="modal-backdrop" data-close-modal><article class="detail-card" role="dialog" aria-modal="true"><button class="modal-close" data-close-modal>×</button><img class="detail-image" src="${p.src}" alt="${p.title}"/><div class="detail-content"><div class="detail-heading"><div><p class="eyebrow">${p.album}</p><h2>${p.title}</h2><p>${p.location}<br>${p.date}</p></div><button class="heart ${p.favorite?'on':''}">♥</button></div><div class="stars">${[1,2,3,4,5].map(n=>`<span class="${n<=p.rating?'on':''}">★</span>`).join('')}</div><dl class="metadata"><div><dt>Camera</dt><dd>${p.camera}</dd></div><div><dt>Lens</dt><dd>${p.lens}</dd></div><div><dt>Shutter</dt><dd>${p.shutter}</dd></div><div><dt>Aperture</dt><dd>${p.aperture}</dd></div><div><dt>ISO</dt><dd>${p.iso}</dd></div><div><dt>Focal length</dt><dd>${p.focal}</dd></div><div><dt>File</dt><dd>${p.file} <em>${p.type}</em></dd></div></dl><div class="tag-row">${p.tags.map(t=>`<span>${t}</span>`).join('')}</div><div class="detail-actions"><button>${icon('share')}<span>Share</span></button><button>${icon('download')}<span>Download</span></button><button>${icon('edit')}<span>Edit</span></button><button>${icon('more')}<span>More</span></button></div></div></article></div>`}

function bindEvents(){
 document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{state.route=b.dataset.route;render();});
 document.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>{state.selected=state.photos.find(p=>p.id===b.dataset.photo);render();});
 document.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=e=>{if(e.target===b){state.selected=null;render();}});
 for(const id of ['globalSearch','mobileSearch']){const el=document.getElementById(id);if(el)el.oninput=e=>{state.query=e.target.value;if(id==='globalSearch'&&state.route!=='search')state.route='search';render();};}
 const input=document.getElementById('fileInput'); if(input)input.onchange=e=>upload(e.target.files);
 const phone=document.getElementById('phoneUpload'); if(phone)phone.onclick=()=>document.getElementById('fileInput')?.click();
 const saveBridge=document.getElementById('saveBridge'); if(saveBridge)saveBridge.onclick=saveBridgeSettings;
 const refreshBridge=document.getElementById('refreshBridge'); if(refreshBridge)refreshBridge.onclick=refreshBridgePhotos;
}
async function upload(fileList){
  const files=[...fileList];
  if(!files.length)return;
  state.upload={complete:0,total:files.length,name:''};
  render();
bootstrapBridge().then(render).catch(error=>{state.bridge.error=error.message;render();});
  try{
    await BridgeAdapter.uploadFiles(files,p=>{state.upload=p;render();});
    await refreshBridgePhotos(false);
  }catch(error){
    state.bridge.error=error.message;
  }
  setTimeout(()=>{state.upload=null;render();},800);
}

async function saveBridgeSettings(){
  const input=document.getElementById('bridgeUrl');
  BridgeAdapter.saveUrl(input?.value || '');
  await bootstrapBridge();
  state.route='more';
  render();
}

async function refreshBridgePhotos(shouldRender=true){
  if(!state.bridge.connected){
    if(shouldRender) render();
    return;
  }
  state.photos=await BridgeAdapter.listPhotos();
  if(shouldRender) render();
}

async function bootstrapBridge(){
  state.bridge=await BridgeAdapter.initialize();
  if(state.bridge.connected){
    state.photos=await BridgeAdapter.listPhotos();
  }else{
    state.photos=[...demoPhotos];
  }
}

if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
