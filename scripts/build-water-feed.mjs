/* A bounded read-only source adapter for the public HII station feed.
   Never invent an observation, timestamp, level, station or threshold.
   Called only from a scheduled GitHub Action, not each page view. */
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const UPSTREAM='https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load';
const IDS=new Map([[471583,'HDA004'],[2607,'S.5']]);
const MAX_AGE=3*60*60*1000;
function numeric(v,low,high){
 const n=typeof v==='number'?v:typeof v==='string'&&/^[-+]?\d+(\.\d+)?$/.test(v.trim())?Number(v):NaN;
 return Number.isFinite(n)&&n>=low&&n<=high?n:null;
}
export function selectWater(raw,now=Date.now()){
 if(!raw||!raw.waterlevel_data||raw.waterlevel_data.result!=='OK'||!Array.isArray(raw.waterlevel_data.data))throw Error('HII response contract changed');
 const rows=[];
 for(const [id,oldCode] of IDS){
  const r=raw.waterlevel_data.data.find(x=>x&&x.station?.id===id);
  if(!r||r.station?.tele_station_oldcode!==oldCode)continue;
  const level=numeric(r.waterlevel_msl,-50,200),bank=numeric(r.station.min_bank,-50,200),ground=numeric(r.station.ground_level,-100,200);
  const rawTime=r.waterlevel_datetime;
  if(typeof rawTime!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(rawTime)||level===null||bank===null||ground===null||ground>=bank)continue;
  const measured=Date.parse(rawTime.replace(' ','T')+'+07:00');
  if(!Number.isFinite(measured)||measured>now+2*60000||now-measured>MAX_AGE)continue;
  rows.push({station:{id,min_bank:bank,ground_level:ground,tele_station_oldcode:oldCode},waterlevel_datetime:rawTime,waterlevel_msl:level});
 }
 if(!rows.length)throw Error('No fresh verified HDA004/S.5 rows — do not publish');
 // Preserve the exact shape consumed by v2 parsedStation; no generatedAt
 // field can accidentally replace actual waterlevel_datetime freshness.
 return {schema:1,source:'ThaiWater/HII waterlevel_load',waterlevel_data:{result:'OK',data:rows}};
}
export async function main(){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 let res;
 try{res=await fetch(UPSTREAM,{signal:controller.signal,headers:{accept:'application/json'}})}
 finally{clearTimeout(timeout)}
 if(!res.ok)throw Error('HII unavailable: HTTP '+res.status);
 const parsed=selectWater(await res.json());
 const dest=process.argv[2];
 if(!dest)throw Error('Expected explicit output path');
 await writeFile(dest,JSON.stringify(parsed,null,2)+'\n','utf8');
 console.log('Validated station records:',parsed.waterlevel_data.data.map(x=>x.station.tele_station_oldcode).join(', '));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 main().catch(e=>{console.error('Skip publishing water snapshot:',e.message);process.exitCode=1});
