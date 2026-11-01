/* Install-to-home-screen prompt and service worker registration. */
import {render} from "./store.js";
import {IC,toast} from "./ui.js";

let installEvt=null;
export const isStandalone=()=>window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
export const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);

export function installHTML(){
  if(isStandalone())return'<div class="hint">'+IC.phone+'<span>Duit Gue udah ter-install dan bisa dibuka tanpa internet.</span></div>';
  if(installEvt)return'<div class="banner" style="border-color:var(--accent);background:var(--accent-soft)"><p><b>Install Duit Gue ke HP.</b> Muncul di layar utama dan bisa dibuka tanpa internet.</p><button class="btn sm" data-install>Install</button></div>';
  if(isIOS())return'<div class="hint">'+IC.phone+'<span>Biar bisa dibuka tanpa internet: tekan tombol <b>Share</b> di Safari, lalu pilih <b>Add to Home Screen</b>.</span></div>';
  return'<div class="hint">'+IC.phone+'<span>Biar bisa dibuka tanpa internet, buka menu browser lalu pilih <b>Install app</b> atau <b>Tambahkan ke layar utama</b>.</span></div>';
}
export async function doInstall(){if(!installEvt)return;installEvt.prompt();try{await installEvt.userChoice;}catch(e){}installEvt=null;render();}

export function initPwa(){
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e;render();});
  window.addEventListener("appinstalled",()=>{installEvt=null;toast("Duit Gue ter-install. Sekarang bisa dibuka dari layar utama.",3500);render();});
  const local=location.hostname==="localhost"||location.hostname==="127.0.0.1";
  if("serviceWorker" in navigator&&(location.protocol==="https:"||local))
    window.addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").catch(()=>{});});
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}
}
