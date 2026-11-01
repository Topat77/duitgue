/* Shared DOM bits: icons, bottom sheet, toast, money inputs, two-tap confirm. */
import {digits,dotted} from "./util.js";

export const $=s=>document.querySelector(s);
export const IC={
  in:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  out:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  move:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h14l-3-3M20 16H6l3 3"/></svg>',
  left:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18h3"/></svg>',
  wallet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 14.5h2"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'
};

let tt;
export function toast(m,ms){const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,ms||2600);}

export const sheetOpen=()=>!$("#backdrop").hidden;
/* Opens the sheet, or swaps its content when it is already open (keeps scroll and avoids the open animation). */
export function showSheet(html,bind){
  const wasOpen=sheetOpen();
  $("#sheet").innerHTML='<div class="grab"></div>'+html;
  if(!wasOpen){$("#backdrop").hidden=false;document.body.style.overflow="hidden";}
  bind();
}
export function closeSheet(){$("#backdrop").hidden=true;$("#sheet").innerHTML="";$("#sheet").onclick=null;document.body.style.overflow="";}
export const closeBtn='<button class="iconbtn" data-close aria-label="Tutup">'+IC.x+'</button>';

export function moneyInput(inp){inp.addEventListener("input",()=>{inp.value=dotted(digits(inp.value));});}

/* First tap arms the button, second tap within 4 s confirms. Returns true on the confirming tap. */
export function armConfirm(b,armedText="Yakin? Tekan lagi"){
  if(b.classList.contains("armed"))return true;
  const orig=b.textContent;b.classList.add("armed");b.textContent=armedText;
  setTimeout(()=>{if(b.isConnected){b.classList.remove("armed");b.textContent=orig;}},4000);
  return false;
}

export function download(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
