'use strict';
const TIERS=['green','yellow','orange','red'];
const $=id=>document.getElementById(id);
const v=$('mainVideo'), led=$('ledVideo');
const still=$('mainStill'),ledStill=$('ledStill');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let tier='green',manuallyPaused=false;
function mark(id,src,href){
 const node=$(id);if(!node)return;
 if(src!==null)node.src=src;
 if(href!==null)node.href=href;
}
function sync(){
 const paused=manuallyPaused||reduced.matches;
 for(const [video,image] of [[v,still],[led,ledStill]]){
  video.hidden=paused;image.hidden=!paused;
  if(paused)video.pause();
  else{
   video.playbackRate=Number($('speed').value);
   video.play().catch(()=>{$('status').textContent='Browser blocked autoplay · press Play';});
  }
 }
 $('pause').textContent=paused?'Play':'Pause';
 $('status').textContent=paused?'Static / Paused':'Playing '+tier.toUpperCase();
}
function select(t){
 if(!TIERS.includes(t))return;
 tier=t;
 for(const b of document.querySelectorAll('button[data-tier]'))
  b.setAttribute('aria-pressed',String(b.dataset.tier===t));
 $('name').textContent=t.toUpperCase()+' · 10 Native / 54 Derived';
 const prefix=t+'/'+t;
 for(const [video,image] of [[v,still],[led,ledStill]]){
  video.pause();video.src=prefix+'-locked-54f.mp4';video.load();
  image.src=prefix+'-still.webp';
 }
 mark('mask',''+t+'/qa/motion-masks.webp',null);
 mark('moments',t+'/qa/six-moments.webp',null);
 mark('sourceContact','../frame-first-v1/'+t+'/contact-sheet.webp',null);
 mark('maskLink',null,t+'/qa/motion-masks.webp');
 mark('momentsLink',null,t+'/qa/six-moments.webp');
 mark('sourceLink',null,'../frame-first-v1/'+t+'/contact-sheet.webp');
 mark('webpLink',null,prefix+'-locked-54f.webp');
 mark('mp4Link',null,prefix+'-locked-54f.mp4');
 mark('manifestLink',null,t+'/manifest.json');
 sync();
}
document.querySelectorAll('button[data-tier]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.tier)));
$('pause').addEventListener('click',()=>{manuallyPaused=!manuallyPaused;sync();});
$('speed').addEventListener('change',sync);
reduced.addEventListener?.('change',sync);
v.addEventListener('error',()=>{manuallyPaused=true;sync();$('status').textContent='Static fallback (video unavailable)';});
select('green');
