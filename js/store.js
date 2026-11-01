/* App state and the single entry point for changing data.
   Every edit goes through apply(): it updates the screen right away and writes the same change to Firestore. */
import {emptyData,sanitize,applyChange,replaceChange} from "./model.js";
import {ymd} from "./util.js";
import * as cloud from "./cloud.js";

const LOCAL_KEY="duitgue:v3",MOVED_KEY="duitgue:v3:moved",BKEY="duitgue:lastBackup";
/* phase: boot (loading Firebase) | nocloud (Firebase couldn't load) | out (not logged in) | loading (logged in, waiting for data) | ready */
export const S={data:emptyData(),phase:"boot",user:null,view:"home",rk:{unit:"week",off:0,filter:"all"},hq:"",
  sync:{pending:false,fromCache:true},syncError:null};

let onChange=()=>{},onStatus=()=>{},sig="";
export const setRender=(fn,statusFn)=>{onChange=fn;onStatus=statusFn||fn;};
export const render=()=>onChange();

export function apply(change){
  S.data=applyChange(S.data,change);sig=JSON.stringify(S.data);onChange();
  if(S.user)cloud.write(S.user,change).catch(e=>{S.syncError=(e&&e.code)||"unknown";onChange();});
}
export const putTx=tx=>apply({put:[tx]});
export const delTx=id=>apply({del:[id]});
export function replaceData(d){S.view="home";apply(replaceChange(S.data,d));}

/* data saved on this device by the version without login, moved to the account once */
function localLeftover(){
  try{if(localStorage.getItem(MOVED_KEY))return null;const d=sanitize(JSON.parse(localStorage.getItem(LOCAL_KEY)||"null"));return d&&d.wallets.length?d:null;}catch(e){return null;}
}

export function start(){
  cloud.initCloud({
    onUser(u){
      S.user=u;S.data=emptyData();sig="";S.syncError=null;S.view="home";
      S.phase=u?"loading":"out";onChange();
    },
    onData({profile,txs,fromServer}){
      if(!profile&&fromServer){
        const old=localLeftover();
        if(old){try{localStorage.setItem(MOVED_KEY,"1");}catch(e){}S.phase="ready";replaceData(old);return;}
      }
      const d=sanitize({wallets:(profile&&profile.wallets)||[],cats:profile?profile.cats:null,txs})||emptyData();
      const next=JSON.stringify(d),wasReady=S.phase==="ready";
      S.phase="ready";
      /* skip re-rendering when nothing changed, so typing in a form isn't interrupted */
      if(next!==sig||!wasReady){S.data=d;sig=next;onChange();}
    },
    onStatus(st){S.sync=st;onStatus();},
    onError(e){S.syncError=(e&&e.code)||"unknown";if(S.phase==="loading")S.phase="ready";onChange();}
  }).catch(()=>{S.phase="nocloud";onChange();});
}
export const login=()=>cloud.login();
export async function logout(){await cloud.logout();location.reload();}

export function lastBackup(){try{return localStorage.getItem(BKEY);}catch(e){return null;}}
export function markBackup(){try{localStorage.setItem(BKEY,ymd(new Date()));}catch(e){}}
