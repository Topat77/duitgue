/* Sheet: record or edit a transaction (Keluar / Masuk / Pindah). */
import {S,putTx,delTx} from "../store.js";
import {esc,rp,short,ymd,digits,dotted} from "../util.js";
import {balances,catList,firstCat,wById,isCash,validateTx,buildTx,budgetNote} from "../model.js";
import {$,showSheet,closeSheet,closeBtn,toast,moneyInput,armConfirm} from "../ui.js";

let F=null;
const ofKind=(w,ctx)=>!ctx||(ctx==="cash"?isCash(w):!isCash(w));

/* ctx: "cash" | "emoney" limits which wallets the money can come from; preset fills fields for a new tx */
export function openTx(id,ctx,preset){
  const D=S.data,t=id?D.txs.find(x=>x.id===id):null;
  if(t){const w=wById(D,t.wallet);ctx=isCash(w)?"cash":"emoney";}
  const mine=D.wallets.filter(w=>ofKind(w,ctx));
  if(!mine.length){toast(ctx==="cash"?"Akun cash belum ada.":"Tambah akun e-money dulu.");return;}
  const other=D.wallets.find(w=>w.id!==mine[0].id);
  F=t?{...t}:{type:"out",amount:0,wallet:mine[0].id,to:other?other.id:null,fee:0,cat:firstCat(D,"out"),date:ymd(new Date()),note:""};
  if(!t&&preset)Object.assign(F,preset);
  F.ctx=ctx;F.isEdit=!!t;
  drawTx(true);
}
/* ATM withdrawal: a transfer from the first e-money account into cash */
export function openWithdraw(){
  const D=S.data,em=D.wallets.find(w=>!isCash(w)),cw=D.wallets.find(isCash);
  if(!em||!cw){toast("Butuh akun cash dan minimal satu rekening.");return;}
  openTx(null,"emoney",{type:"move",wallet:em.id,to:cw.id,note:"Tarik tunai",cat:null});
}

function walletChips(sel,attr,exclude,ctx){
  return'<div class="chips">'+S.data.wallets.filter(w=>w.id!==exclude&&ofKind(w,ctx)).map(w=>'<button class="chip" '+attr+'="'+esc(w.id)+'" aria-pressed="'+(sel===w.id)+'"><span class="dot '+(isCash(w)?"cash":"em")+'"></span>'+esc(w.name)+'</button>').join("")+'</div>';
}
function drawTx(focus){
  const D=S.data,T=F.type,bal=balances(D);
  let body='<div class="row between"><h2>'+(F.isEdit?"Ubah catatan":"Catat")+' <span class="muted" style="font-weight:600">· '+(F.ctx==="cash"?"Dompet":"E-money")+'</span></h2>'+closeBtn+'</div>'+
   '<div class="typeseg" role="group" aria-label="Jenis">'+[["out","Keluar"],["in","Masuk"],["move","Pindah"]].map(([k,l])=>'<button data-t="'+k+'" aria-pressed="'+(T===k)+'">'+l+'</button>').join("")+'</div>'+
   '<div class="field"><label for="fAmt">Jumlah</label><div class="amtwrap"><input class="amount" id="fAmt" inputmode="numeric" autocomplete="off" placeholder="0" value="'+dotted(F.amount)+'"></div>'+
   '<div class="quick">'+[10000,20000,50000,100000].map(v=>'<button data-q="'+v+'">+'+short(v).replace(" ","")+'</button>').join("")+'<button data-q="0">Reset</button></div></div>'+
   '<div class="field"><label for="fNote">'+(T==="in"?"Uangnya dari mana?":T==="out"?"Uangnya buat apa?":"Keterangan")+'</label><input class="inp" id="fNote" maxlength="80" autocomplete="off" placeholder="'+(T==="move"?"mis. top up buat bayar ojol":T==="in"?"mis. kiriman ortu, gaji part-time":"mis. bakso depan kampus")+'" value="'+esc(F.note)+'"></div>';
  if(T==="move"){
    body+='<div class="field"><label>Dari</label>'+walletChips(F.wallet,"data-from",null,F.ctx)+'<span class="muted" style="font-size:12.5px">Saldo: <span class="num">'+rp(bal[F.wallet]||0)+'</span></span></div>'+
     '<div class="field"><label>Ke</label>'+walletChips(F.to,"data-to",F.wallet)+'</div>'+
     '<div class="field"><label for="fFee">Biaya admin (kalau ada)</label><div class="money"><input class="inp" id="fFee" inputmode="numeric" placeholder="0" value="'+dotted(F.fee)+'"></div></div>';
  }else{
    body+='<div class="field"><label>'+(T==="in"?"Masuk ke":"Pakai uang dari")+'</label>'+walletChips(F.wallet,"data-w",null,F.ctx)+'</div>'+
     '<div class="field"><label>Kategori</label><div class="chips">'+catList(D,T).filter(c=>!c.hidden||c.id===F.cat).map(c=>'<button class="chip" data-cat="'+esc(c.id)+'" aria-pressed="'+(F.cat===c.id)+'">'+esc(c.name)+'</button>').join("")+'</div></div>';
  }
  body+='<div class="field"><label for="fDate">Tanggal</label><input class="inp" type="date" id="fDate" value="'+esc(F.date)+'" max="'+ymd(new Date())+'"></div>'+
   '<p class="err" id="fErr"></p>'+
   '<div class="row">'+(F.isEdit?'<button class="btn danger" data-del>Hapus</button>':'')+'<button class="btn wide" id="fSave">'+(F.isEdit?"Simpan perubahan":"Simpan")+'</button></div>';
  showSheet(body,()=>bindTx(focus));
}
function bindTx(focus){
  const D=S.data,sh=$("#sheet"),amt=$("#fAmt");
  const sync=()=>{F.amount=digits(amt.value);F.date=$("#fDate").value;F.note=$("#fNote").value;const fee=$("#fFee");if(fee)F.fee=digits(fee.value);};
  const other=id=>(D.wallets.find(w=>w.id!==id)||{}).id||null;
  moneyInput(amt);if($("#fFee"))moneyInput($("#fFee"));
  sh.onclick=e=>{const b=e.target.closest("button");if(!b)return;
    if(b.hasAttribute("data-close")){closeSheet();return;}
    if(b.hasAttribute("data-del")){if(!armConfirm(b))return;const id=F.id;closeSheet();delTx(id);toast("Catatan dihapus.");return;}
    sync();
    if(b.dataset.t&&b.dataset.t!==F.type){F.type=b.dataset.t;
      if(F.type!=="move")F.cat=firstCat(D,F.type);else{F.cat=null;if(!F.to||F.to===F.wallet)F.to=other(F.wallet);}
      drawTx(false);return;}
    if(b.dataset.q!=null){F.amount=b.dataset.q==="0"?0:F.amount+Number(b.dataset.q);amt.value=dotted(F.amount);return;}
    if(b.dataset.w){F.wallet=b.dataset.w;drawTx(false);return;}
    if(b.dataset.from){F.wallet=b.dataset.from;if(F.to===F.wallet)F.to=other(F.wallet);drawTx(false);return;}
    if(b.dataset.to){F.to=b.dataset.to;drawTx(false);return;}
    if(b.dataset.cat){F.cat=b.dataset.cat;sh.querySelectorAll("[data-cat]").forEach(x=>x.setAttribute("aria-pressed",x===b));return;}
    if(b.id==="fSave")saveTx();
  };
  if(focus&&!F.isEdit)setTimeout(()=>amt.focus(),60);
}
function saveTx(){
  const D=S.data,msg=validateTx(D,F,ymd(new Date()));
  if(msg){$("#fErr").textContent=msg;return;}
  const tx=buildTx(F,Date.now()),wasEdit=F.isEdit,bn=budgetNote(D,tx);
  closeSheet();F=null;
  putTx(tx);
  toast(bn||(wasEdit?"Perubahan disimpan.":"Tercatat!"),bn?4500:2600);
}
