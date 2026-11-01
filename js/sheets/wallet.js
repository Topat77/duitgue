/* Sheet: add an e-money account, rename it, or correct a balance. */
import {S,commit} from "../store.js";
import {esc,rp,ymd,digits,dotted} from "../util.js";
import {balances,wById,isCash,walletEdit,deleteWallet,EM_SUGGEST} from "../model.js";
import {$,showSheet,closeSheet,closeBtn,toast,moneyInput,armConfirm,IC} from "../ui.js";

export function openWallet(id){
  const D=S.data,w=id?wById(D,id):null,cur=w?balances(D)[w.id]:0;
  const used=w?D.txs.filter(t=>t.wallet===w.id||t.to===w.id).length:0;
  const html='<div class="row between"><h2>'+(w?(isCash(w)?"Sesuaikan saldo cash":"Ubah "+esc(w.name)):"Tambah akun e-money")+'</h2>'+closeBtn+'</div>'+
   (isCash(w)?"":'<div class="field"><label for="wName">Nama akun</label><input class="inp" id="wName" maxlength="24" placeholder="mis. BCA, GoPay, DANA" value="'+esc(w?w.name:"")+'"></div>'+
     (w?"":'<div class="chips">'+EM_SUGGEST.filter(n=>!D.wallets.some(x=>x.name.toLowerCase()===n.toLowerCase())).map(n=>'<button class="chip" data-sugname="'+n+'">'+n+'</button>').join("")+'</div>'))+
   '<div class="field"><label for="wBal">Saldo sekarang</label><div class="money"><input class="inp" id="wBal" inputmode="numeric" placeholder="0" value="'+dotted(Math.max(0,cur))+'"></div>'+
    (w?'<span class="muted" style="font-size:12.5px">Ganti angka ini kalau saldo di sini beda sama saldo asli.</span>':'')+'<div id="wChoice"></div></div>'+
   '<div class="hint">'+IC.lock+'<span>Nggak perlu nomor rekening atau nomor HP.</span></div>'+
   '<p class="err" id="wErr"></p>'+
   '<div class="row">'+(w&&!isCash(w)?'<button class="btn danger" data-del>Hapus</button>':'')+'<button class="btn wide" id="wSave">Simpan</button></div>';
  let mode=null;
  /* when the balance changes, ask whether it is real income/expense or just a correction */
  const drawChoice=()=>{const want=digits($("#wBal").value),diff=want-cur,box=$("#wChoice");
    if(!diff||(!w&&want<=0)){box.innerHTML="";mode=null;return;}
    const opts=!w?[["adjust","Uang yang udah ada"],["tx","Uang masuk baru"]]:diff>0?[["tx","Uang masuk baru"],["adjust","Cuma nyocokin saldo"]]:[["tx","Pengeluaran yang lupa dicatat"],["adjust","Cuma nyocokin saldo"]];
    box.innerHTML='<div class="panel stack" style="gap:8px;margin-top:8px;padding:12px"><b style="font-size:14px">'+(!w?"Saldo "+rp(want)+" ini apa?":"Saldo "+(diff>0?"nambah ":"berkurang ")+rp(Math.abs(diff))+". Ini apa?")+'</b><div class="chips">'+opts.map(([k,l])=>'<button class="chip" data-mode="'+k+'" aria-pressed="'+(mode===k)+'">'+l+'</button>').join("")+'</div>'+
      '<span class="muted" style="font-size:12.5px">'+(mode==="tx"?(diff>0||!w?"Bakal dicatat sebagai uang masuk hari ini, jadi ikut kehitung di rekap.":"Bakal dicatat sebagai pengeluaran hari ini, jadi ikut kehitung di rekap."):mode==="adjust"?"Saldo cuma disesuaikan, nggak masuk rekap pemasukan atau pengeluaran.":"Pilih salah satu biar rekap lo tetap bener.")+'</span></div>';};
  showSheet(html,()=>{
    moneyInput($("#wBal"));$("#wBal").addEventListener("input",()=>{mode=null;drawChoice();});
    $("#sheet").onclick=e=>{const b=e.target.closest("button");if(!b)return;
      if(b.hasAttribute("data-close"))return closeSheet();
      if(b.dataset.mode){mode=b.dataset.mode;drawChoice();return;}
      if(b.dataset.sugname){$("#wName").value=b.dataset.sugname;$("#wBal").focus();return;}
      if(b.hasAttribute("data-del")){
        if(!armConfirm(b,used?"Yakin? "+used+" catatan ikut terhapus":"Yakin? Tekan lagi"))return;
        closeSheet();S.data=deleteWallet(S.data,w.id);commit();toast("Akun dihapus.");return;}
      if(b.id!=="wSave")return;
      const nm=isCash(w)?"Cash":($("#wName").value||"").trim(),err=m=>{$("#wErr").textContent=m;};
      if(!nm)return err("Kasih nama akunnya dulu.");
      if(D.wallets.some(x=>x.id!==(w&&w.id)&&x.name.toLowerCase()===nm.toLowerCase()))return err("Nama ini udah dipakai akun lain.");
      const want=digits($("#wBal").value),diff=want-cur;
      if(diff&&(w||want>0)&&!mode)return err("Pilih dulu: uang masuk baru, atau cuma nyocokin saldo.");
      const r=walletEdit(D,{id:w&&w.id,name:nm,want,mode},ymd(new Date()),Date.now());
      closeSheet();S.data.wallets=r.wallets;if(r.tx)S.data.txs.push(r.tx);commit();
      toast(r.tx?(r.tx.type==="in"?"Dicatat sebagai uang masuk "+rp(r.tx.amount)+".":"Dicatat sebagai pengeluaran "+rp(r.tx.amount)+"."):(w?"Akun diperbarui.":"Akun ditambahkan."),3200);
    };
    if(!w)setTimeout(()=>$("#wName").focus(),60);
  });
}
