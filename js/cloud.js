/* Firebase: Google login and Firestore sync.
   Layout per user: users/{uid} holds wallets + categories, users/{uid}/txs/{id} holds one doc per transaction.
   Firestore keeps a copy on the device, so reads and writes keep working offline and sync later. */
import {FB_CFG,FB_VER} from "./firebase-config.js";

let A=null,F=null,auth=null,db=null,unsub=[];
/* local testing against the Firebase emulators: http://localhost:PORT/?emulator */
const EMU=typeof location!=="undefined"&&location.hostname==="localhost"&&new URLSearchParams(location.search).has("emulator");

export async function initCloud({onUser,onData,onStatus,onError}){
  const base="https://www.gstatic.com/firebasejs/"+FB_VER+"/";
  const [appM,authM,fsM]=await Promise.all([import(base+"firebase-app.js"),import(base+"firebase-auth.js"),import(base+"firebase-firestore.js")]);
  A=authM;F=fsM;
  const app=appM.initializeApp(FB_CFG);
  auth=A.getAuth(app);
  db=F.initializeFirestore(app,{localCache:F.persistentLocalCache({tabManager:F.persistentMultipleTabManager()})});
  if(EMU){
    A.connectAuthEmulator(auth,"http://localhost:9099",{disableWarnings:true});
    F.connectFirestoreEmulator(db,"localhost",8080);
    window.__duitTest={login:email=>A.signInWithCredential(auth,A.GoogleAuthProvider.credential(JSON.stringify({sub:email,email,email_verified:true})))};
  }
  A.getRedirectResult(auth).catch(()=>{});
  A.onAuthStateChanged(auth,u=>{
    stopWatching();
    onUser(u?{uid:u.uid,email:u.email||"",name:u.displayName||""}:null);
    if(u)watch(u.uid,onData,onStatus,onError);
  });
}

function stopWatching(){unsub.forEach(f=>f());unsub=[];}
function watch(uid,onData,onStatus,onError){
  let prof,txs,pf=true,tf=true,pp=false,tp=false;
  const emit=()=>{if(prof===undefined||txs===undefined)return;onData({profile:prof,txs,fromServer:!pf});onStatus({pending:pp||tp,fromCache:pf||tf});};
  const opt={includeMetadataChanges:true};
  unsub.push(F.onSnapshot(F.doc(db,"users",uid),opt,s=>{prof=s.exists()?s.data():null;pf=s.metadata.fromCache;pp=s.metadata.hasPendingWrites;emit();},onError));
  unsub.push(F.onSnapshot(F.collection(db,"users",uid,"txs"),opt,s=>{txs=s.docs.map(d=>d.data());tf=s.metadata.fromCache;tp=s.metadata.hasPendingWrites;emit();},onError));
}

/* Writes one change ({wallets?, cats?, put?, del?}) in batches of at most 450 operations.
   Offline, the promise stays pending until the device is back online; the local copy updates right away. */
export async function write(user,c){
  const ops=[];
  if(c.wallets||"cats" in c){
    const p={v:3,email:user.email};if(c.wallets)p.wallets=c.wallets;if("cats" in c)p.cats=c.cats;
    ops.push(b=>b.set(F.doc(db,"users",user.uid),p,{merge:true}));
  }
  (c.put||[]).forEach(t=>ops.push(b=>b.set(F.doc(db,"users",user.uid,"txs",t.id),t)));
  (c.del||[]).forEach(id=>ops.push(b=>b.delete(F.doc(db,"users",user.uid,"txs",id))));
  for(let i=0;i<ops.length;i+=450){const b=F.writeBatch(db);ops.slice(i,i+450).forEach(f=>f(b));await b.commit();}
}

export async function login(){
  const prov=new A.GoogleAuthProvider();prov.setCustomParameters({prompt:"select_account"});
  try{await A.signInWithPopup(auth,prov);}
  catch(e){
    const c=e&&e.code;
    if(c==="auth/popup-blocked"||c==="auth/operation-not-supported-in-this-environment"){await A.signInWithRedirect(auth,prov);return;}
    throw e;
  }
}
/* Signs out and wipes this device's copy of the data, so the next person on this browser starts clean. */
export async function logout(){
  stopWatching();
  try{await A.signOut(auth);}catch(e){}
  try{await F.terminate(db);await F.clearIndexedDbPersistence(db);}catch(e){}
}
export const cloudReady=()=>!!auth;
