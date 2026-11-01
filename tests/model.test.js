import {test} from "node:test";
import assert from "node:assert/strict";
import {balances,totals,period,flows,byCategory,txMatch,validateTx,buildTx,budgetNote,walletEdit,deleteWallet,applyChange,replaceChange,cleanCats,sanitize,parseBackup,makeBackup,catName} from "../js/model.js";
import {rp,short,digits,ymd,dayLabel} from "../js/util.js";
import {buildWorkbook,exRange} from "../js/xlsx.js";

const data=()=>({v:3,cats:null,
  wallets:[{id:"cash",name:"Cash",kind:"cash",start:100000},{id:"bca",name:"BCA",kind:"emoney",start:500000},{id:"gopay",name:"GoPay",kind:"emoney",start:0}],
  txs:[
    {id:"t1",type:"out",amount:25000,wallet:"cash",cat:"makan",date:"2026-10-05",note:"Bakso",created:1},
    {id:"t2",type:"in",amount:1000000,wallet:"bca",cat:"gaji",date:"2026-10-01",note:"",created:2},
    {id:"t3",type:"move",amount:100000,wallet:"bca",to:"gopay",fee:2500,date:"2026-10-02",note:"Top up",created:3},
    {id:"t4",type:"out",amount:40000,wallet:"gopay",cat:"transport",date:"2026-10-03",note:"Ojol",created:4},
    {id:"t5",type:"move",amount:200000,wallet:"bca",to:"cash",fee:0,date:"2026-10-04",note:"Tarik tunai",created:5}
  ]});

test("saldo tiap akun dihitung dari saldo awal dan transaksi",()=>{
  const b=balances(data());
  assert.equal(b.cash,100000-25000+200000);
  assert.equal(b.bca,500000+1000000-100000-2500-200000);
  assert.equal(b.gopay,100000-40000);
});
test("total memisahkan cash dan e-money",()=>{
  const T=totals(data());
  assert.equal(T.cash,275000);assert.equal(T.em,1197500+60000);assert.equal(T.all,T.cash+T.em);
});
test("transaksi ke akun yang udah dihapus nggak bikin error",()=>{
  const d=data();d.txs.push({id:"x",type:"out",amount:5,wallet:"hilang",cat:"lain",date:"2026-10-01"});
  assert.equal(balances(d).hilang,undefined);
});

test("rekap: pindah saldo bukan pemasukan/pengeluaran, tapi biaya admin dihitung keluar",()=>{
  const f=flows(data(),new Date(2026,9,1),new Date(2026,9,31));
  assert.equal(f.tin,1000000);
  assert.equal(f.tout,25000+2500+40000);
  assert.deepEqual(byCategory(f.items,"out")[0],["transport",40000]);
  assert.ok(f.items.some(i=>i.cat==="admin"&&i.amt===2500));
});
test("rekap bisa difilter cash atau e-money",()=>{
  const d=data(),s=new Date(2026,9,1),e=new Date(2026,9,31);
  assert.equal(flows(d,s,e,"cash").tout,25000);
  assert.equal(flows(d,s,e,"em").tout,2500+40000);
  assert.equal(flows(d,s,e,"em").tin,1000000);
});
test("rekap cuma ngitung tanggal di dalam periode",()=>{
  const f=flows(data(),new Date(2026,9,3),new Date(2026,9,4));
  assert.equal(f.tin,0);assert.equal(f.tout,40000);
});

test("periode mingguan mulai hari Senin",()=>{
  const P=period("week",0,new Date(2026,10,1)); // Minggu 1 Nov 2026
  assert.equal(ymd(P.s),"2026-10-26");assert.equal(ymd(P.e),"2026-11-01");
  assert.equal(ymd(period("week",-1,new Date(2026,10,1)).s),"2026-10-19");
});
test("periode bulanan dan harian",()=>{
  const M=period("month",-1,new Date(2026,2,31));
  assert.equal(ymd(M.s),"2026-02-01");assert.equal(ymd(M.e),"2026-02-28");
  assert.equal(ymd(period("day",-1,new Date(2026,0,1)).s),"2025-12-31");
});

test("cari catatan pakai kata atau nominal",()=>{
  const d=data(),t4=d.txs[3];
  assert.ok(txMatch(d,t4,"ojol"));
  assert.ok(txMatch(d,t4,"gopay transport"));
  assert.ok(txMatch(d,t4,"40.000"));
  assert.ok(!txMatch(d,t4,"bakso"));
  assert.ok(txMatch(d,d.txs[2],"pindah"));
});

test("validasi transaksi",()=>{
  const d=data(),ok={type:"out",amount:1000,wallet:"cash",date:"2026-10-01"};
  assert.equal(validateTx(d,ok,"2026-11-01"),null);
  assert.match(validateTx(d,{...ok,amount:0},"2026-11-01"),/jumlah/);
  assert.match(validateTx(d,{...ok,wallet:"nope"},"2026-11-01"),/dompet/);
  assert.match(validateTx(d,{...ok,date:"2026-12-01"},"2026-11-01"),/masa depan/);
  assert.match(validateTx(d,{...ok,date:""},"2026-11-01"),/tanggal/);
  assert.match(validateTx(d,{...ok,type:"move",to:"cash"},"2026-11-01"),/harus beda/);
});
test("buildTx nyimpen field yang sesuai jenisnya",()=>{
  const o=buildTx({type:"out",amount:5000,wallet:"cash",date:"2026-10-01",note:"  kopi  ",cat:"jajan",to:"bca",fee:9},123);
  assert.equal(o.note,"kopi");assert.equal(o.cat,"jajan");assert.equal(o.to,undefined);assert.equal(o.created,123);
  const m=buildTx({id:"keep",type:"move",amount:5000,wallet:"bca",to:"cash",fee:1000,date:"2026-10-01",cat:"x"},1);
  assert.equal(m.id,"keep");assert.equal(m.fee,1000);assert.equal(m.cat,undefined);
});

test("peringatan batas pengeluaran bulanan",()=>{
  const d=data();d.cats={out:[{id:"makan",name:"Makan",budget:50000}],in:[{id:"gaji",name:"Gaji"}]};
  assert.match(budgetNote(d,{id:"n",type:"out",amount:20000,cat:"makan",date:"2026-10-20"}),/90%/);
  assert.match(budgetNote(d,{id:"n",type:"out",amount:30000,cat:"makan",date:"2026-10-20"}),/lewat/);
  assert.equal(budgetNote(d,{id:"n",type:"out",amount:30000,cat:"makan",date:"2026-11-20"}),null);
  assert.equal(budgetNote(d,{id:"n",type:"in",amount:1,cat:"gaji",date:"2026-10-20"}),null);
});

test("ubah saldo: 'cuma nyocokin' geser saldo awal tanpa transaksi",()=>{
  const d=data(),r=walletEdit(d,{id:"cash",name:"Cash",want:300000,mode:"adjust"},"2026-11-01",9);
  assert.equal(r.tx,null);
  assert.equal(balances({...d,wallets:r.wallets}).cash,300000);
});
test("ubah saldo: selisih dicatat sebagai pengeluaran",()=>{
  const d=data(),r=walletEdit(d,{id:"cash",name:"Cash",want:250000,mode:"tx"},"2026-11-01",9);
  assert.equal(r.tx.type,"out");assert.equal(r.tx.amount,25000);
  assert.equal(balances({...d,wallets:r.wallets,txs:d.txs.concat(r.tx)}).cash,250000);
});
test("akun baru dengan saldo awal",()=>{
  const d=data(),r=walletEdit(d,{name:"DANA",want:70000,mode:"adjust"},"2026-11-01",9);
  const w=r.wallets.find(x=>x.name==="DANA");
  assert.equal(w.kind,"emoney");assert.equal(w.start,70000);assert.equal(r.tx,null);
});
test("hapus akun ikut hapus transaksinya",()=>{
  const d=applyChange(data(),deleteWallet(data(),"gopay"));
  assert.ok(!d.wallets.some(w=>w.id==="gopay"));
  assert.ok(!d.txs.some(t=>t.wallet==="gopay"||t.to==="gopay"));
  assert.equal(d.txs.length,3);
});

test("applyChange: tambah, ganti, dan hapus transaksi sekaligus",()=>{
  const d=data(),edited={...d.txs[0],amount:30000},baru={id:"t9",type:"in",amount:5,wallet:"cash",cat:"lain",date:"2026-10-09"};
  const r=applyChange(d,{put:[edited,baru],del:["t2"],cats:null});
  assert.equal(r.txs.length,5);
  assert.equal(r.txs.find(t=>t.id==="t1").amount,30000);
  assert.ok(!r.txs.some(t=>t.id==="t2"));
  assert.equal(d.txs.length,5,"data asli nggak berubah");
  assert.equal(d.txs[0].amount,25000);
});
test("replaceChange ngubah data lama jadi persis data baru",()=>{
  const from=data(),to={...data(),wallets:[from.wallets[0]],txs:[from.txs[0],{id:"z",type:"out",amount:1,wallet:"cash",cat:"lain",date:"2026-10-01"}]};
  const c=replaceChange(from,to),r=applyChange(from,c);
  assert.deepEqual(r.txs.map(t=>t.id).sort(),["t1","z"]);
  assert.equal(r.wallets.length,1);
  assert.deepEqual(c.del.sort(),["t2","t3","t4","t5"]);
});
test("editor kategori nolak nama dobel dan kategori terpakai yang dikosongin",()=>{
  const d=data(),base={out:[{id:"makan",name:"Makan"},{id:"lain",name:"Lainnya"}],in:[{id:"gaji",name:"Gaji"}]};
  assert.ok(cleanCats(d,base).cats);
  assert.match(cleanCats(d,{...base,out:[{id:"makan",name:"A"},{id:"x",name:"a"}]}).error,/dobel/);
  assert.match(cleanCats(d,{...base,out:[{id:"makan",name:" "},{id:"lain",name:"L"}]}).error,/dipakai/);
  assert.match(cleanCats(d,{...base,in:[{id:"gaji",name:"Gaji",hidden:true}]}).error,/Minimal/);
  assert.equal(catName(d,"out","admin"),"Biaya admin");
});

test("sanitize buang data aneh",()=>{
  const d=sanitize({wallets:[{id:"a",name:"A",kind:"emoney",start:"5"},{id:1,name:"x",kind:"cash"},{id:"b",name:"B",kind:"crypto"}],
    txs:[{id:"t",type:"out",amount:"10",wallet:"a",date:"2026-01-01",note:"<b>"},{id:"bad",type:"out",amount:-1,wallet:"a",date:"2026-01-01"},{id:"bad2",type:"steal",amount:1,date:"2026-01-01"}]});
  assert.equal(d.wallets.length,1);assert.equal(d.wallets[0].start,5);
  assert.equal(d.txs.length,1);assert.equal(d.txs[0].amount,10);assert.equal(d.txs[0].cat,"lain");
  assert.equal(sanitize(null),null);assert.equal(sanitize({wallets:"x",txs:[]}),null);
});
test("backup bisa dipulihkan, termasuk buku Pribadi dari versi lama",()=>{
  const d=data();
  assert.deepEqual(parseBackup(JSON.parse(JSON.stringify(makeBackup(d)))).txs.length,5);
  const v2={app:"duitgue",version:2,store:{books:[
    {id:"s",type:"shop",data:{wallets:[{id:"c",name:"Cash",kind:"cash",start:1}],txs:[]}},
    {id:"p",type:"personal",data:{wallets:[{id:"c",name:"Cash",kind:"cash",start:7}],txs:[]}}]}};
  assert.equal(parseBackup(v2).wallets[0].start,7);
  assert.equal(parseBackup({app:"lain",version:3,data:d}),null);
  assert.equal(parseBackup({app:"duitgue",version:3,data:{wallets:[],txs:[]}}),null);
});

test("format rupiah dan angka",()=>{
  assert.equal(rp(1250000),"Rp1.250.000");
  assert.equal(rp(-5000),"−Rp5.000");
  assert.equal(short(1500000),"1,5 jt");assert.equal(short(25000),"25 rb");
  assert.equal(digits("Rp 12.500"),12500);assert.equal(digits(""),0);
  assert.equal(dayLabel("2026-11-01",new Date(2026,10,1)),"Hari ini");
  assert.equal(dayLabel("2026-10-31",new Date(2026,10,1)),"Kemarin");
});

test("ekspor Excel ngasilin file zip yang valid",async()=>{
  const d=data(),W=buildWorkbook(d,"all",new Date(2026,10,1));
  const u=new Uint8Array(await W.blob.arrayBuffer());
  assert.equal(u[0],0x50);assert.equal(u[1],0x4b);
  assert.equal(W.n,5);assert.equal(W.name,"duitgue-semua.xlsx");
  assert.equal(exRange(d,"lmonth",new Date(2026,10,1)).label,"Oktober 2026");
});
