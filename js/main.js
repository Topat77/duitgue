/* Entry point: login gate, page switching, and the click dispatcher for everything outside the bottom sheet. */
import {S,setRender,start,login,logout} from "./store.js";
import {$,closeSheet,sheetOpen,toast,armConfirm} from "./ui.js";
import {renderHome,renderEmoney,renderCash} from "./views.js";
import {openTx,openWithdraw} from "./sheets/tx.js";
import {openWallet} from "./sheets/wallet.js";
import {openCatMgr} from "./sheets/categories.js";
import {doBackup,pickRestore,openExport,openPrivacy,wipeAll} from "./sheets/data.js";
import {initPwa,doInstall} from "./pwa.js";

const VIEWS={home:renderHome,emoney:renderEmoney,cash:renderCash};
let loginBusy=false;

function renderStatus(){
  const ml=$("#modeLbl");
  if(S.phase!=="ready"){ml.hidden=true;return;}
  const off=navigator.onLine===false||S.sync.fromCache;
  ml.hidden=false;
  ml.className="mode"+(off||S.sync.pending?" local":"");
  ml.textContent=off?(S.sync.pending?"Offline · nanti disinkron":"Offline"):S.sync.pending?"Menyinkronkan…":"Tersinkron";
}
function renderWelcome(){
  const nocloud=S.phase==="nocloud";
  $("#gLogin").disabled=loginBusy||nocloud;
  $("#gLoginTxt").textContent=loginBusy?"Membuka Google…":"Masuk pakai Google";
  if(nocloud)$("#gLoginErr").textContent="Butuh internet buat masuk pertama kali. Nyalain internet terus buka lagi halaman ini.";
}
function render(){
  const ph=S.phase,inApp=ph==="ready"||ph==="loading"||ph==="boot";
  $("#welcome").hidden=inApp;$(".app").hidden=!inApp;
  renderStatus();
  if(!inApp){$(".botnav").hidden=true;renderWelcome();return;}
  const ready=ph==="ready"&&S.data.wallets.length>0;
  if(!ready||!VIEWS[S.view])S.view="home";
  document.querySelectorAll("[data-view]").forEach(b=>{if(b.dataset.view===S.view)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  $(".botnav").hidden=!ready;$(".topnav").style.visibility=ready?"":"hidden";
  $("#loading").hidden=ph==="ready";
  Object.keys(VIEWS).forEach(v=>$("#v-"+v).hidden=ph!=="ready"||S.view!==v);
  if(ph==="ready")VIEWS[S.view]();
}
function setView(v){if(S.view!==v)S.hq="";S.view=v;render();window.scrollTo(0,0);}

async function doLogin(){
  if(loginBusy)return;
  const err=$("#gLoginErr");err.textContent="";loginBusy=true;render();
  try{await login();}
  catch(e){const c=e&&e.code;
    if(c==="auth/network-request-failed")err.textContent="Internetnya putus. Cek koneksi terus coba lagi.";
    else if(c==="auth/unauthorized-domain")err.textContent="Alamat ini belum diizinkan buat login. Tambahin di Firebase Console → Authentication → Settings → Authorized domains.";
    else if(c!=="auth/popup-closed-by-user"&&c!=="auth/cancelled-popup-request")err.textContent="Gagal masuk. Coba lagi sebentar.";}
  loginBusy=false;render();
}
$("#gLogin").addEventListener("click",doLogin);

document.addEventListener("click",async e=>{
  const b=e.target.closest("button");
  if(!b||b.closest("#sheet")||b.closest("#welcome"))return; // sheets and the login screen handle their own buttons
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
  if(ds.confirm==="logout"&&armConfirm(b))await logout();
});
$("#backdrop").addEventListener("click",e=>{if(e.target.id==="backdrop")closeSheet();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&sheetOpen())closeSheet();});
window.addEventListener("online",renderStatus);
window.addEventListener("offline",renderStatus);

setRender(render,renderStatus);
initPwa();
render();
start();
