/* Pure helpers: formatting rupiah, dates, ids. No DOM here, so tests can import it. */
export const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const rp=n=>(n<0?"−":"")+"Rp"+Math.abs(Math.round(n)).toLocaleString("id-ID");
export const short=n=>{const a=Math.abs(n);const f=(v,u)=>(Math.round(v*10)/10).toLocaleString("id-ID")+u;
  if(a>=1e9)return f(n/1e9," M");if(a>=1e6)return f(n/1e6," jt");if(a>=1e3)return Math.round(n/1e3)+" rb";return String(Math.round(n));};
export const pad=n=>String(n).padStart(2,"0");
export const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
export const pYmd=s=>{const[a,b,c]=s.split("-").map(Number);return new Date(a,b-1,c);};
export const BULAN=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
export const BLN=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
export const HARI=["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
export const HR=["Sen","Sel","Rab","Kam","Jum","Sab","Min"];
export const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
export const digits=s=>Number(String(s).replace(/\D/g,"").slice(0,13))||0;
export const dotted=n=>n?n.toLocaleString("id-ID"):"";
export const str=(v,n)=>String(v==null?"":v).slice(0,n);
export const isYmd=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
export function fmtDate(s){const d=pYmd(s);return d.getDate()+" "+BLN[d.getMonth()]+" "+d.getFullYear();}
export function dayLabel(s,now=new Date()){
  const y=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);
  if(s===ymd(now))return"Hari ini";if(s===ymd(y))return"Kemarin";
  const d=pYmd(s);return HARI[d.getDay()]+", "+d.getDate()+" "+BLN[d.getMonth()];
}
export function niceStep(v){if(v<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(v)));const n=v/p;return(n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p;}
