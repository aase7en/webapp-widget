import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const stage=document.getElementById('stage'),status=document.getElementById('status'),flowSlider=document.getElementById('flow'),flowValue=document.getElementById('flow-value'),play=document.getElementById('play');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let flow=0.70,playing=!reduced,visible=true,prev=0,t=0,turn=0.31,tilt=0.27,targetTurn=turn,targetTilt=tilt;
play.textContent=playing?'หยุดการเคลื่อนไหว':'เริ่มการเคลื่อนไหว';play.setAttribute('aria-pressed',String(playing));
let renderer,scene,camera,waterMaterials=[],particles,particleSeeds=[],poolMaterial,doors=[],resizeObserver,observer,disposed=false;
const flat=new THREE.MeshStandardMaterial({color:0x2d455c,metalness:.66,roughness:.33}),silver=new THREE.MeshStandardMaterial({color:0x779bab,metalness:.88,roughness:.19}),dark=new THREE.MeshStandardMaterial({color:0x091c2e,metalness:.67,roughness:.27}),gold=new THREE.MeshStandardMaterial({color:0xd2b471,metalness:.92,roughness:.25}),teal=new THREE.MeshStandardMaterial({color:0x3ecfeb,metalness:.38,roughness:.2,emissive:0x046b9a,emissiveIntensity:.32});
const box=(w,h,d,mat,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);scene.add(m);return m};
function shader(vertical){
 const vertex=vertical?`uniform float uTime;uniform float uFlow;varying vec2 vUv;varying vec3 vPos;
void main(){vUv=uv;vec3 p=position;float down=(1.-uv.y);
p.z += down*down*0.72+sin(uv.x*16.+uTime*3.3+down*8.)*.045*uFlow;
p.x += sin(down*9.+uTime*2.2+uv.x*7.)*.075*down*uFlow;
vPos=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`:`uniform float uTime;uniform float uFlow;varying vec2 vUv;varying vec3 vPos;
void main(){vUv=uv;vec3 p=position;p.z+=sin(uv.x*33.+uTime*3.)*.025*uFlow+cos(uv.y*22.-uTime*4.)*.024*uFlow;vPos=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
 const fragment=`uniform float uTime;uniform float uFlow;varying vec2 vUv;varying vec3 vPos;
float f(vec2 p){return sin(p.x*51.3+uTime*5.2)*cos(p.y*28.-uTime*4.7);}
void main(){
float streak=pow(.5+.5*sin(vUv.x*71.+vUv.y*13.+uTime*5.7+f(vUv)),7.);
float ripple=.5+.5*sin(vUv.y*37.-uTime*5.3+sin(vUv.x*28.+uTime)*2.);
float edge=smoothstep(.01,.12,vUv.x)*smoothstep(.01,.12,1.-vUv.x);
vec3 c=mix(vec3(.012,.21,.41),vec3(.14,.74,.96),.35+.55*ripple);
c+=vec3(.55,.77,.75)*streak*.70;
c+=vec3(.25,.4,.4)*pow(ripple,9.);
float alpha=uFlow*(.51+.39*edge)*(.76+.24*ripple);
gl_FragColor=vec4(c,alpha);
}`;
 return new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uFlow:{value:flow}},vertexShader:vertex,fragmentShader:fragment,transparent:true,side:THREE.DoubleSide,depthWrite:false});
}
function initialize(){
try{
 const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'})||canvas.getContext('webgl',{alpha:true,antialias:true});
 if(!gl)throw Error('WebGL unavailable');
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.38;
 stage.appendChild(renderer.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color(0x071a2f);
 scene.fog=new THREE.FogExp2(0x071a2f,.038);
 camera=new THREE.PerspectiveCamera(38,1,.1,100);
 scene.add(new THREE.HemisphereLight(0xbce7ff,0x102b49,2.5));
 const key=new THREE.DirectionalLight(0xffe6b4,2.8);key.position.set(-4,9,7);scene.add(key);
 const rim=new THREE.PointLight(0x22ceff,28,19);rim.position.set(2,2,-4);scene.add(rim);
 const warm=new THREE.PointLight(0xffc96a,19,11);warm.position.set(-3,4,3);scene.add(warm);
 // Three gated concrete bays and premium steel framing.
 box(8.0,.38,1.65,silver,0,3.05,-.86);
 box(8,.26,2.1,gold,0,3.33,-.86);
 box(8,.35,1.6,flat,0,.10,-.86);
 box(8,3.0,.5,dark,0,1.55,-1.55);
 for(let i=-2;i<=2;i++)box(.28,3.4,1.32,silver,i*1.6,1.7,-.62);
 for(let i=0;i<3;i++){
  const x=(i-1)*1.6;
  box(1.23,2.72,.16,new THREE.MeshStandardMaterial({color:0x223d52,metalness:.8,roughness:.28}),x,1.65,-.92);
  const door=box(1.13,1.68,.22,new THREE.MeshStandardMaterial({color:0x1b4e69,metalness:.72,roughness:.22}),x,2.0,-.48);doors.push(door);
  for(let j=0;j<5;j++)box(1.11,.04,.25,silver,x,1.23+j*.33,-.31);
  const g=new THREE.PlaneGeometry(1.23,2.62,38,53),m=shader(true);
  waterMaterials.push(m);const falls=new THREE.Mesh(g,m);
  falls.position.set(x,1.5,-.14);falls.renderOrder=4;scene.add(falls);
  // White turbulent plume at the toe of each gate.
  const plume=new THREE.Mesh(new THREE.TorusGeometry(.68,.10,7,40),new THREE.MeshBasicMaterial({color:0x97f4ff,transparent:true,opacity:.46,depthWrite:false}));
  plume.rotation.x=Math.PI/2;plume.position.set(x,.15,.82);scene.add(plume);
 }
 for(const x of [-3.85,3.85]){box(.75,4.15,1.68,flat,x,1.75,-.72);box(.86,.24,1.9,gold,x,3.82,-.72)}
 for(let x=-3.1;x<=3.1;x+=.35){box(.055,.47,.06,metal(),x,3.57,-.15)}
 box(8.7,.09,.14,gold,0,3.78,-.12);
 box(10,.25,5,dark,0,-.35,1.35);
 poolMaterial=shader(false);waterMaterials.push(poolMaterial);
 const pool=new THREE.Mesh(new THREE.PlaneGeometry(10,6,52,54),poolMaterial);
 pool.rotation.x=-Math.PI/2;pool.position.set(0,-.18,1.6);pool.renderOrder=3;scene.add(pool);
 // Foaming splash particles, independent of source water levels.
 const N=145,a=new Float32Array(N*3),foamGeo=new THREE.BufferGeometry();
 for(let i=0;i<N;i++){const seed={x:(Math.random()-.5)*5.1,z:.72+Math.random()*1.3,y:Math.random()*.85,speed:.24+Math.random()*.5};particleSeeds.push(seed);a.set([seed.x,seed.y,seed.z],i*3)}
 foamGeo.setAttribute('position',new THREE.BufferAttribute(a,3));
 particles=new THREE.Points(foamGeo,new THREE.PointsMaterial({color:0xbaf8ff,size:.055,transparent:true,opacity:.83,depthWrite:false,sizeAttenuation:true}));particles.renderOrder=5;scene.add(particles);
 box(12,.12,.26,gold,0,-.33,4.3);
 stage.classList.add('ready');status.textContent='WebGL พร้อม · เดโมจำลอง';
 resize();
 if(typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage)}
 observer=new IntersectionObserver(x=>{visible=x.some(e=>e.isIntersecting)});observer.observe(stage);
 requestAnimationFrame(tick);
 }catch(e){status.textContent='WebGL ไม่พร้อม — ใช้ SVG สำรอง';console.error('Demo fallback:',e.message)}
}
function metal(){return new THREE.MeshStandardMaterial({color:0x708d9c,metalness:.83,roughness:.26})}
function resize(){if(!renderer||disposed)return;const r=stage.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}
function tick(ts){
 if(disposed||!renderer)return;
 requestAnimationFrame(tick);
 if(!visible||document.hidden)return;
 if(ts-prev<33)return;
 const dt=Math.min(.07,(ts-prev)/1000||.033);prev=ts;
 if(playing)t+=dt;
 turn+=(targetTurn-turn)*.075;tilt+=(targetTilt-tilt)*.08;
 const dist=10.1;camera.position.set(Math.sin(turn)*dist,3.3+Math.sin(tilt)*2.1,Math.cos(turn)*dist);camera.lookAt(0,1.2,.0);
 for(const m of waterMaterials){m.uniforms.uTime.value=t;m.uniforms.uFlow.value=flow}
 for(const d of doors)d.position.y=2+flow*.61;
 if(particles){particles.material.opacity=flow*.8;const a=particles.geometry.attributes.position;
  for(let i=0;i<particleSeeds.length;i++){const q=particleSeeds[i],cycle=(t*q.speed+q.y)%1;
   a.setXYZ(i,q.x+Math.sin(t*2+i)*.05,.08+Math.sin(cycle*Math.PI)*.4*flow,q.z+cycle*.18)}
  a.needsUpdate=true}
 renderer.render(scene,camera);
}
let drag=null;stage.addEventListener('pointerdown',e=>{if(!renderer)return;drag={x:e.clientX,y:e.clientY};stage.setPointerCapture(e.pointerId)});
stage.addEventListener('pointermove',e=>{if(!drag)return;targetTurn=Math.max(-.9,Math.min(.9,targetTurn+(e.clientX-drag.x)*.005));targetTilt=Math.max(-.35,Math.min(.55,targetTilt-(e.clientY-drag.y)*.003));drag={x:e.clientX,y:e.clientY}});
stage.addEventListener('pointerup',()=>drag=null);stage.addEventListener('pointercancel',()=>drag=null);
stage.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();targetTurn+=e.key==='ArrowLeft'?.08:-.08;}});
flowSlider.addEventListener('input',()=>{flow=+flowSlider.value/100;flowValue.textContent=flowSlider.value+'%'});
play.addEventListener('click',()=>{playing=!playing;play.textContent=playing?'หยุดการเคลื่อนไหว':'เริ่มการเคลื่อนไหว';play.setAttribute('aria-pressed',String(playing))});
document.getElementById('reset').addEventListener('click',()=>{targetTurn=.31;targetTilt=.27});
window.addEventListener('pagehide',()=>{disposed=true;observer?.disconnect();resizeObserver?.disconnect();if(scene){scene.traverse(x=>{x.geometry?.dispose();if(x.material){for(const m of [].concat(x.material))m.dispose()}})}renderer?.dispose()},{once:true});
initialize();