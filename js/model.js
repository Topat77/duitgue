/* Money logic. Every function takes the data object explicitly and never touches the DOM or storage.
   Data shape: {v:3, wallets:[{id,name,kind:"cash"|"emoney",start}], txs:[...], cats:null|{out:[...],in:[...]}}
   Tx: {id,type:"in"|"out"|"move",amount,wallet,date:"YYYY-MM-DD",note,created, cat (in/out) | to,fee (move)} */
import {ymd,rp,newId,str,isYmd} from "./util.js";

const mk=l=>l.map(([id,name])=>({id,name}));
export const DEFAULT_CATS={
  out:mk([["makan","Makan & minum"],["transport","Transport"],["jajan","Jajan & nongkrong"],["belanja","Belanja"],["tagihan","Tagihan & pulsa"],["hiburan","Hiburan"],["kesehatan","Kesehatan"],["lain","Lainnya"]]),
  in:mk([["gaji","Gaji"],["saku","Uang saku"],["bonus","Bonus"],["hadiah","Hadiah"],["jualan","Hasil jualan"],["lain","Lainnya"]])
};
export const EM_SUGGEST=["BCA","BRI","Mandiri","BNI","SeaBank","GoPay","OVO","DANA","ShopeePay"];
export const emptyData=()=>({v:3,wallets:[],txs:[],cats:null});

export const catList=(d,t)=>(d.cats&&Array.isArray(d.cats[t])&&d.cats[t].length)?d.cats[t]:DEFAULT_CATS[t];
export const catName=(d,t,c)=>c==="admin"?"Biaya admin":(catList(d,t).find(x=>x.id===c)||{name:"Lainnya"}).name;
export const firstCat=(d,t)=>(catList(d,t).find(c=>!c.hidden)||{id:"lain"}).id;
export const wById=(d,id)=>d.wallets.find(w=>w.id===id);
export const wName=(d,id)=>(wById(d,id)||{name:"(akun terhapus)"}).name;
export const isCash=w=>!!w&&w.kind==="cash";

export function balances(d){
  const b={};d.wallets.forEach(w=>b[w.id]=Number(w.start)||0);
  for(const t of d.txs){const a=Number(t.amount)||0;
    if(t.type==="in"){if(t.wallet in b)b[t.wallet]+=a;}
    else if(t.type==="out"){if(t.wallet in b)b[t.wallet]-=a;}
    else if(t.type==="move"){if(t.wallet in b)b[t.wallet]-=a+(Number(t.fee)||0);if(t.to in b)b[t.to]+=a;}
  }
  return b;
}
export function totals(d){
  const b=balances(d);let cash=0,em=0;
  d.wallets.forEach(w=>{if(isCash(w))cash+=b[w.id];else em+=b[w.id];});
  return{b,cash,em,all:cash+em};
}

/* unit: day | week (Monday first) | month; off: 0 = current, -1 = previous */
export function period(unit,off,now=new Date()){
  if(unit==="day"){const s=new Date(now.getFullYear(),now.getMonth(),now.getDate()+off);return{s,e:new Date(s)};}
  if(unit==="week"){const s=new Date(now.getFullYear(),now.getMonth(),now.getDate());s.setDate(s.getDate()-((s.getDay()+6)%7)+off*7);const e=new Date(s);e.setDate(s.getDate()+6);return{s,e};}
  const s=new Date(now.getFullYear(),now.getMonth()+off,1);return{s,e:new Date(s.getFullYear(),s.getMonth()+1,0)};
}

/* Income/expense inside a date range. Transfers are neither; their admin fee is an expense.
   filter: all | cash | em */
export function flows(d,s,e,filter="all"){
  const a=ymd(s),b=ymd(e);
  const ok=id=>{if(filter==="all")return true;const w=wById(d,id);return!!w&&(filter==="cash"?isCash(w):!isCash(w));};
  const items=[];
  for(const t of d.txs){if(!t.date||t.date<a||t.date>b)continue;
    if((t.type==="in"||t.type==="out")&&ok(t.wallet))items.push({type:t.type,amt:Number(t.amount)||0,cat:t.cat,date:t.date});
    if(t.type==="move"&&Number(t.fee)>0&&ok(t.wallet))items.push({type:"out",amt:Number(t.fee),cat:"admin",date:t.date});
  }
  let tin=0,tout=0;items.forEach(i=>i.type==="in"?tin+=i.amt:tout+=i.amt);
  return{items,tin,tout};
}
export function byCategory(items,type){
  const m={};items.filter(i=>i.type===type).forEach(i=>m[i.cat]=(m[i.cat]||0)+i.amt);
  return Object.entries(m).sort((x,y)=>y[1]-x[1]);
}
export const sortedTx=list=>list.slice().sort((x,y)=>x.date<y.date?1:x.date>y.date?-1:(y.created||0)-(x.created||0));

/* Search: every word must match the note, wallet or category name; a number matches the amount. */
export function txMatch(d,t,q){
  if(!q)return true;
  const parts=[t.note,wName(d,t.wallet)];
  if(t.type==="move")parts.push(wName(d,t.to),"pindah");else parts.push(catName(d,t.type,t.cat));
  const hay=parts.filter(Boolean).join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(w=>{
    const n=w.replace(/[.,]/g,"");
    if(/^\d+$/.test(n)&&String(Math.round(t.amount)).includes(n))return true;
    return hay.includes(w);
  });
}

export function validateTx(d,f,today){
  if(!(f.amount>0))return"Isi dulu jumlah uangnya.";
  if(!f.wallet||!wById(d,f.wallet))return"Pilih dompetnya.";
  if(f.type==="move"){
    if(!f.to||!wById(d,f.to))return d.wallets.length<2?"Tambah akun e-money dulu biar bisa pindah saldo.":"Pilih dompet tujuan.";
    if(f.to===f.wallet)return"Dompet asal dan tujuan harus beda.";
  }
  if(!isYmd(f.date))return"Isi tanggalnya.";
  if(f.date>today)return"Tanggal nggak boleh di masa depan.";
  return null;
}
export function buildTx(f,now){
  const tx={id:f.id||newId(),type:f.type,amount:f.amount,wallet:f.wallet,date:f.date,note:(f.note||"").trim().slice(0,80),created:f.created||now};
  if(f.type==="move"){tx.to=f.to;tx.fee=f.fee||0;}else tx.cat=f.cat||"lain";
  return tx;
}

/* Monthly budget warning after saving an expense, or null. */
export function budgetNote(d,tx){
  if(tx.type!=="out")return null;
  const c=catList(d,"out").find(k=>k.id===tx.cat);if(!c||!(c.budget>0))return null;
  const m=tx.date.slice(0,7);let sum=Number(tx.amount)||0;
  for(const t of d.txs)if(t.id!==tx.id&&t.type==="out"&&t.cat===tx.cat&&(t.date||"").slice(0,7)===m)sum+=Number(t.amount)||0;
  if(sum>c.budget)return"Tercatat. "+c.name+" bulan ini udah "+rp(sum)+", lewat dari batas "+rp(c.budget)+".";
  if(sum>=c.budget*0.8)return"Tercatat. "+c.name+" udah "+Math.round(sum/c.budget*100)+"% dari batas bulan ini.";
  return null;
}

/* Add or edit a wallet. When the balance changes, mode decides what the difference is:
   "tx" records it as income/expense today, "adjust" only moves the starting balance. */
export function walletEdit(d,{id,name,want,mode},today,now){
  const w=id?wById(d,id):null,cur=w?balances(d)[w.id]:0,diff=want-cur,asTx=mode==="tx"&&diff!==0;
  const wid=w?w.id:newId();
  const wallets=w?d.wallets.map(x=>x.id===w.id?{...x,name,start:(Number(x.start)||0)+(asTx?0:diff)}:x)
                 :d.wallets.concat([{id:wid,name,kind:"emoney",start:asTx?0:want}]);
  const tx=asTx?{id:newId(),type:diff>0?"in":"out",amount:Math.abs(diff),wallet:wid,date:today,created:now,
    note:diff>0?"Tambah saldo "+name:"Pengeluaran lupa dicatat",cat:diff>0?firstCat(d,"in"):"lain"}:null;
  return{wallets,tx};
}
export function deleteWallet(d,id){
  return{...d,wallets:d.wallets.filter(w=>w.id!==id),txs:d.txs.filter(t=>t.wallet!==id&&t.to!==id)};
}

/* Validate the category editor draft. Returns {cats} or {error}. */
export function cleanCats(d,draft){
  const out={};
  for(const t of ["out","in"]){
    const used=new Set(d.txs.filter(x=>x.type===t).map(x=>x.cat)),names=new Set(),list=[];
    for(const c of draft[t]){const nm=(c.name||"").trim();
      if(!nm){if(used.has(c.id))return{error:"Kategori yang udah dipakai nggak boleh dikosongin namanya. Sembunyikan aja kalau nggak dipakai lagi."};continue;}
      if(names.has(nm.toLowerCase()))return{error:"Ada nama kategori yang dobel: "+nm+"."};
      names.add(nm.toLowerCase());
      const o={id:c.id,name:nm.slice(0,24),hidden:!!c.hidden};if(t==="out")o.budget=Math.max(0,Number(c.budget)||0);list.push(o);
    }
    if(!list.some(c=>!c.hidden))return{error:"Minimal harus ada satu kategori "+(t==="out"?"keluar":"masuk")+" yang tampil."};
    out[t]=list;
  }
  return{cats:out};
}

/* ---------- storage format & backup ---------- */
/* Keeps only known fields with sane types; returns null when the shape is wrong. */
export function sanitize(d){
  if(!d||!Array.isArray(d.wallets)||!Array.isArray(d.txs))return null;
  const wallets=d.wallets.filter(w=>w&&typeof w.id==="string"&&typeof w.name==="string"&&(w.kind==="cash"||w.kind==="emoney"))
    .map(w=>({id:w.id.slice(0,40),name:w.name.slice(0,24),kind:w.kind,start:Math.round(Number(w.start)||0)}));
  const txs=d.txs.filter(t=>t&&typeof t.id==="string"&&["in","out","move"].includes(t.type)&&Number(t.amount)>0&&isYmd(t.date))
    .map(t=>{const o={id:t.id.slice(0,60),type:t.type,amount:Math.round(Number(t.amount)),wallet:str(t.wallet,40),date:t.date,note:str(t.note,80),created:Number(t.created)||0};
      if(t.type==="move"){o.to=str(t.to,40);o.fee=Math.max(0,Math.round(Number(t.fee)||0));}else o.cat=str(t.cat||"lain",40);
      return o;});
  let cats=null;
  if(d.cats&&Array.isArray(d.cats.out)&&Array.isArray(d.cats.in)){
    const fix=(l,b)=>l.filter(c=>c&&typeof c.id==="string"&&typeof c.name==="string").map(c=>{const o={id:c.id.slice(0,40),name:c.name.slice(0,24),hidden:!!c.hidden};if(b)o.budget=Math.max(0,Number(c.budget)||0);return o;});
    cats={out:fix(d.cats.out,true),in:fix(d.cats.in,false)};
    if(!cats.out.length||!cats.in.length)cats=null;
  }
  return{v:3,wallets,txs,cats};
}
export const makeBackup=(d,now=new Date())=>({app:"duitgue",version:3,exportedAt:now.toISOString(),data:d});
/* Accepts v3 backups, plus the personal book from older (v1/v2) backups. */
export function parseBackup(raw){
  if(!raw||raw.app!=="duitgue")return null;
  let src=null;
  if(raw.version===3)src=raw.data;
  else if(raw.version===2&&raw.store&&Array.isArray(raw.store.books))
    src=(raw.store.books.find(b=>b&&b.type==="personal"&&b.data&&Array.isArray(b.data.wallets)&&b.data.wallets.length)||{}).data;
  else src=raw;
  const d=sanitize(src);
  return d&&d.wallets.length?d:null;
}
