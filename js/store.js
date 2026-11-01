/* App state and persistence. Data lives in localStorage on this device for now;
   this is the one place that knows where data is kept, so sync can be added here later. */
import {emptyData,sanitize} from "./model.js";
import {ymd} from "./util.js";

const KEY="duitgue:v3",BKEY="duitgue:lastBackup";
export const S={data:emptyData(),view:"home",rk:{unit:"week",off:0,filter:"all"},hq:"",saveFailed:false};

let onChange=()=>{};
export const setRender=fn=>{onChange=fn;};
export const render=()=>onChange();

export function load(){
  let raw=null;try{raw=JSON.parse(localStorage.getItem(KEY)||"null");}catch(e){}
  S.data=sanitize(raw)||emptyData();
}
/* Save and re-render. Returns false when the browser refused to store (e.g. storage full). */
export function commit(){
  try{localStorage.setItem(KEY,JSON.stringify(S.data));S.saveFailed=false;}catch(e){S.saveFailed=true;}
  onChange();return!S.saveFailed;
}
export function putTx(tx){const L=S.data.txs,i=L.findIndex(t=>t.id===tx.id);if(i>=0)L[i]=tx;else L.push(tx);return commit();}
export function delTx(id){S.data.txs=S.data.txs.filter(t=>t.id!==id);return commit();}
export function replaceData(d){S.data=d;S.view="home";return commit();}

export function lastBackup(){try{return localStorage.getItem(BKEY);}catch(e){return null;}}
export function markBackup(){try{localStorage.setItem(BKEY,ymd(new Date()));}catch(e){}}

/* another tab changed the data */
if(typeof window!=="undefined")window.addEventListener("storage",e=>{if(e.key===KEY){load();onChange();}});
