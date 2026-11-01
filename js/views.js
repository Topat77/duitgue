/* Page renderers: Beranda (home + rekap), E-money, Dompet (cash). They build HTML from S.data;
   clicks are dispatched in main.js via data-* attributes. */
import {S,render,apply,lastBackup} from "./store.js";
import {esc,rp,short,pad,ymd,BULAN,BLN,HARI,HR,newId,digits,niceStep,fmtDate,dayLabel} from "./util.js";
import {totals,period,flows,byCategory,sortedTx,txMatch,catList,catName,wName,isCash,EM_SUGGEST} from "./model.js";
import {$,IC,toast,moneyInput} from "./ui.js";
import {installHTML} from "./pwa.js";

/* ---------- shared pieces ---------- */
export function txRow(t){
  const D=S.data;let title,sub,amt;
  if(t.type==="move"){title="Pindah ke "+esc(wName(D,t.to));sub="Dari "+esc(wName(D,t.wallet))+(Number(t.fee)>0?" · admin "+rp(t.fee):"");amt=rp(t.amount);}
  else{title=esc(catName(D,t.type,t.cat));sub=esc(wName(D,t.wallet));amt=(t.type==="in"?"+":"−")+rp(t.amount);}
  if(t.note){sub=title+" · "+sub;title=esc(t.note);}
  return'<button class="tx '+t.type+'" data-edit="'+esc(t.id)+'"><span class="ic">'+IC[t.type]+'</span><span class="mid"><span class="t1">'+title+'</span><span class="t2">'+sub+'</span></span><span class="amt num">'+amt+'</span></button>';
}
function groupedList(list,emptyMsg){
  if(!list.length)return'<div class="empty">'+emptyMsg+'</div>';
  let h="",cur=null;
  for(const t of list){if(t.date!==cur){cur=t.date;h+='<div class="daygrp"><span>'+dayLabel(cur)+'</span></div>';}h+=txRow(t);}
  return'<div class="txlist">'+h+'</div>';
}
function greeting(){const h=new Date().getHours(),n=((S.user&&S.user.name)||"").trim().split(/\s+/)[0];const g=h<11?"pagi":h<15?"siang":h<18?"sore":"malam";return n?g[0].toUpperCase()+g.slice(1)+", "+esc(n)+"!":"Selamat "+g+"!";}

/* history search on the E-money and Dompet pages */
const histFilter=list=>{const q=(S.hq||"").trim();return q?list.filter(t=>txMatch(S.data,t,q)):list;};
const histCount=(shown,total)=>S.hq&&S.hq.trim()?shown+" dari "+total+" catatan":total+" catatan";
function histSearchHTML(total){
  if(total<5&&!S.hq)return"";
  return'<div class="search" style="margin:10px 0 2px">'+IC.search+'<input class="inp" id="hq" type="search" placeholder="Cari catatan, mis. bensin, gopay, 50000" value="'+esc(S.hq||"")+'" autocomplete="off"></div>';
}
function bindHistSearch(){
  const el=$("#hq");if(!el)return;
  el.addEventListener("input",()=>{S.hq=el.value;const pos=el.selectionStart;render();
    const n=$("#hq");if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(e){}}});
}

/* ---------- banners ---------- */
function syncErrorBanner(){
  if(!S.syncError)return"";
  const rules=S.syncError==="permission-denied";
  return'<div class="banner" style="border-color:var(--out);background:var(--out-soft)"><p><b>'+(rules?"Data ditolak server.":"Data belum bisa disinkron.")+'</b> '+
   (rules?"Akun ini belum diizinkan nyimpen data (cek aturan Firestore). Catatan baru cuma ada di perangkat ini sampai masalahnya beres.":"Catatan tetap aman di perangkat ini dan bakal dicoba lagi. Kalau terus muncul, backup dulu biar aman.")+
   '</p><button class="btn sm" data-backup>Backup sekarang</button></div>';
}
function dataPanel(){
  const lb=lastBackup(),u=S.user;
  return'<div class="panel stack"><div class="row between" style="flex-wrap:wrap"><h3>Data lo</h3><span class="muted" style="font-size:13px">'+(lb?"Backup terakhir: "+fmtDate(lb):"Belum pernah backup")+'</span></div>'+
   '<p class="muted" style="margin:0;font-size:14px">Catatan lo tersimpan di akun dan tersinkron otomatis ke semua perangkat yang login pakai akun yang sama. Tetap bisa dipakai tanpa internet, nanti disinkron begitu online.</p>'+
   (u?'<div class="hint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/></svg><span>Masuk sebagai <b>'+esc(u.email)+'</b></span></div>':'')+
   installHTML()+
   '<div class="row" style="flex-wrap:wrap;gap:8px"><button class="btn sm" data-backup>Backup data</button><button class="btn sm ghost" data-export>Ekspor Excel</button><button class="btn sm ghost" data-restore>Pulihkan dari backup</button><button class="btn sm ghost" data-privacy>Privasi</button><button class="btn sm ghost" data-confirm="logout">Keluar</button><button class="btn sm danger" data-confirm="wipe">Hapus semua data</button></div></div>';
}

/* ---------- home ---------- */
export function renderHome(){
  const el=$("#v-home"),D=S.data;
  if(!D.wallets.length){el.innerHTML=onboardingHTML();bindOnboarding();return;}
  const T=totals(D),now=new Date(),nEm=D.wallets.filter(w=>!isCash(w)).length;
  el.innerHTML=syncErrorBanner()+
   '<div class="home-grid"><div class="stack">'+
    '<div class="greet"><div class="eyebrow">'+HARI[now.getDay()]+", "+now.getDate()+" "+BULAN[now.getMonth()]+" "+now.getFullYear()+'</div><h1>'+greeting()+'</h1></div>'+
    '<div class="note"><span class="serial">DG '+pad(now.getMonth()+1)+String(now.getFullYear()).slice(2)+'</span><div class="eyebrow">Total uang lo</div><div class="big num">'+rp(T.all)+'</div>'+
     '<div style="margin-top:10px;font-size:13px;opacity:.8">Gabungan uang cash dan semua akun e-money</div></div>'+
    '<div class="pockets">'+
     '<button class="pk em" data-go="emoney"><span class="ico">'+IC.phone+'</span><span class="stack" style="gap:0"><span class="nm">E-money'+IC.right+'</span><span class="sb">'+nEm+' akun</span></span><span class="vl num">'+rp(T.em)+'</span></button>'+
     '<button class="pk cs" data-go="cash"><span class="ico">'+IC.wallet+'</span><span class="stack" style="gap:0"><span class="nm">Dompet'+IC.right+'</span><span class="sb">Uang cash</span></span><span class="vl num">'+rp(T.cash)+'</span></button>'+
    '</div>'+
   '</div><div class="stack">'+rekapHTML()+'</div></div>'+
   dataPanel();
}

function onboardingHTML(){
  return'<div class="panel onb stack" style="max-width:620px;width:100%;margin:0 auto">'+
   '<div><div class="eyebrow">Langkah pertama</div><div class="big">Duit lo sekarang ada di mana aja?</div><p class="muted" style="margin:6px 0 0">Isi saldo yang lo pegang sekarang. Ini jadi titik awal, nanti tiap transaksi ngubah saldonya otomatis.</p></div>'+
   '<div class="field"><label for="onCash">Uang cash di dompet</label><div class="money"><input class="inp" id="onCash" inputmode="numeric" placeholder="0" autocomplete="off"></div></div>'+
   '<div class="field"><label>Akun e-money &amp; rekening</label><div id="emRows" class="stack" style="gap:8px"></div>'+
    '<div class="chips" id="emSug" style="margin-top:4px">'+EM_SUGGEST.map(n=>'<button class="chip" data-sug="'+n+'">+ '+n+'</button>').join("")+'<button class="chip" data-sug="">+ Lainnya</button></div></div>'+
   '<div class="hint">'+IC.lock+'<span>Cukup nama akun dan saldonya. Duit Gue nggak pernah minta nomor rekening, nomor HP, atau PIN.</span></div>'+
   '<p class="err" id="onErr"></p>'+
   '<div class="row" style="flex-wrap:wrap"><button class="btn" id="onGo">Mulai pakai</button><button class="btn ghost" data-restore>Pulihkan dari file backup</button></div></div>';
}
function bindOnboarding(){
  const rows=$("#emRows");
  const addRow=name=>{const d=document.createElement("div");d.className="emrow";
    d.innerHTML='<input class="inp" placeholder="Nama akun, mis. GoPay" maxlength="24" value="'+esc(name)+'" aria-label="Nama akun"><div class="money"><input class="inp" inputmode="numeric" placeholder="0" aria-label="Saldo"></div><button class="iconbtn" aria-label="Hapus baris">'+IC.x+'</button>';
    d.querySelector(".iconbtn").onclick=()=>d.remove();moneyInput(d.querySelector(".money input"));rows.appendChild(d);
    (name?d.querySelector(".money input"):d.querySelector("input")).focus();};
  moneyInput($("#onCash"));
  $("#emSug").onclick=e=>{const b=e.target.closest("[data-sug]");if(b)addRow(b.dataset.sug);};
  $("#onGo").onclick=()=>{
    const ws=[{id:"cash",name:"Cash",kind:"cash",start:digits($("#onCash").value)}],seen=new Set(["cash"]);
    for(const r of rows.children){const [n,m]=r.querySelectorAll("input");const nm=n.value.trim();if(!nm&&!digits(m.value))continue;
      if(!nm){$("#onErr").textContent="Ada akun yang belum dikasih nama.";return;}
      if(seen.has(nm.toLowerCase())){$("#onErr").textContent="Nama akun "+nm+" dobel.";return;}
      seen.add(nm.toLowerCase());ws.push({id:newId(),name:nm,kind:"emoney",start:digits(m.value)});}
    apply({wallets:ws});toast("Siap! Sekarang tinggal catat transaksi.");
  };
}

/* ---------- dompet (cash) ---------- */
export function renderCash(){
  const el=$("#v-cash"),D=S.data,T=totals(D),cw=D.wallets.find(isCash),hasEm=D.wallets.some(w=>!isCash(w));
  const all=cw?sortedTx(D.txs.filter(t=>t.wallet===cw.id||t.to===cw.id)):[],list=histFilter(all);
  el.innerHTML='<div class="pghead"><div><div class="eyebrow"><span class="dot cash"></span> Dompet · uang cash</div><div class="v num">'+rp(T.cash)+'</div></div>'+
   '<div class="acts"><button class="btn" data-act="new" data-ctx="cash">'+IC.plus+'Catat</button>'+(hasEm?'<button class="btn ghost" data-withdraw>Tarik tunai</button>':'')+(cw?'<button class="btn ghost" data-wedit="'+esc(cw.id)+'">Sesuaikan saldo</button>':'')+'</div></div>'+
   '<div class="panel"><div class="row between"><h3>Riwayat cash</h3><span class="muted" style="font-size:13px">'+histCount(list.length,all.length)+'</span></div>'+histSearchHTML(all.length)+
    groupedList(list,all.length?'<b>Nggak ada yang cocok</b>Coba kata lain, nama kategori, atau jumlah uangnya.':'<b>Belum ada catatan cash</b>Tekan Catat buat nyatet uang tunai yang masuk atau keluar.')+'</div>'+
   '<p class="muted" style="font-size:13px;margin:0">Kalau uang di dompet asli beda sama angka di sini, pakai <b>Sesuaikan saldo</b>. Ambil uang di ATM? Pakai <b>Tarik tunai</b>, biar saldo bank dan dompet sama-sama bener.</p>';
  bindHistSearch();
}

/* ---------- e-money ---------- */
export function renderEmoney(){
  const el=$("#v-emoney"),D=S.data,T=totals(D),em=D.wallets.filter(w=>!isCash(w)),ids=new Set(em.map(w=>w.id));
  const all=sortedTx(D.txs.filter(t=>ids.has(t.wallet)||ids.has(t.to))),list=histFilter(all);
  const card=w=>'<div class="wcard"><span class="badge em">'+esc((w.name||"?").trim().charAt(0).toUpperCase())+'</span><span class="nm">'+esc(w.name)+'</span><span class="bal num">'+rp(T.b[w.id])+'</span><button class="btn sm ghost" data-wedit="'+esc(w.id)+'">Ubah</button></div>';
  el.innerHTML='<div class="pghead"><div><div class="eyebrow"><span class="dot em"></span> E-money · '+em.length+' akun</div><div class="v num">'+rp(T.em)+'</div></div>'+
   '<div class="acts">'+(em.length?'<button class="btn" data-act="new" data-ctx="emoney">'+IC.plus+'Catat</button>':'')+'<button class="btn ghost" data-wnew>+ Tambah akun</button></div></div>'+
   '<div class="wgrid">'+
    '<div class="panel stack"><h3>Akun lo</h3>'+
     (em.length?'<div>'+em.map(card).join("")+'</div>':'<div class="empty"><b>Belum ada akun e-money</b>Tambahin rekening bank atau dompet digital lo dulu.</div>')+
     '<div class="hint">'+IC.lock+'<span>Rekening bank dan aplikasi dompet digital digabung di sini. Cukup nama dan saldo, tanpa nomor rekening atau nomor HP.</span></div></div>'+
    '<div class="panel"><div class="row between"><h3>Riwayat e-money</h3><span class="muted" style="font-size:13px">'+histCount(list.length,all.length)+'</span></div>'+histSearchHTML(all.length)+
     groupedList(list,all.length?'<b>Nggak ada yang cocok</b>Coba kata lain, nama kategori, atau jumlah uangnya.':em.length?'<b>Belum ada catatan</b>Tekan Catat buat nyatet transaksi e-money pertama lo.':'Riwayat muncul setelah lo nambah akun.')+'</div>'+
   '</div>';
  bindHistSearch();
}

/* ---------- rekap ---------- */
function relLabel(unit,off){
  if(unit==="day")return off===0?"Hari ini":off===-1?"Kemarin":(-off)+" hari lalu";
  if(unit==="week")return off===0?"Minggu ini":off===-1?"Minggu lalu":(-off)+" minggu lalu";
  return off===0?"Bulan ini":off===-1?"Bulan lalu":(-off)+" bulan lalu";
}
function periodLabel(unit,{s,e}){
  if(unit==="month")return BULAN[s.getMonth()]+" "+s.getFullYear();
  if(unit==="day")return HARI[s.getDay()]+", "+s.getDate()+" "+BLN[s.getMonth()]+" "+s.getFullYear();
  return s.getDate()+(s.getMonth()===e.getMonth()?"":" "+BLN[s.getMonth()])+" – "+e.getDate()+" "+BLN[e.getMonth()]+" "+e.getFullYear();
}
function chartHTML(R,P,f){
  const cols=[],today=ymd(new Date());
  if(R.unit==="week"){for(let i=0;i<7;i++){const d=new Date(P.s);d.setDate(P.s.getDate()+i);cols.push({a:ymd(d),b:ymd(d),x:HR[i],today:ymd(d)===today});}}
  else{const last=P.e.getDate();for(let st=1;st<=last;st+=7){const en=Math.min(st+6,last);const a=ymd(new Date(P.s.getFullYear(),P.s.getMonth(),st)),b=ymd(new Date(P.s.getFullYear(),P.s.getMonth(),en));cols.push({a,b,x:st+"–"+en,today:today>=a&&today<=b});}}
  cols.forEach(c=>{c.in=0;c.out=0;});
  f.items.forEach(i=>{const c=cols.find(c=>i.date>=c.a&&i.date<=c.b);if(c)c[i.type]+=i.amt;});
  const mx=Math.max(1,...cols.map(c=>Math.max(c.in,c.out))),step=niceStep(Math.max(mx,2000)/2),top=step*2;
  return'<div class="row between" style="flex-wrap:wrap"><h3>'+(R.unit==="week"?"Per hari":"Per minggu")+'</h3><div class="legend"><span><i class="dot in"></i>Masuk</span><span><i class="dot out"></i>Keluar</span></div></div>'+
   '<div class="chart" role="img" aria-label="Grafik uang masuk dan keluar"><div class="grid"><div>'+short(top)+'</div><div>'+short(step)+'</div><div>0</div></div>'+
   cols.map(c=>'<div class="col'+(c.today?" today":"")+'" title="'+esc(c.x)+': masuk '+rp(c.in)+', keluar '+rp(c.out)+'"><span class="b in" style="height:'+(c.in/top*100)+'%"></span><span class="b out" style="height:'+(c.out/top*100)+'%"></span><span class="x">'+c.x+'</span></div>').join("")+'</div>';
}
function dayListHTML(P,filter){
  const D=S.data,d=ymd(P.s);
  const ok=t=>filter==="all"||[t.wallet,t.to].filter(Boolean).some(id=>{const w=D.wallets.find(x=>x.id===id);return w&&(filter==="cash"?isCash(w):!isCash(w));});
  const list=sortedTx(D.txs.filter(t=>t.date===d&&ok(t)));
  if(!list.length)return"";
  return'<div class="row between"><h3>Transaksi</h3><span class="muted" style="font-size:13px">'+list.length+' catatan</span></div><div class="txlist">'+list.map(txRow).join("")+'</div>';
}
function catsHTML(R,f){
  const D=S.data,outCats=catList(D,"out"),showB=R.unit==="month"&&R.filter==="all";
  const rows=byCategory(f.items,"out").map(([c,v])=>({c,v})),cmx=rows.length?rows[0].v:1;
  if(showB)outCats.forEach(k=>{if(k.budget>0&&!k.hidden&&!rows.some(r=>r.c===k.id))rows.push({c:k.id,v:0});});
  if(!rows.length)return'<div class="empty">Belum ada pengeluaran di periode ini.</div>';
  return'<div class="cats">'+rows.map(({c,v})=>{
    const bud=showB?((outCats.find(k=>k.id===c)||{}).budget||0):0,nm=esc(catName(D,"out",c));
    if(!bud)return'<div class="cat"><div class="top2"><span>'+nm+'</span><b class="num">'+rp(v)+'</b></div><div class="bar"><i style="width:'+(v/cmx*100)+'%"></i></div></div>';
    const over=v>bud;
    return'<div class="cat"><div class="top2"><span>'+nm+'</span><b class="num">'+rp(v)+' <span class="muted" style="font-weight:600">/ '+short(bud)+'</span></b></div><div class="bar"><i class="'+(over?"":"ok")+'" style="width:'+Math.min(100,v/bud*100)+'%"></i></div><div class="bnote'+(over?" over":"")+'">'+(over?"Lewat "+rp(v-bud)+" dari batas":"Sisa "+rp(bud-v))+'</div></div>';
  }).join("")+'</div>';
}
function rekapHTML(){
  const R=S.rk,P=period(R.unit,R.off),f=flows(S.data,P.s,P.e,R.filter),net=f.tin-f.tout;
  const hasB=catList(S.data,"out").some(k=>k.budget>0),showB=R.unit==="month"&&R.filter==="all";
  return'<div class="panel stack"><div class="controls"><h2>Rekap</h2><div class="seg" role="group" aria-label="Periode">'+[["day","Harian"],["week","Mingguan"],["month","Bulanan"]].map(([k,l])=>'<button data-unit="'+k+'" aria-pressed="'+(R.unit===k)+'">'+l+'</button>').join("")+'</div></div>'+
   '<div class="controls"><div class="pnav"><button data-off="-1" aria-label="Sebelumnya">'+IC.left+'</button><span class="lbl"><b>'+relLabel(R.unit,R.off)+'</b><small>'+periodLabel(R.unit,P)+'</small></span><button data-off="1" aria-label="Berikutnya" '+(R.off>=0?"disabled":"")+'>'+IC.right+'</button></div>'+
    '<div class="chips" role="group" aria-label="Sumber uang">'+[["all","Semua"],["cash","Cash"],["em","E-money"]].map(([k,l])=>'<button class="chip" data-filter="'+k+'" aria-pressed="'+(R.filter===k)+'">'+(k==="cash"?'<span class="dot cash"></span>':k==="em"?'<span class="dot em"></span>':"")+l+'</button>').join("")+'</div></div>'+
   '<div class="stats3"><div class="stat in"><div class="lbl">Masuk</div><div class="val num">'+rp(f.tin)+'</div></div><div class="stat out"><div class="lbl">Keluar</div><div class="val num">'+rp(f.tout)+'</div></div><div class="stat net"><div class="lbl">Selisih</div><div class="val num">'+(net>0?"+":"")+rp(net)+'</div></div></div>'+
   (f.items.length?'':'<div class="hint">'+IC.info+'<span>Belum ada transaksi di periode ini. Saldo awal dan "Sesuaikan saldo" nggak dihitung sebagai uang masuk. Catat pemasukan dan pengeluaran lewat tombol <b>Catat</b> di halaman E-money atau Dompet.</span></div>')+
   (R.unit==="day"?dayListHTML(P,R.filter):chartHTML(R,P,f))+
   '<div class="row between" style="margin-top:6px;flex-wrap:wrap"><h3>Pengeluaran per kategori</h3><button class="btn sm ghost" data-catmgr>Atur kategori &amp; batas</button></div>'+catsHTML(R,f)+
   (hasB&&!showB?'<p class="muted" style="font-size:12.5px;margin:0">Batas pengeluaran tampil di rekap <b>Bulanan</b> dengan pilihan <b>Semua</b>.</p>':'')+
   '<p class="muted" style="font-size:12.5px;margin:0">Pindah saldo antar dompet nggak dihitung sebagai masuk atau keluar. Biaya adminnya dihitung sebagai pengeluaran.</p></div>';
}
