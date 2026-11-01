/* Sheet: rename, hide or add categories, and set monthly budgets for expense categories. */
import {S,commit} from "../store.js";
import {esc,newId,digits,dotted} from "../util.js";
import {catList,cleanCats} from "../model.js";
import {$,showSheet,closeSheet,closeBtn,toast,moneyInput,IC} from "../ui.js";

let CM=null;
export function openCatMgr(){CM={tab:"out",out:catList(S.data,"out").map(c=>({...c})),in:catList(S.data,"in").map(c=>({...c}))};drawCatMgr();}

function drawCatMgr(){
  const L=CM[CM.tab],isOut=CM.tab==="out";
  const html='<div class="row between"><h2>Kategori &amp; batas</h2>'+closeBtn+'</div>'+
   '<div class="seg" role="group" aria-label="Jenis kategori" style="align-self:flex-start"><button data-cmtab="out" aria-pressed="'+isOut+'">Keluar</button><button data-cmtab="in" aria-pressed="'+!isOut+'">Masuk</button></div>'+
   (isOut?'<p class="muted" style="margin:0;font-size:13px">Isi batas kalau mau ngebatasin pengeluaran per bulan. Kosongin kalau nggak perlu.</p>':'')+
   '<div class="stack" style="gap:10px" id="cmRows">'+L.map((c,i)=>'<div class="cmrow'+(isOut?"":" nob")+(c.hidden?" off":"")+'" data-i="'+i+'"><input class="inp" data-f="name" maxlength="24" placeholder="Nama kategori" value="'+esc(c.name)+'" aria-label="Nama kategori">'+
     (isOut?'<div class="money"><input class="inp" data-f="budget" inputmode="numeric" placeholder="Tanpa batas" value="'+dotted(c.budget||0)+'" aria-label="Batas per bulan"></div>':'')+
     '<button class="btn sm ghost" data-cmhide="'+i+'">'+(c.hidden?"Tampilkan":"Sembunyikan")+'</button></div>').join("")+'</div>'+
   '<button class="btn ghost" data-cmadd style="align-self:flex-start">+ Kategori baru</button>'+
   '<div class="hint">'+IC.lock+'<span>Kategori yang disembunyikan nggak muncul waktu nyatet, tapi catatan lamanya tetap aman.</span></div>'+
   '<p class="err" id="cmErr"></p><button class="btn wide" id="cmSave">Simpan</button>';
  showSheet(html,bindCM);
}
function cmSync(){document.querySelectorAll("#cmRows .cmrow").forEach(r=>{const c=CM[CM.tab][+r.dataset.i];c.name=r.querySelector('[data-f="name"]').value;const b=r.querySelector('[data-f="budget"]');if(b)c.budget=digits(b.value);});}
function bindCM(){
  document.querySelectorAll('#cmRows [data-f="budget"]').forEach(moneyInput);
  $("#sheet").onclick=e=>{const b=e.target.closest("button");if(!b)return;
    if(b.hasAttribute("data-close"))return closeSheet();
    cmSync();
    if(b.dataset.cmtab){CM.tab=b.dataset.cmtab;drawCatMgr();return;}
    if(b.dataset.cmhide!=null){const c=CM[CM.tab][+b.dataset.cmhide];c.hidden=!c.hidden;drawCatMgr();return;}
    if(b.hasAttribute("data-cmadd")){CM[CM.tab].push({id:"c"+newId(),name:""});drawCatMgr();const rs=document.querySelectorAll('#cmRows [data-f="name"]');rs[rs.length-1].focus();return;}
    if(b.id==="cmSave"){
      const r=cleanCats(S.data,CM);
      if(r.error){$("#cmErr").textContent=r.error;return;}
      closeSheet();CM=null;S.data.cats=r.cats;commit();toast("Kategori disimpan.");
    }
  };
}
