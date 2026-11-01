/* Backup, restore, Excel export, privacy note, wipe. */
import {S,render,replaceData,markBackup} from "../store.js";
import {esc,ymd,fmtDate,BLN} from "../util.js";
import {makeBackup,parseBackup,emptyData} from "../model.js";
import {buildWorkbook,exRange,txsInRange,EX_OPT} from "../xlsx.js";
import {$,showSheet,closeSheet,closeBtn,toast,download} from "../ui.js";
import {isIOS} from "../pwa.js";

/* Share sheet when the device supports sharing files (Android/iOS), plain download otherwise. */
async function shareOrDownload(blob,name,shareText){
  try{
    const file=new File([blob],name,{type:blob.type});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name,text:shareText});return"shared";}
  }catch(e){if(e&&e.name==="AbortError")return"cancelled";}
  download(blob,name);return"downloaded";
}

export async function doBackup(){
  const today=ymd(new Date()),name="duitgue-backup-"+today+".json";
  const blob=new Blob([JSON.stringify(makeBackup(S.data),null,1)],{type:"application/json"});
  const r=await shareOrDownload(blob,name,"Backup Duit Gue "+fmtDate(today));
  if(r==="cancelled"){toast("Backup dibatalin.");return;}
  markBackup();
  toast(r==="shared"?"Backup terkirim. Simpan di Google Drive atau chat WA ke diri sendiri biar aman.":"File backup disimpan. Taruh di tempat aman, misalnya Google Drive.",4200);
  render();
}

const fileIn=document.createElement("input");fileIn.type="file";fileIn.accept=".json,application/json";fileIn.hidden=true;document.body.appendChild(fileIn);
fileIn.addEventListener("change",()=>{
  const f=fileIn.files&&fileIn.files[0];fileIn.value="";if(!f)return;
  if(f.size>50e6){toast("File-nya kegedean. Pastikan itu file backup Duit Gue.");return;}
  const rd=new FileReader();
  rd.onload=()=>{let raw=null;try{raw=JSON.parse(rd.result);}catch(e){}
    const d=parseBackup(raw);
    if(!d){toast("File ini bukan backup Duit Gue, atau isinya rusak.",3500);return;}
    confirmRestore(d,raw.exportedAt);};
  rd.onerror=()=>toast("File nggak bisa dibaca.");
  rd.readAsText(f);
});
export const pickRestore=()=>fileIn.click();

function confirmRestore(d,when){
  const dt=when&&!isNaN(new Date(when))?new Date(when):null,now=S.data.txs.length;
  const html='<div class="row between"><h2>Pulihkan backup?</h2>'+closeBtn+'</div>'+
   '<div class="panel stack" style="gap:6px"><div><b>File backup</b>'+(dt?' dari '+dt.getDate()+" "+BLN[dt.getMonth()]+" "+dt.getFullYear():"")+'</div><div class="muted">'+d.wallets.length+' akun · '+d.txs.length+' catatan</div></div>'+
   (S.data.wallets.length?'<p style="margin:0">Semua data yang ada sekarang di perangkat ini (<b>'+now+' catatan</b>) bakal <b>diganti</b> sama isi backup.</p>':'')+
   '<div class="row"><button class="btn ghost" data-close>Batal</button><button class="btn wide" id="rsGo">Pulihkan</button></div>';
  showSheet(html,()=>{$("#sheet").onclick=e=>{const b=e.target.closest("button");if(!b)return;
    if(b.hasAttribute("data-close"))return closeSheet();
    if(b.id==="rsGo"){closeSheet();replaceData(d);toast("Data berhasil dipulihkan.");}
  };});
}

export function wipeAll(){replaceData(emptyData());}

let EX="month";
export function openExport(){
  const R=exRange(S.data,EX),n=txsInRange(S.data,R).length;
  const html='<div class="row between"><h2>Ekspor ke Excel</h2>'+closeBtn+'</div>'+
   '<p class="muted" style="margin:0;font-size:13.5px">Bikin file Excel dari catatan lo. Bisa dibuka di Excel, Google Sheets, atau WPS.</p>'+
   '<div class="field"><label>Periode</label><div class="chips">'+EX_OPT.map(([k,l])=>'<button class="chip" data-ex="'+k+'" aria-pressed="'+(EX===k)+'">'+l+'</button>').join("")+'</div></div>'+
   '<div class="panel stack" style="gap:4px"><b>'+esc(R.label)+'</b><span class="muted" style="font-size:13.5px">'+n+' catatan · isinya: transaksi, ringkasan, saldo akun</span></div>'+
   '<button class="btn wide" id="exGo">Download Excel</button>';
  showSheet(html,()=>{$("#sheet").onclick=async e=>{const b=e.target.closest("button");if(!b)return;
    if(b.hasAttribute("data-close"))return closeSheet();
    if(b.dataset.ex){EX=b.dataset.ex;openExport();return;}
    if(b.id==="exGo")await doExport();
  };});
}
async function doExport(){
  let W;try{W=buildWorkbook(S.data,EX);}catch(e){toast("File Excel gagal dibuat.");return;}
  /* iOS can't download blobs from an installed app, so it always goes through the share sheet */
  if(isIOS()){const r=await shareOrDownload(W.blob,W.name);if(r==="cancelled")return;closeSheet();toast("File Excel siap.");return;}
  try{download(W.blob,W.name);closeSheet();toast("File Excel didownload: "+W.name,4000);}catch(e){toast("Download gagal di browser ini.");}
}

export function openPrivacy(){
  const html='<div class="row between"><h2>Privasi</h2>'+closeBtn+'</div>'+
   '<div class="stack" style="gap:12px;font-size:14.5px">'+
   '<p style="margin:0"><b>Data keuangan lo cuma ada di perangkat lo.</b> Semua yang lo catat (saldo, nama akun, transaksi, keterangan, kategori) disimpan di browser HP atau laptop yang lo pakai. Nggak ada server yang nyimpen atau bisa ngelihat data lo.</p>'+
   '<p style="margin:0"><b>Nggak pakai akun.</b> Duit Gue nggak minta login, nomor rekening, nomor HP, PIN, atau password.</p>'+
   '<p style="margin:0"><b>File backup adalah tanggung jawab lo.</b> File backup berisi semua catatan keuangan lo. Simpan di tempat yang aman dan jangan dibagikan ke orang lain.</p>'+
   '<p style="margin:0"><b>Hapus data kapan aja.</b> Tekan "Hapus semua data" di beranda, atau hapus data situs ini lewat pengaturan browser.</p>'+
   '<p class="muted" style="margin:0;font-size:13px">Tampilan huruf dimuat dari Google Fonts, jadi browser lo terhubung ke server Google waktu membuka halaman ini. Data keuangan lo nggak ikut terkirim.</p></div>'+
   '<button class="btn wide" data-close>Oke, ngerti</button>';
  showSheet(html,()=>{$("#sheet").onclick=e=>{const b=e.target.closest("button");if(b&&b.hasAttribute("data-close"))closeSheet();};});
}
