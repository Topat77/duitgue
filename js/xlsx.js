/* Excel export: a tiny uncompressed .xlsx writer (zip + SpreadsheetML), no library needed. */
import {ymd,pYmd,pad,BULAN} from "./util.js";
import {flows,byCategory,catName,wName,totals,isCash} from "./model.js";

const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRC_T[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
function makeZip(files){
  const enc=new TextEncoder(),parts=[],central=[];let off=0;
  const u16=v=>[v&255,(v>>>8)&255],u32=v=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
  for(const [name,text] of files){
    const nm=enc.encode(name),data=enc.encode(text),crc=crc32(data);
    const head=[0x50,0x4b,3,4,...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(nm.length),...u16(0)];
    parts.push(new Uint8Array(head),nm,data);
    central.push([0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)],nm);
    off+=head.length+nm.length+data.length;
  }
  let csize=0;const cparts=[];for(let i=0;i<central.length;i+=2){const h=new Uint8Array(central[i]);cparts.push(h,central[i+1]);csize+=h.length+central[i+1].length;}
  const end=new Uint8Array([0x50,0x4b,5,6,...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(csize),...u32(off),...u16(0)]);
  return new Blob([...parts,...cparts,end],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
const xesc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"");
function colName(i){let s="";i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;}
const xlDate=s=>{const[y,m,d]=s.split("-").map(Number);return(Date.UTC(y,m-1,d)-Date.UTC(1899,11,30))/864e5;};
/* cell: string | number | {d:"YYYY-MM-DD"} | {n:number} (rupiah) | {b:string} (bold) | null */
function sheetXML(rows,widths){
  const cell=(v,r,c)=>{const ref=colName(c)+(r+1);
    if(v==null||v==="")return"";
    if(typeof v==="object"&&v.d)return'<c r="'+ref+'" s="2"><v>'+xlDate(v.d)+'</v></c>';
    if(typeof v==="object"&&"n" in v)return'<c r="'+ref+'" s="3"><v>'+Math.round(Number(v.n)||0)+'</v></c>';
    if(typeof v==="object"&&"b" in v)return'<c r="'+ref+'" s="1" t="inlineStr"><is><t xml:space="preserve">'+xesc(v.b)+'</t></is></c>';
    if(typeof v==="number")return'<c r="'+ref+'"><v>'+v+'</v></c>';
    return'<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xesc(v)+'</t></is></c>';};
  return'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
   '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'+
   '<cols>'+widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join("")+'</cols><sheetData>'+
   rows.map((row,r)=>'<row r="'+(r+1)+'">'+row.map((v,c)=>cell(v,r,c)).join("")+'</row>').join("")+'</sheetData></worksheet>';
}
function makeXlsx(sheets){
  const files=[
   ["[Content_Types].xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((s,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("")+'</Types>'],
   ["_rels/.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
   ["xl/workbook.xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>'<sheet name="'+xesc(s.name.slice(0,31))+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join("")+'</sheets></workbook>'],
   ["xl/_rels/workbook.xml.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((s,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join("")+'<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
   ["xl/styles.xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="&quot;Rp&quot;#,##0;-&quot;Rp&quot;#,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEFF3EC"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>']
  ];
  sheets.forEach((s,i)=>files.push(["xl/worksheets/sheet"+(i+1)+".xml",sheetXML(s.rows,s.widths)]));
  return makeZip(files);
}

export const EX_OPT=[["month","Bulan ini"],["lmonth","Bulan lalu"],["year","Tahun ini"],["all","Semua"]];
export function exRange(d,k,now=new Date()){
  const td=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  if(k==="month")return{s:new Date(now.getFullYear(),now.getMonth(),1),e:td,label:BULAN[now.getMonth()]+" "+now.getFullYear(),tag:now.getFullYear()+"-"+pad(now.getMonth()+1)};
  if(k==="lmonth"){const s=new Date(now.getFullYear(),now.getMonth()-1,1);return{s,e:new Date(s.getFullYear(),s.getMonth()+1,0),label:BULAN[s.getMonth()]+" "+s.getFullYear(),tag:s.getFullYear()+"-"+pad(s.getMonth()+1)};}
  if(k==="year")return{s:new Date(now.getFullYear(),0,1),e:td,label:"Tahun "+now.getFullYear(),tag:String(now.getFullYear())};
  const ds=d.txs.map(t=>t.date).filter(Boolean).sort();
  return{s:ds.length?pYmd(ds[0]):td,e:td,label:"Semua catatan",tag:"semua"};
}
export function txsInRange(d,R){const a=ymd(R.s),b=ymd(R.e);return d.txs.filter(t=>t.date>=a&&t.date<=b);}
export function buildWorkbook(d,k,now=new Date()){
  const R=exRange(d,k,now),a=ymd(R.s),b=ymd(R.e);
  const txs=txsInRange(d,R).sort((x,y)=>x.date<y.date?-1:x.date>y.date?1:(x.created||0)-(y.created||0));
  const JN={in:"Masuk",out:"Keluar",move:"Pindah saldo"};
  const rows=[["Tanggal","Jenis","Kategori","Keterangan","Akun","Ke akun","Masuk","Keluar","Pindah saldo","Biaya admin"].map(h=>({b:h}))];
  for(const t of txs)rows.push([{d:t.date},JN[t.type],t.type==="move"?"":catName(d,t.type,t.cat),t.note||"",wName(d,t.wallet),t.type==="move"?wName(d,t.to):"",
    t.type==="in"?{n:t.amount}:null,t.type==="out"?{n:t.amount}:null,t.type==="move"?{n:t.amount}:null,t.type==="move"&&Number(t.fee)>0?{n:t.fee}:null]);
  const sheets=[{name:"Transaksi",rows,widths:[12,13,18,32,14,14,14,14,14,12]}];
  const f=flows(d,R.s,R.e,"all");
  const sum=[[{b:"Ringkasan"},""],["Periode",R.label],["Dari",{d:a}],["Sampai",{d:b}],["Jumlah catatan",txs.length],[""],
    ["Uang masuk",{n:f.tin}],["Pengeluaran",{n:f.tout}],["Selisih",{n:f.tin-f.tout}],[""]];
  const cl=byCategory(f.items,"out");
  if(cl.length){sum.push([{b:"Pengeluaran per kategori"},{b:"Jumlah"}]);cl.forEach(([c,v])=>sum.push([catName(d,"out",c),{n:v}]));sum.push([""]);}
  const il=byCategory(f.items,"in");
  if(il.length){sum.push([{b:"Pemasukan per kategori"},{b:"Jumlah"}]);il.forEach(([c,v])=>sum.push([catName(d,"in",c),{n:v}]));}
  sum.push([""],["Pindah saldo antar akun nggak dihitung masuk/keluar. Biaya adminnya dihitung pengeluaran."]);
  sheets.push({name:"Ringkasan",rows:sum,widths:[34,22]});
  const T=totals(d),sal=[[{b:"Akun"},{b:"Jenis"},{b:"Saldo sekarang"}]];
  d.wallets.forEach(w=>sal.push([w.name,isCash(w)?"Cash":"E-money",{n:T.b[w.id]}]));
  sal.push([{b:"Total"},"",{n:T.all}]);
  sheets.push({name:"Saldo akun",rows:sal,widths:[18,10,18]});
  return{blob:makeXlsx(sheets),name:"duitgue-"+R.tag+".xlsx",n:txs.length};
}
