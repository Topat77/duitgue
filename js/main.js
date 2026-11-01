/* Entry point: page switching and the click dispatcher for everything outside the bottom sheet. */
import {S,setRender,load} from "./store.js";
import {$,closeSheet,sheetOpen,toast,armConfirm} from "./ui.js";
import {renderHome,renderEmoney,renderCash} from "./views.js";
import {openTx,openWithdraw} from "./sheets/tx.js";
import {openWallet} from "./sheets/wallet.js";
import {openCatMgr} from "./sheets/categories.js";
import {doBackup,pickRestore,openExport,openPrivacy,wipeAll} from "./sheets/data.js";
import {initPwa,doInstall} from "./pwa.js";

const VIEWS={home:renderHome,emoney:renderEmoney,cash:renderCash};

function render(){
  const ready=S.data.wallets.length>0;
  if(!ready||!VIEWS[S.view])S.view="home";
  document.querySelectorAll("[data-view]").forEach(b=>{if(b.dataset.view===S.view)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  $(".botnav").hidden=!ready;$(".topnav").style.visibility=ready?"":"hidden";
  $("#loading").hidden=true;$("#modeLbl").hidden=false;
  Object.keys(VIEWS).forEach(v=>$("#v-"+v).hidden=S.view!==v);
  VIEWS[S.view]();
}
function setView(v){if(S.view!==v)S.hq="";S.view=v;render();window.scrollTo(0,0);}

document.addEventListener("click",e=>{
  const b=e.target.closest("button");
  if(!b||b.closest("#sheet"))return; // sheets handle their own buttons
  const ds=b.dataset,has=a=>b.hasAttribute(a);
  if(ds.view)return setView(ds.view);
  if(ds.go)return setView(ds.go);
  if(ds.act==="new")return openTx(null,ds.ctx||"cash");
  if(has("data-withdraw"))return openWithdraw();
  if(ds.edit)return openTx(ds.edit);
  if(ds.wedit)return openWallet(ds.wedit);
  if(has("data-wnew"))return openWallet(null);
  if(has("data-catmgr"))return openCatMgr();
  if(has("data-backup"))return doBackup();
  if(has("data-export"))return openExport();
  if(has("data-restore"))return pickRestore();
  if(has("data-privacy"))return openPrivacy();
  if(has("data-install"))return doInstall();
  if(ds.unit){S.rk.unit=ds.unit;S.rk.off=0;return render();}
  if(ds.off){S.rk.off=Math.min(0,S.rk.off+Number(ds.off));return render();}
  if(ds.filter){S.rk.filter=ds.filter;return render();}
  if(ds.confirm==="wipe"&&armConfirm(b)){wipeAll();toast("Semua data dihapus.");}
});
$("#backdrop").addEventListener("click",e=>{if(e.target.id==="backdrop")closeSheet();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&sheetOpen())closeSheet();});

setRender(render);
load();
initPwa();
render();
