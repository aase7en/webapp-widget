// UTH 3D Spillway — photoreal upgrade (SIMULATED demo, no real dam telemetry).
// three@0.180.0 pinned CDN ES modules; addons from the same pinned CDN (no vendored assets).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/postprocessing/OutputPass.js';
import { mergeGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/BufferGeometryUtils.js';

const stage=document.getElementById('stage'),status=document.getElementById('status'),flowSlider=document.getElementById('flow'),flowValue=document.getElementById('flow-value'),play=document.getElementById('play');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const EMBED=new URLSearchParams(location.search).get('display')==='embed'; // additive: compact LED-strip embed mode
const isMobile=window.matchMedia('(pointer: coarse)').matches||Math.min(innerWidth,innerHeight)<520;
let playing=!reduced,visible=true,disposed=false,simT=reduced?10.0:0,prev=0;

// ---------- discharge model (SIMULATED — single source of truth for every visual scaler) ----------
// Gated ogee crest at ~constant upstream head: jet speed v = sqrt(2·g·H_eff) ≈ const,
// discharge Q ∝ opening a (orifice/weir blend at constant head). No independent intensity knobs:
// every material scaler is derived from flowState below.
const A_MAX=0.98;          // max gate opening in world units (visual scale)
const HEAD_EFF=1.7;        // effective head driving the sill jet (world units)
const GRAV=9.81;
const Q_MAX_M3S=120;       // nominal display maximum for 3 bays (จำลอง, not telemetry)
function flowState(s){
 const a=(s/100)*A_MAX;                       // gate opening
 const v=Math.sqrt(2*GRAV*HEAD_EFF);          // jet speed ≈ const (head-driven)
 const Q=Math.pow(a/A_MAX,1.08);              // normalized discharge 0..1 (≈linear, slight weight)
 const E=Math.pow(Q,1.3);                     // impact-energy feel (superlinear)
 return {s,a,v,Q,E,m3s:Math.round(Q*Q_MAX_M3S)};
}
let FS=flowState(70);
const gateOpening=s=>flowState(s).a;

// ---------- world constants (shared JS <-> GLSL ogee profile) ----------
// ogee face v in [0,0.72]: z=-0.55+2.0*u^1.7 , y=2.75-1.4*u^1.35
// ballistic jet v in (0.72,1]: z=1.45+1.6*w , y=1.35-0.89*w-0.44*w^2   (pool entry ~ (3.05,0.02))
const BAY_X=[-2.7,0,2.7],BAY_W=1.9,IMPACT_Z=3.05,POOL_Y=0,RES_Y=3.55,CREST_Y=2.75,PIER_TOP=5.0;
let gateLift=CREST_Y+FS.a+1.4,gateLiftTarget=gateLift; // smoothed leaf lift (~0.4s ease)
function sheetPoint(v){ if(v<0.72){const u=v/0.72;return[-0.55+2.0*Math.pow(u,1.7),CREST_Y-1.4*Math.pow(u,1.35)];}
 const w=(v-0.72)/0.28;return[1.45+1.6*w,1.35-0.89*w-0.44*w*w];
}

// ---------- procedural canvas textures (no image files) ----------
function canvas2d(s){const c=document.createElement('canvas');c.width=c.height=s;return[c,c.getContext('2d')]}
function makeConcreteMaps(){
 const[ca,ctx]=canvas2d(512);const[ra,rtx]=canvas2d(256);
 const img=ctx.createImageData(512,512),rim=rtx.createImageData(256,256);
 const h=(x,y)=>{const s=Math.sin(x*12.9898+y*78.233)*43758.5453;return s-Math.floor(s)};
 const vn=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  return h(xi,yi)*(1-u)*(1-v)+h(xi+1,yi)*u*(1-v)+h(xi,yi+1)*(1-u)*v+h(xi+1,yi+1)*u*v};
 const fb=(x,y)=>{let a=0.5,f=1,s=0;for(let i=0;i<5;i++){s+=a*vn(x*f,y*f);f*=2.1;a*=0.55}return s};
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const n=fb(x/34,y/34),m=fb(x/9+31,y/9+7),i=(y*512+x)*4;
  // warm-gray concrete mottling + faint sparse construction joints + vertical grime streaks + formwork tie grid
  let g=168+42*(n-0.5)+18*(m-0.5);
  const joint=Math.exp(-Math.pow((y%256)-128,2)/26)*0.05;g*=1-joint;
  const streak=Math.max(0,fb(x/2.6,y/150+13)-0.58)*1.6+Math.max(0,fb(x/7+41,y/210+29)-0.66)*1.2;
  g*=(1-Math.min(0.42,streak*0.42));
  const tieX=Math.min(x%128,127-x%128),tieY=Math.min(y%128,127-y%128);
  const tie=Math.exp(-(tieX*tieX+tieY*tieY)/22)*0.30;g*=1-tie*0.5;
  const rust=Math.max(0,fb(x/6+91,y/220+41)-0.72)*1.2;
  img.data[i]=g*(1+rust*0.5);img.data[i+1]=g*(1+rust*0.28);img.data[i+2]=g*(1-rust*0.15);img.data[i+3]=255;
 }
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const n=fb(x/22+53,y/22+17)*0.6+fb(x/6,y/6+77)*0.4,i=(y*256+x)*4,v=Math.round(255*Math.min(0.97,0.78+0.22*(n-0.5)*2));
  rim.data[i]=rim.data[i+1]=rim.data[i+2]=v;rim.data[i+3]=255;
 }
 ctx.putImageData(img,0,0);rtx.putImageData(rim,0,0);
 const map=new THREE.CanvasTexture(ca);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;
 const roughnessMap=new THREE.CanvasTexture(ra);roughnessMap.wrapS=roughnessMap.wrapT=THREE.RepeatWrapping;
 return{map,roughnessMap};
}
function makeSteelRoughness(){
 const[c,x]=canvas2d(256);const img=x.createImageData(256,256);
 for(let y=0;y<256;y++)for(let px=0;px<256;px++){
  const s=0.5+0.5*Math.sin(px*1.7+Math.sin(y*0.3)*2.2),n=Math.sin(px*12.9898+y*0.7)*0.5+0.5,i=(y*256+px)*4;
  const v=Math.round(255*Math.min(0.9,0.30+0.16*s+0.10*n));
  img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=255;
 }
 x.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

// ---------- shared GLSL ----------
const NOISE=`
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);
float a=hash21(i);float b=hash21(i+vec2(1.0,0.0));float c=hash21(i+vec2(0.0,1.0));float d=hash21(i+vec2(1.0,1.0));
return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<5;i++){v+=a*vnoise(p);p=p*2.03+vec2(17.3,9.1);a*=0.55;}return v;}`;
const PATH_GLSL=`
vec2 sheetPath(float v){
float sp=0.72;
if(v<sp){float u=v/sp;return vec2(-0.55+2.0*pow(u,1.7),2.75-1.4*pow(u,1.35));}
float w=(v-sp)/(1.0-sp);return vec2(1.45+1.6*w,1.35-0.89*w-0.44*w*w);}`;

// ---------- state containers ----------
let renderer,scene,camera,controls,composer,bloomPass,envRT,pmrem;
const waterUniforms=[],disposables=[];
let concreteMat,steelMat,gateMesh,hoistGroup;
let splashPts,mistMesh,ringsMesh,splashMat,mistMat,ringsMat;
let dprMax=Math.min(devicePixelRatio||1,2),dpr=Math.min(dprMax,1.75);
let fpsFrames=0,fpsTime=0,fpsShown=0,lastDprStep=0,lastCalls=0,lastTris=0,lastRender=0;
let lastInteraction=performance.now(),tween=null;
const UP=new THREE.Vector3(0,1,0);
const PRESETS={
 1:{pos:new THREE.Vector3(0.0,3.3,16.2),tgt:new THREE.Vector3(0,1.7,0.6)},
 2:{pos:new THREE.Vector3(10.8,4.5,11.6),tgt:new THREE.Vector3(0,1.3,0.8)},
 3:{pos:new THREE.Vector3(2.6,1.2,7.7),tgt:new THREE.Vector3(-0.2,0.8,3.1)}};

function track(o){disposables.push(o);return o}

// ---------- geometry helpers ----------
function chamferedBox(w,h,d,c){
 const s=new THREE.Shape();s.moveTo(-w/2+c,-h/2);s.lineTo(w/2-c,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+c);
 s.lineTo(w/2,h/2-c);s.quadraticCurveTo(w/2,h/2,w/2-c,h/2);s.lineTo(-w/2+c,h/2);
 s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-c);s.lineTo(-w/2,-h/2+c);s.quadraticCurveTo(-w/2,-h/2,-w/2+c,-h/2);
 const g=new THREE.ExtrudeGeometry(s,{depth:d-c*2,bevelEnabled:true,bevelThickness:c,bevelSize:c,bevelSegments:2,steps:1,curveSegments:2});
 g.translate(0,0,-(d-c*2)/2);return g;
}
function ribbonGeo(v0,v1,segs){
 const g=new THREE.PlaneGeometry(BAY_W,1,14,segs);
 const pos=g.attributes.position;
 for(let i=0;i<pos.count;i++){pos.setY(i,v0+(v1-v0)*(pos.getY(i)+0.5))}
 g.deleteAttribute('normal');g.deleteAttribute('uv');
 const uv=new Float32Array(pos.count*2);
 for(let i=0;i<pos.count;i++){uv[i*2]=pos.getX(i)/BAY_W+0.5;uv[i*2+1]=(pos.getY(i)-v0)/(v1-v0)}
 g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
 return g;
}
function prepForMerge(p){
 if(p.index)p=p.toNonIndexed();
 p.deleteAttribute('uv');const n=p.attributes.position.count;const uv=new Float32Array(n*2);
 for(let i=0;i<n;i++){uv[i*2]=p.attributes.position.getX(i)*0.5;uv[i*2+1]=p.attributes.position.getY(i)*0.5}
 p.setAttribute('uv',new THREE.BufferAttribute(uv,2));return p;
}
function translateGeo(g,x,y,z){g.translate(x,y,z);return g}

function buildConcrete(){
 const parts=[];
 // ogee face slab: extruded profile across full width
 const sh=new THREE.Shape();sh.moveTo(-0.55,-0.8);
 for(let i=0;i<=28;i++){const[zy]=sheetPoint(0.72*i/28);const yy=sheetPoint(0.72*i/28)[1];sh.lineTo(zy,yy)}
 sh.lineTo(1.45,0.6);sh.lineTo(2.0,-0.8);sh.closePath();
 const face=new THREE.ExtrudeGeometry(sh,{depth:8.7,bevelEnabled:false,steps:1,curveSegments:4});
 face.rotateY(-Math.PI/2);face.translate(4.35,0,0);parts.push(face);
 // crest deck caps + breast-wall stubs on pier/abutment lines only — bays stay OPEN so the
 // gate leaf and its lifting gap are visible from both preset angles (gates retain the reservoir)
 for(const px of[-4.05,-1.35,1.35,4.05]){
  const capW=(Math.abs(px)>3?0.7:0.9);
  parts.push(new THREE.BoxGeometry(capW,0.55,0.62).translate(px,2.95,-0.62));
  parts.push(new THREE.BoxGeometry(capW,1.6,0.28).translate(px,4.1,-0.66));
 }
 // piers (chamfered) + abutments
 for(const px of[-1.35,1.35]){const p=chamferedBox(0.8,5.75,2.5,0.07);p.rotateY(0);p.translate(px,2.125,0.15);parts.push(p);
  const nose=chamferedBox(0.8,0.5,0.55,0.09);nose.translate(px,-0.5,-1.05);parts.push(nose)}
 for(const ax of[-4.05,4.05]){const a=chamferedBox(0.7,5.95,2.4,0.07);a.translate(ax,2.2,-0.1);parts.push(a)}
 // basin training walls + end sill + toe apron
 for(const wx of[-4.7,4.7]){const w=new THREE.BoxGeometry(0.7,0.875,5.5);w.translate(wx,-0.3175,4.65);parts.push(w)}
 const sill=new THREE.BoxGeometry(9.4,0.6,0.5);sill.translate(0,-0.45,7.15);parts.push(sill);
 const apron=new THREE.BoxGeometry(8.7,0.35,0.6);apron.translate(0,-0.075,1.72);parts.push(apron);
 // pier caps / corbels under walkway
 for(const px of[-1.35,1.35,4.0,-4.0]){const c=new THREE.BoxGeometry(0.9,0.18,1.3);c.translate(px,5.02,-0.75);parts.push(c)}
 const geo=mergeGeometries(parts.map(prepForMerge));track(geo);
 const mesh=new THREE.Mesh(geo,concreteMat);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
}
function buildSteel(){
 const parts=[];
 // gate lift guides (vertical tracks flanking each bay) + slot frames
 for(const bx of BAY_X)for(const s of[-1,1]){
  parts.push(new THREE.BoxGeometry(0.1,2.75,0.16).translate(bx+s*(BAY_W/2+0.045),4.0,-0.44));
  parts.push(new THREE.BoxGeometry(0.05,2.9,0.05).translate(bx+s*(BAY_W/2+0.015),4.05,-0.35));
 }
 // overhead hoist beam (I-beam) + trolleys over each gate
 parts.push(new THREE.BoxGeometry(9.0,0.16,0.1).translate(0,5.32,-0.75));
 parts.push(new THREE.BoxGeometry(9.0,0.34,0.05).translate(0,5.23,-0.82));
 parts.push(new THREE.BoxGeometry(9.0,0.34,0.05).translate(0,5.23,-0.68));
 for(const bx of BAY_X){parts.push(new THREE.BoxGeometry(0.5,0.3,0.42).translate(bx,5.55,-0.75));
  const drum=new THREE.CylinderGeometry(0.11,0.11,0.5,12);drum.rotateZ(Math.PI/2);drum.translate(bx,5.55,-0.75);parts.push(drum)}
 // maintenance walkway deck + rails (cylinders)
 parts.push(new THREE.BoxGeometry(9.0,0.05,1.0).translate(0,5.06,-0.75));
 const railTop=new THREE.CylinderGeometry(0.028,0.028,9.0,8);railTop.rotateZ(Math.PI/2);railTop.translate(0,5.62,-1.22);parts.push(railTop);
 const railMid=new THREE.CylinderGeometry(0.02,0.02,9.0,8);railMid.rotateZ(Math.PI/2);railMid.translate(0,5.34,-1.22);parts.push(railMid);
 const railTop2=new THREE.CylinderGeometry(0.028,0.028,9.0,8);railTop2.rotateZ(Math.PI/2);railTop2.translate(0,5.62,-0.28);parts.push(railTop2);
 const geo=mergeGeometries(parts.map(prepForMerge));track(geo);
 const mesh=new THREE.Mesh(geo,steelMat);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
}
function buildBalusters(){
 const g=new THREE.CylinderGeometry(0.014,0.014,0.52,6);
 const mat=new THREE.MeshStandardMaterial({color:0x6f7a82,metalness:0.85,roughness:0.4,envMapIntensity:0.8});
 const pts=[];for(let x=-4.3;x<=4.31;x+=0.245)for(const z of[-1.22,-0.28])pts.push([x,z]);
 const inst=new THREE.InstancedMesh(track(g),mat,pts.length);const m=new THREE.Matrix4();
 pts.forEach((p,i)=>{m.makeTranslation(p[0],5.36,p[1]);inst.setMatrixAt(i,m)});
 inst.castShadow=true;scene.add(inst);return inst;
}
function buildBolts(){
 const g=new THREE.CylinderGeometry(0.021,0.021,0.045,8);
 const mat=new THREE.MeshStandardMaterial({color:0x5d676e,metalness:0.9,roughness:0.42,envMapIntensity:0.7});
 const pts=[];
 for(const bx of BAY_X)for(const s of[-1,1])for(let y=2.9;y<5.3;y+=0.31)pts.push([bx+s*(BAY_W/2+0.05),y,-0.34,Math.PI/2]);
 for(const px of[-1.35,1.35])for(let y=0.3;y<4.9;y+=0.52)for(let k=0;k<3;k++)pts.push([px+(k-1)*0.22,y,1.42,Math.PI/2]);
 for(let x=-4.2;x<=4.2;x+=0.55)pts.push([x,5.42,-0.82,0]);
 const inst=new THREE.InstancedMesh(track(g),mat,pts.length);const m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();
 pts.forEach((p,i)=>{e.set(p[3],0,0);q.setFromEuler(e);m.compose(new THREE.Vector3(p[0],p[1],p[2]),q,new THREE.Vector3(1,1,1));inst.setMatrixAt(i,m)});
 scene.add(inst);return inst;
}
function buildGates(){
 const parts=[];
 const GZ=-0.40; // gate plane just downstream of the breast-wall stubs: leaf + lifting gap fully visible
 for(const bx of BAY_X){
  parts.push(new THREE.BoxGeometry(BAY_W,1.4,0.11).translate(bx,-0.7,GZ));
  for(const yy of[-0.2,-0.7,-1.2])parts.push(new THREE.BoxGeometry(BAY_W-0.06,0.13,0.16).translate(bx,yy,GZ));
  for(const xx of[-0.7,0,0.7])parts.push(new THREE.BoxGeometry(0.12,1.3,0.15).translate(bx+xx,-0.7,GZ+0.01));
  for(const s of[-1,1])parts.push(new THREE.BoxGeometry(0.09,1.46,0.09).translate(bx+s*(BAY_W/2-0.05),-0.7,GZ+0.03));
  parts.push(new THREE.BoxGeometry(BAY_W,0.07,0.17).translate(bx,-1.37,GZ+0.02)); // bright bottom seal bar = trackable moving edge
 }
 const geo=mergeGeometries(parts.map(prepForMerge));track(geo);
 const mat=new THREE.MeshStandardMaterial({color:0x77828b,metalness:0.9,roughness:0.35,roughnessMap:track(makeSteelRoughness()),envMapIntensity:1.0});
 const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.baseY=CREST_Y+FS.a+1.4;mesh.position.y=mesh.userData.baseY;
 scene.add(mesh);return mesh;
}

// ---------- water: reservoir ----------
function buildReservoir(){
 const g=new THREE.PlaneGeometry(11.4,7.18,42,26);g.rotateX(-Math.PI/2);g.translate(0,RES_Y,-4.01);track(g);
 const mat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uFlow:{value:FS.Q}},vertexShader:`
 uniform float uTime;varying vec2 vUv;varying vec3 vPos;${NOISE}
 void main(){vUv=uv;vec3 p=position;p.y+=(fbm(vec2(p.x*0.8,p.z*0.8+uTime*0.14))-0.5)*0.035;
 vPos=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
 fragmentShader:`
 uniform float uTime;uniform float uFlow;varying vec3 vPos;${NOISE}
 void main(){
 vec3 vd=normalize(cameraPosition-vPos);
 float n1=fbm(vec2(vPos.x*1.4,vPos.z*1.4+uTime*0.22));
 float n2=fbm(vec2(vPos.x*3.1+8.0,vPos.z*3.1-uTime*0.16));
 vec3 n=normalize(vec3((n1-0.5)*0.14,1.0,(n2-0.5)*0.12));
 float fres=pow(1.0-max(dot(n,vd),0.0),3.2);
 float depth=smoothstep(-0.6,-6.8,vPos.z);
 vec3 col=mix(vec3(0.07,0.44,0.56),vec3(0.02,0.16,0.26),depth*0.85+0.1);
 col=mix(col,vec3(0.60,0.72,0.78),fres*0.6);
 vec3 L=normalize(vec3(-0.5,0.72,0.45));
 col+=vec3(1.0,0.94,0.82)*pow(max(dot(reflect(-L,n),vd),0.0),90.0)*0.5;
 // slight draw-down and darkening toward operating gates
 col*=1.0-0.18*uFlow*smoothstep(-2.0,-0.6,vPos.z);
 gl_FragColor=vec4(col,1.0);}`});
 track(mat);waterUniforms.push({u:mat.uniforms,key:'Q'});
 const mesh=new THREE.Mesh(g,mat);mesh.renderOrder=1;scene.add(mesh);return mesh;
}

// ---------- water: gate discharge sheets (one merged mesh, path-driven in vertex) ----------
// path: gate lip -> ogee face -> ballistic jet to waterline (3.05,0.02) -> submerged tail fading out
function buildSheets(){
 const parts=[];BAY_X.forEach((bx,bi)=>{
  const g=translateGeo(ribbonGeo(0.0,1.0,96).scale(1,1,1),bx,0,0);
  const n=g.attributes.position.count;const bay=new Float32Array(n).fill(bi);
  g.setAttribute('aBay',new THREE.BufferAttribute(bay,1));parts.push(g);
 });
 const geo=mergeGeometries(parts);track(geo);
 const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
  uniforms:{uTime:{value:0},uQ:{value:FS.Q},uOpen:{value:FS.a},uDbg:{value:0}},
  vertexShader:`
  uniform float uTime;uniform float uQ;uniform float uOpen;
  attribute float aBay;
  varying vec2 vUv;varying float vThick;varying float vS;varying float vBay;varying float vTaper;${NOISE}${PATH_GLSL}
  vec2 sheetPath2(float v,float open){
  float gateV=0.055;
  if(v<gateV){float k=v/gateV;
  vec2 lip=vec2(-0.36,2.75+open);
  return mix(lip,vec2(-0.50,2.75),k);}
  float w=(v-gateV)/(1.0-gateV);
  if(w<0.62){float u=w/0.62;return vec2(-0.55+2.0*pow(u,1.7),2.75-1.4*pow(u,1.35));}
  float j=(w-0.62)/0.38;
  float q=min(j/0.82,1.0);
  vec2 p=vec2(1.45+1.6*q,1.35-0.89*q-0.44*q*q);
  if(j>0.82){float s2=(j-0.82)/0.18;p=vec2(3.05+0.4*s2,0.02-0.34*s2);}
  return p;}
  void main(){
  vUv=uv;vS=uv.y;vBay=aBay;
  vec2 p=sheetPath2(uv.y,uOpen);
  float e=0.01;vec2 pa=sheetPath2(max(uv.y-e,0.0),uOpen);vec2 pb=sheetPath2(min(uv.y+e,1.0),uOpen);
  vec2 tang=normalize(pb-pa+vec2(0.0001,0.0));vec2 nrm=vec2(-tang.y,tang.x);
  float k=0.5+0.9*uQ;
  float sAdvBv=uv.y-uTime*0.30*k;
  float wob=fbm(vec2(uv.x*3.1+aBay*7.3,sAdvBv*6.0))-0.5;
  float bayMask=fbm(vec2(aBay*2.3,sAdvBv*0.8));
  // jet thickness anchored to the gate opening: t0 proportional to a at the lip (thin knife -> chunky rounded nose),
  // continuity taper downstream as the jet accelerates (v0/v(s)); turbulence rides on top
  float t0=(0.05+0.95*pow(uOpen/0.98,1.35))*(0.8+0.4*bayMask); // mass grows superlinearly with opening
  float taper=1.0-0.18*smoothstep(0.0,1.0,uv.y);
  float thick=t0*taper*(0.6+0.4*fbm(vec2(uv.x*4.0+7.7+aBay*3.1,sAdvBv*8.0)));
  vThick=thick;vTaper=taper;
  vec3 pos=vec3(position.x,p.y,p.x);
  // ski-jump detachment: rise above the chute floor as the jet accelerates (visible full prism,
  // no face self-occlusion at shallow angles); landing point stays on the pool impact line
  // ski-jump arc: parabolic bulge anchored at BOTH ends (leaf bottom + pool impact) — the jet
  // arcs above the chute floor mid-run (floor can never cut the prism) and the arc height
  // scales with discharge (higher opening -> thicker, taller mass)
  float amp=(0.12+0.26*smoothstep(0.05,0.5,uv.y))*(0.6+0.8*uQ)+t0*0.35;
  float lift=amp*4.0*uv.y*(1.0-uv.y);
  float hump=1.0-pow(2.0*uv.x-1.0,2.0); // symmetric rounded crest: level top edge, no lateral tilt
  pos.yz+=nrm*(hump*thick*0.75+wob*0.05*(0.25+uv.y)+0.03);
  pos.y+=lift;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);}`,
  fragmentShader:`
  uniform float uTime;uniform float uQ;uniform float uOpen;uniform float uDbg;
  varying vec2 vUv;varying float vThick;varying float vS;varying float vBay;varying float vTaper;${NOISE}
  void main(){
  if(uDbg>2.5){gl_FragColor=vec4(1.0,0.1,0.1,1.0);return;} // uDbg=3: opaque geometry silhouette (verification)
 if(uDbg>1.5){ // band-only isolation: aer + band on plain water (measurement mode)
  float kD=0.5+0.9*uQ;float sBD=vS-uTime*0.30*kD;
  float bandD=0.5+0.5*sin(sBD*18.0);
  float foamD=smoothstep(0.60,0.95,vS*0.5+0.3)*(0.62+0.38*bandD);
  vec3 col=mix(vec3(0.02,0.12,0.22),vec3(0.93,0.975,1.0),foamD);
  gl_FragColor=vec4(col,0.95);return;}
  if(uDbg>0.5){gl_FragColor=vec4(vec3(0.5+0.5*sin(18.0*(vS-uTime*0.3*(0.5+0.9*uQ)))),1.0);return;} // uDbg=1: stripe mode
  float s=vS;
  float seed=vBay*7.31;
  float k=0.5+0.9*uQ;
  // fold-free downward advection: readable translation speed (~0.2-0.4 jet-lengths/s), base outruns the lip
  float sAdvA=s-uTime*0.16*k;
  float sAdvB=s-uTime*0.30*k;
  float sAdv=mix(sAdvA,sAdvB,smoothstep(0.1,0.9,s));
  // ALL pattern layers ride the same material coordinate (rigid translation = coherent falling);
  // anisotropic x/y scales give streaky variety without breaking self-correlation
  vec2 q=vec2(vUv.x*2.2+seed,sAdvB*1.6);
  float warp=fbm(vec2(vUv.x*1.2+seed,sAdvB*0.9-uTime*0.06));
  float n=fbm(q+vec2(warp*1.4,0.0));
  float streak=fbm(vec2(vUv.x*13.0+warp*2.2+seed*3.1,sAdvB*2.2));
  float aer=smoothstep(0.15,0.94,s)*0.65;
  // coherent downward-travelling undulation (material frame): applied BEFORE col mix so bands show as blue/white
  float band=0.5+0.5*sin(sAdvB*18.0+seed*2.0);
  float foamVal=n*0.75+streak*0.45+aer*0.25;
  float foam=smoothstep(0.60,0.95,foamVal)*(0.55+0.45*streak);
  foam*=0.72+0.28*band;
  vec3 water=mix(vec3(0.04,0.24,0.42),vec3(0.13,0.56,0.72),n*0.85+0.1);
  vec3 white=vec3(0.93,0.975,1.0);
  vec3 col=mix(water,white,foam);
  col=mix(col,white,smoothstep(0.30,0.03,vThick/max(vTaper,0.2))*0.30*(0.3+0.7*aer));
  float eN=fbm(vec2(vUv.x*4.5+seed,sAdv*2.5));
  float core=smoothstep(0.006,0.024+0.05*uQ+0.02*eN,vUv.x)*smoothstep(0.006,0.024+0.05*uQ+0.02*eN,1.0-vUv.x);
 float pierFoam=smoothstep(0.09,0.0,min(vUv.x,1.0-vUv.x))*smoothstep(0.25,0.55,s)*0.22;
  float fringe=smoothstep(0.62,0.85,streak)*(1.0-core)*smoothstep(0.15,0.55,s);
  col=mix(col,white,fringe*0.7);
 col=mix(col,white,pierFoam);
  float spec=pow(max(streak-0.42,0.0)*1.75,3.0);
  col+=vec3(1.0,0.98,0.92)*spec*0.42;
  float holes=fbm(vec2(vUv.x*7.0+seed*1.7,sAdvB*3.0));
  float alpha=(0.74+0.26*core)*(0.88+0.32*foam); // near-opaque mass: reads over sunlit concrete too
  alpha*=0.85+0.15*band;
  alpha*=1.0-(1.0-core)*smoothstep(0.30,0.58,holes)*0.9;
  alpha*=(0.75+0.5*fbm(vec2(seed*0.7,sAdvB*1.2)));
  alpha*=smoothstep(0.0,0.02,s);
  alpha*=smoothstep(1.0,0.935,s);            // fade out through the submerged tail (no mid-air end)
  alpha*=smoothstep(0.02,0.10,uQ);
  gl_FragColor=vec4(col,alpha*uQ);}`});
 track(mat);waterUniforms.push({u:mat.uniforms,key:'sheets'});
 const mesh=new THREE.Mesh(geo,mat);mesh.renderOrder=6;scene.add(mesh);return mesh;
}

// ---------- water: plunge pool (displaced surface + foam layers) ----------
function buildPool(){
 const g=new THREE.PlaneGeometry(9.0,5.35,72,44);g.rotateX(-Math.PI/2);g.translate(0,POOL_Y,4.65);track(g);
 const mat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uFlow:{value:FS.E}},vertexShader:`
 uniform float uTime;uniform float uFlow;
 varying vec3 vPos;${NOISE}
 void main(){
 vec3 p=position;
 float dz=p.z-${IMPACT_Z.toFixed(3)};
 float d=length(vec2(p.x*0.9,dz));
 float ripple=sin(d*9.0-uTime*(3.0+2.5*uFlow))*0.5+0.5;
 float ring=ripple*exp(-abs(d)*0.55);
 float chop=fbm(vec2(p.x*1.6,p.z*1.6-uTime*(0.8+1.5*uFlow)))-0.5;
 float env=exp(-abs(dz)*0.6);
 float amp=0.015+0.075*uFlow;
 p.y+=(ring*0.8+chop)*amp*(0.35+0.65*env);
 vPos=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
 fragmentShader:`
 uniform float uTime;uniform float uFlow;varying vec3 vPos;${NOISE}
 void main(){
 vec3 vd=normalize(cameraPosition-vPos);
 float di=abs(vPos.z-${IMPACT_Z.toFixed(3)});
 float nz1=fbm(vec2(vPos.x*2.2,vPos.z*2.2-uTime*0.55));
 float nz2=fbm(vec2(vPos.x*4.4+9.0,vPos.z*4.4+uTime*0.4));
 float nAmp=0.4*(1.0+1.2*exp(-di*1.2));   // stronger ripple normals near the impact line
 vec3 n=normalize(vec3((nz1-0.5)*nAmp,1.0,(nz2-0.5)*nAmp));
 float fres=pow(1.0-max(dot(n,vd),0.0),3.0);
 float depth=smoothstep(7.3,2.2,vPos.z);
 vec3 col=mix(vec3(0.06,0.40,0.55),vec3(0.02,0.15,0.25),depth*0.75+0.15);
 col=mix(col,vec3(0.62,0.74,0.80),fres*0.32);
 vec3 L=normalize(vec3(-0.5,0.72,0.45));
 col+=vec3(1.0,0.95,0.85)*pow(max(dot(reflect(-L,n),vd),0.0),60.0)*0.5;
 float xEnv=smoothstep(3.7,2.5,abs(vPos.x));
 float foamN=fbm(vec2(vPos.x*3.2+vPos.z*0.8,vPos.z*3.2-uTime*(1.0+1.6*uFlow)));
 float impactFoam=smoothstep(0.60,0.90,foamN)*exp(-di*2.2)*xEnv*(0.5*uFlow);
 float driftN=fbm(vec2(vPos.x*1.5,vPos.z*1.1-uTime*0.35));
 float drift=smoothstep(0.55,0.85,driftN)*smoothstep(7.0,3.2,vPos.z)*xEnv*uFlow*0.45;
 // noise-warped foam ring decals around each bay's impact line
 float rings=0.0;
 for(int b=0;b<3;b++){
  float bx=-2.7+2.7*float(b);
  float rd=length(vec2((vPos.x-bx)*0.85,vPos.z-${IMPACT_Z.toFixed(3)}));
  float rr=fract(uTime*(0.5+0.4*uFlow)+float(b)*0.37);
  float rad=mix(0.15,1.25,rr);
  rings+=smoothstep(0.16,0.0,abs(rd-rad))*(1.0-rr);
 }
 rings*=xEnv*uFlow*smoothstep(0.02,0.1,uFlow);
 float foamAll=clamp(impactFoam+drift+rings*0.7,0.0,1.0);
 col=mix(col,vec3(0.95,0.99,1.0),foamAll);
 gl_FragColor=vec4(col,1.0);}`});
 track(mat);waterUniforms.push({u:mat.uniforms,key:'E'});
 const mesh=new THREE.Mesh(g,mat);mesh.renderOrder=2;scene.add(mesh);return mesh;
}

// ---------- whitewater: impact band / splash / mist / rings ----------
function buildImpactBand(){
 const g=new THREE.PlaneGeometry(6.8,1.5,1,24);g.rotateX(-Math.PI/2);g.translate(0,0.03,3.3);track(g);
 const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{uTime:{value:0},uFlow:{value:FS.E}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform float uTime;uniform float uFlow;varying vec2 vUv;${NOISE}
 void main(){
 float churn=fbm(vec2(vUv.x*7.0,vUv.y*4.0-uTime*(1.1+1.6*uFlow)))*0.65
 +fbm(vec2(vUv.x*15.0+3.0,vUv.y*9.0-uTime*(2.0+2.4*uFlow)))*0.35;
 float band=exp(-pow((vUv.y-0.35)*3.6,2.0));
 float a=band*smoothstep(0.38,0.8,churn)*(0.25+0.55*uFlow)*smoothstep(0.02,0.1,uFlow);
 vec3 col=vec3(0.95,0.985,1.0)*(0.4+0.45*churn);
 gl_FragColor=vec4(col,a*0.5);}`});
 track(mat);waterUniforms.push({u:mat.uniforms,key:'E'});
 const mesh=new THREE.Mesh(g,mat);mesh.renderOrder=7;scene.add(mesh);return mesh;
}
function buildSplash(){
 const N=Math.round((isMobile?1000:2600)*(EMBED?0.5:1)),a=new Float32Array(N*3),rnd=new Float32Array(N*4),ids=new Float32Array(N);
 for(let i=0;i<N;i++){
  const bx=BAY_X[i%3]+(Math.random()-0.5)*1.7;
  a.set([bx,0.04,IMPACT_Z-0.18+Math.random()*0.4],i*3);
  rnd.set([Math.random(),Math.random(),Math.random(),Math.random()],i*4);ids[i]=i;
 }
 const g=new THREE.BufferGeometry();track(g);
 g.setAttribute('position',new THREE.BufferAttribute(a,3));
 g.setAttribute('aRnd',new THREE.BufferAttribute(rnd,4));
 g.setAttribute('aId',new THREE.BufferAttribute(ids,1));
 splashMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{uTime:{value:0},uFlow:{value:FS.E},uCount:{value:N},uPix:{value:dpr}},
  vertexShader:`
 uniform float uTime;uniform float uFlow;uniform float uCount;uniform float uPix;
 attribute vec4 aRnd;attribute float aId;varying float vA;
 void main(){
 float on=step(0.5,aId)*step(aId,uCount*uFlow);
 float life=mix(0.3,0.8,aRnd.x);
 float cyc=fract(uTime*(0.8+0.7*aRnd.y)/life+aRnd.x*7.13);
 vec3 vel=vec3((aRnd.z-0.5)*1.5,0.9+1.8*aRnd.w,0.25+1.2*aRnd.y)*(0.35+0.85*uFlow);
 vec3 p=position+vel*cyc*life+vec3(0.0,-6.2*cyc*cyc*life*life,0.0);
 vec4 mv=modelViewMatrix*vec4(p,1.0);
 vA=(1.0-cyc)*smoothstep(0.0,0.10,cyc)*on;
 gl_PointSize=(aRnd.z*3.0+1.2)*(1.0+cyc*0.5)*(22.0/max(1.0,-mv.z))*uPix;
 gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying float vA;
 void main(){
 vec2 c=gl_PointCoord-0.5;float d=length(c)*2.0;
 float a=vA*smoothstep(1.0,0.2,d);
 gl_FragColor=vec4(0.93,0.97,1.0,a*0.65);}`});
 track(splashMat);waterUniforms.push({u:splashMat.uniforms,key:'E'});
 splashPts=new THREE.Points(g,splashMat);splashPts.renderOrder=8;splashPts.frustumCulled=false;scene.add(splashPts);
}
function buildMist(){
 const N=isMobile?8:14,pos=new Float32Array(N*4*3),seed=new Float32Array(N*4*4),uv=new Float32Array(N*4*2),idx=[];
 for(let i=0;i<N;i++){
  const x0=(Math.random()-0.5)*5.6,z0=IMPACT_Z-0.25+Math.random()*1.1,ph=Math.random(),sz=0.5+Math.random()*0.55;
  const corners=[[-0.5,-0.5],[0.5,-0.5],[0.5,0.5],[-0.5,0.5]];
  corners.forEach((c,k)=>{const v=i*4+k;pos.set([c[0],c[1],0],v*3);seed.set([x0,z0,ph,sz],v*4);uv.set([(c[0]+0.5),(c[1]+0.5)],v*2)});
  idx.push(i*4,i*4+1,i*4+2,i*4,i*4+2,i*4+3);
 }
 const g=new THREE.BufferGeometry();track(g);
 g.setAttribute('position',new THREE.BufferAttribute(pos,3));
 g.setAttribute('aSeed',new THREE.BufferAttribute(seed,4));
 g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
 g.setIndex(idx);
 mistMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{uTime:{value:0},uFlow:{value:FS.E}},
  vertexShader:`
 uniform float uTime;uniform float uFlow;attribute vec4 aSeed;varying vec2 vUv;varying float vA;
 void main(){
 vUv=uv;
 float life=fract(uTime*0.05+aSeed.z);
 vec3 center=vec3(aSeed.x,0.12+life*(0.8+uFlow*0.6),aSeed.y);
 vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);
 vec3 up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
 vec3 world=center+(right*position.x+up*position.y)*aSeed.w;
 vA=sin(life*3.14159)*0.02*(0.4+0.6*uFlow)*smoothstep(0.02,0.12,uFlow);
 gl_Position=projectionMatrix*viewMatrix*vec4(world,1.0);}`,
  fragmentShader:`uniform float uTime;varying vec2 vUv;varying float vA;${NOISE}
 void main(){
 float d=length(vUv-0.5)*2.0;
 float soft=smoothstep(1.25,0.35,d);
 float n=fbm(vUv*3.0+uTime*0.05)*0.5+0.5;
 gl_FragColor=vec4(0.85,0.92,0.97,vA*soft*smoothstep(0.30,0.75,n));}`});
 track(mistMat);waterUniforms.push({u:mistMat.uniforms,key:'E'});
 mistMesh=new THREE.Mesh(g,mistMat);mistMesh.renderOrder=9;mistMesh.frustumCulled=false;scene.add(mistMesh);
}
function buildRings(){
 const N=14,pos=[],uv=[],seed=[],idx=[];
 for(let i=0;i<N;i++){
  const cx=(Math.random()-0.5)*6.2,cz=IMPACT_Z-0.25+Math.random()*0.7,ph=Math.random(),rt=0.5+Math.random()*0.5;
  const corners=[[-0.5,-0.5],[0.5,-0.5],[0.5,0.5],[-0.5,0.5]],S=3.6;
  corners.forEach((c,k)=>{const v=i*4+k;pos.push(cx+c[0]*S,0.045,cz+c[1]*S);uv.push(c[0]+0.5,c[1]+0.5);seed.push(ph,rt,0,0)});
  idx.push(i*4,i*4+1,i*4+2,i*4,i*4+2,i*4+3);
 }
 const g=new THREE.BufferGeometry();track(g);
 g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(pos),3));
 g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(uv),2));
 g.setAttribute('aSeed',new THREE.BufferAttribute(new Float32Array(seed),2));
 g.setIndex(idx);
 ringsMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{uTime:{value:0},uFlow:{value:FS.Q}},
  vertexShader:`attribute vec2 aSeed;varying vec2 vUv;varying vec2 vSeed;
 void main(){vUv=uv;vSeed=aSeed;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform float uTime;uniform float uFlow;varying vec2 vUv;varying vec2 vSeed;
 void main(){
 float ph=fract(uTime*(0.30+0.25*vSeed.y)+vSeed.x);
 float d=distance(vUv,vec2(0.5))*3.6;
 float r=mix(0.12,1.55,ph);
 float ring=smoothstep(0.11,0.0,abs(d-r))*(1.0-ph)*smoothstep(0.02,0.1,uFlow);
 gl_FragColor=vec4(0.9,0.96,1.0,ring*uFlow*0.4);}`});
 track(ringsMat);waterUniforms.push({u:ringsMat.uniforms,key:'Q'});
 ringsMesh=new THREE.Mesh(g,ringsMat);ringsMesh.renderOrder=8;ringsMesh.frustumCulled=false;scene.add(ringsMesh);
}

// ---------- wet darkened bands near waterline ----------
function buildWet(){
 const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
  uniforms:{uTime:{value:0},uFlow:{value:FS.Q}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
   fragmentShader:`uniform float uTime;varying vec2 vUv;${NOISE}
 void main(){
 float g=fbm(vec2(vUv.x*6.0,vUv.y*8.0+uTime*0.35));
 float gloss=smoothstep(0.7,0.9,fbm(vec2(vUv.x*9.0,vUv.y*14.0-uTime*0.5)));
 float fade=smoothstep(0.0,0.65,vUv.y);
 vec3 col=vec3(0.05,0.09,0.11)+vec3(0.9,0.95,1.0)*gloss*0.05;
 gl_FragColor=vec4(col,(0.45+0.2*g)*fade);}`});
 track(mat);waterUniforms.push({u:mat.uniforms,key:'Q'});
 const parts=[];
 for(const bx of BAY_X)parts.push(translateGeo(ribbonGeo(0.42,0.76,20),bx,0,0));
 const toe=new THREE.PlaneGeometry(8.7,0.5,12,4);toe.deleteAttribute('normal');toe.translate(0,0.28,1.62);parts.push(toe);
 const geo=mergeGeometries(parts);track(geo);
 const mesh=new THREE.Mesh(geo,mat);mesh.renderOrder=5;scene.add(mesh);return mesh;
}

// ---------- sky / environment / terrain ----------
function buildTerrain(){
 const parts=[];
 const up=new THREE.BoxGeometry(90,4.1,38);up.translate(0,1.55,-26.5);parts.push(up);
 for(const s of[-1,1]){const bank=new THREE.BoxGeometry(40,4.1,7.0);bank.translate(s*24.35,1.55,-4.05);parts.push(bank)}
 const down=new THREE.BoxGeometry(90,4.0,45.6);down.translate(0,-2.05,22.25);parts.push(down);
 const geo=mergeGeometries(parts.map(prepForMerge));track(geo);
 const mat=new THREE.MeshStandardMaterial({color:0x5a6055,roughness:1.0,metalness:0.0});track(mat);
 const mesh=new THREE.Mesh(geo,mat);mesh.receiveShadow=false;scene.add(mesh);return mesh;
}
let envScene=null;
function skyMesh(){
 const g=new THREE.SphereGeometry(58,28,16);
 const mat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
  uniforms:{},
  vertexShader:`varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`varying vec3 vDir;
 void main(){
 float h=clamp(vDir.y*0.5+0.5,0.0,1.0);
 vec3 col=mix(vec3(0.82,0.88,0.90),vec3(0.40,0.62,0.78),pow(h,0.8));
 col=mix(vec3(0.75,0.80,0.82),col,smoothstep(0.35,0.52,h));
 vec3 sun=normalize(vec3(-0.5,0.72,0.45));
 float s=pow(max(dot(vDir,sun),0.0),260.0);
 col+=vec3(1.0,0.88,0.70)*s*1.1;
 float halo=pow(max(dot(vDir,sun),0.0),9.0)*0.16;
 col+=vec3(1.0,0.92,0.78)*halo;
 gl_FragColor=vec4(col,1.0);}`});
 return new THREE.Mesh(g,mat);
}
function buildSky(){
 const g=skyMesh();track(g.geometry);track(g.material);
 g.renderOrder=0;scene.add(g);return g;
}
function buildEnvironment(){
 try{
  envScene=new THREE.Scene();
  const envSky=skyMesh();envSky.geometry.scale(0.5,0.5,0.5);envScene.add(envSky);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshBasicMaterial({color:0x565b52}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-4;envScene.add(ground);
  const block=new THREE.Mesh(new THREE.BoxGeometry(8,3,3),new THREE.MeshBasicMaterial({color:0x7e8489}));
  block.position.set(-6,0,2);envScene.add(block);
  pmrem=new THREE.PMREMGenerator(renderer);
  envRT=pmrem.fromScene(envScene,0.05);
  scene.environment=envRT.texture;scene.environmentIntensity=0.55;
 }catch(e){console.info('Demo env fallback (procedural lighting only):',e.message)}
}

// ---------- initialization ----------
function setStatusReady(){stage.classList.add('ready');status.textContent='WebGL พร้อม · เดโมจำลอง'}
function initialize(){
 try{
  const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{antialias:true})||canvas.getContext('webgl',{antialias:true});
  if(!gl)throw Error('WebGL unavailable');
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.12;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.info.autoReset=false;
  stage.appendChild(renderer.domElement);
  scene=new THREE.Scene();
  scene.fog=new THREE.Fog(0xbfd2dc,24,75);
  camera=new THREE.PerspectiveCamera(40,1,0.1,140);
  camera.position.copy(PRESETS[1].pos);
  const{map,roughnessMap}=makeConcreteMaps();track(map);track(roughnessMap);
  concreteMat=new THREE.MeshStandardMaterial({color:0xc9c5bc,map,roughnessMap,roughness:1.0,metalness:0.0,envMapIntensity:0.55});track(concreteMat);
  steelMat=new THREE.MeshStandardMaterial({color:0x828d96,metalness:0.88,roughness:0.34,roughnessMap:track(makeSteelRoughness()),envMapIntensity:0.9});track(steelMat);
  buildSky();buildTerrain();buildEnvironment();
  buildConcrete();buildSteel();gateMesh=buildGates();buildBalusters();buildBolts();
  buildReservoir();const sheetsMesh=buildSheets();buildPool();buildWet();
  window.__fxSheets=sheetsMesh;
  buildImpactBand();buildSplash();buildMist();buildRings();
  // lighting: warm sun + subtle hemisphere, PCFSoft shadows
  const sun=new THREE.DirectionalLight(0xffe3c0,2.6);
  sun.position.set(-7,10,6);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-9,right:9,top:8,bottom:-5,near:2,far:32});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.02;
  scene.add(sun);scene.add(sun.target);sun.target.position.set(0,1,1);
  scene.add(new THREE.HemisphereLight(0xcfe4f2,0x4c5548,0.85));
  controls=new OrbitControls(camera,renderer.domElement);
  controls.target.copy(PRESETS[1].tgt);
  controls.enableDamping=true;controls.dampingFactor=0.08;
   controls.enablePan=false;controls.minDistance=4;controls.maxDistance=26;
   // downstream viewing sector: all presets sit within ±43° azimuth; clamping to ±65° keeps orbit
   // useful while making it impossible to swing behind the dam into the upstream bank walls
   controls.minAzimuthAngle=-1.13;controls.maxAzimuthAngle=1.13;
   controls.minPolarAngle=0.15;controls.maxPolarAngle=1.53; // presets phi 1.46-1.51 land exact, camera stays above water
  controls.update();
  if(EMBED){
    document.body.classList.add('embed');
    const st=document.createElement('style');
    st.textContent='body.embed main>aside,body.embed main>header,body.embed footer,body.embed .hud{display:none!important}body.embed{padding:0!important;background:#000!important}body.embed .shell{max-width:none!important;margin:0!important}body.embed main{max-width:none!important;margin:0!important}body.embed .stage{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;max-height:none!important;aspect-ratio:auto!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#02080f!important}';
    document.head.appendChild(st);
    camera.position.set(0,2.55,10.6);controls.target.set(0,1.55,0.6);controls.update();
  }
  if(reduced){
   // reduced motion: time stays frozen, but user-driven orbit must still repaint
   controls.addEventListener('change',()=>{lastInteraction=performance.now();renderOnce()});
  }
  if(!reduced){
   composer=new EffectComposer(renderer);
   composer.addPass(new RenderPass(scene,camera));
   if(!isMobile){bloomPass=new UnrealBloomPass(new THREE.Vector2(2,2),0.22,0.45,0.85);composer.addPass(bloomPass)}
   composer.addPass(new OutputPass());
   composer.setPixelRatio(dpr);
  }
  resize();
  if(typeof ResizeObserver!=='undefined'){resizeObserverRef=new ResizeObserver(resize);resizeObserverRef.observe(stage)}
  new IntersectionObserver(x=>{visible=x.some(e=>e.isIntersecting)}).observe(stage);
  wireControls();
  const qr=document.getElementById('q-readout');qr&&(qr.textContent=`Q ~ ${FS.m3s} m³/s (จำลอง) · Q_max ${Q_MAX_M3S} m³/s`);
  setStatusReady();
  window.__spillway=()=>renderer&&{frame:renderer.info.render.frame,calls:lastCalls,tris:lastTris,fps:fpsShown,dpr:dpr,simT:+simT.toFixed(3),sheetT:+waterUniforms[1].u.uTime.value.toFixed(3),sheetFlow:+waterUniforms[1].u.uQ.value.toFixed(3),leafBottomY:+(CREST_Y+FS.a).toFixed(3),leafMeshY:+(gateMesh?gateMesh.position.y.toFixed(3):'null')};
  window.__fx={splash:splashPts,mist:mistMesh,band:null};window.__gateMesh=gateMesh;  if(reduced){renderOnce()}else{prev=performance.now();requestAnimationFrame(tick)}
 }catch(e){
  status.textContent='WebGL ไม่พร้อม — ใช้ SVG สำรอง';console.info('Demo fallback (SVG สำรอง):',e.message);
 }
}
let resizeObserverRef=null;
function resize(){
 if(!renderer||disposed)return;
 const r=stage.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
 composer?.setSize(w,h);
 if(reduced)renderOnce();
}
function renderOnce(){
 if(!renderer||!scene)return;
 for(const w of waterUniforms){w.u.uTime.value=simT%600;const sv=(w.key==='E')?FS.E:FS.Q;if(w.u.uFlow)w.u.uFlow.value=sv;if(w.u.uQ)w.u.uQ.value=sv}
 gateLift=gateLiftTarget=CREST_Y+FS.a+1.4;
 const sheetU=waterUniforms.find(w=>w.key==='sheets');sheetU&&(sheetU.u.uOpen.value=gateLift-CREST_Y-1.4);
 if(gateMesh)gateMesh.position.y=gateLift;
 renderer.render(scene,camera);
}

// ---------- camera presets / tween (spherical around target + elevation hump: never clips terrain) ----------
const SPH=new THREE.Spherical(),SPH0=new THREE.Spherical(),SPH1=new THREE.Spherical(),OFF=new THREE.Vector3(),T0=new THREE.Vector3(),T1=new THREE.Vector3();
function startTween(to){
 T0.copy(controls.target);T1.copy(to.tgt);
 OFF.copy(camera.position).sub(T0);SPH0.setFromVector3(OFF);
 OFF.copy(to.pos).sub(T1);SPH1.setFromVector3(OFF);
 // unwrapped shortest theta path
 const dTheta=SPH1.theta-SPH0.theta;
 if(dTheta>Math.PI)SPH1.theta-=Math.PI*2;else if(dTheta<-Math.PI)SPH1.theta+=Math.PI*2;
 tween={t0:performance.now(),dur:1200};
 controls.enabled=false;
}
function stepTween(now){
 if(!tween)return;
 let k=(now-tween.t0)/tween.dur;
 if(k>=1){
  camera.position.setFromSpherical(SPH1).add(T1);
  controls.target.copy(T1);tween=null;controls.enabled=true;controls.update();return;
 }
 const e=k<0.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
 // spherical lerp + elevation hump + radius hump keeps the path above the terrain hull
 SPH.radius=THREE.MathUtils.lerp(SPH0.radius,SPH1.radius,e)+1.1*Math.sin(Math.PI*e);
 SPH.phi=THREE.MathUtils.lerp(SPH0.phi,SPH1.phi,e)-0.16*Math.sin(Math.PI*e);
 SPH.theta=THREE.MathUtils.lerp(SPH0.theta,SPH1.theta,e);
 OFF.lerpVectors(T0,T1,e); // target glide
 camera.position.setFromSpherical(SPH).add(OFF);
 controls.target.copy(OFF);
 controls.update();
}
function applyPreset(n){lastInteraction=performance.now();startTween(PRESETS[n])}

// ---------- interaction ----------
function wireControls(){
 stage.addEventListener('pointermove',()=>{lastInteraction=performance.now()});
 stage.addEventListener('pointerdown',()=>{lastInteraction=performance.now();tween=null;controls.enabled=true});
 stage.addEventListener('wheel',()=>{lastInteraction=performance.now()},{passive:true});
 controls.addEventListener('start',()=>{lastInteraction=performance.now();tween=null});
 addEventListener('keydown',e=>{
  if(e.key==='1'||e.key==='2'||e.key==='3'){applyPreset(+e.key)}
  else if(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='ArrowDown'){lastInteraction=performance.now()}
 });
 flowSlider.addEventListener('input',()=>{FS=flowState(+flowSlider.value);flowValue.textContent=flowSlider.value+'%';const qr=document.getElementById('q-readout');qr&&(qr.textContent=`Q ~ ${FS.m3s} m³/s (จำลอง)`);lastInteraction=performance.now();if(reduced)renderOnce()});
 play.addEventListener('click',()=>{playing=!playing;play.textContent=playing?'หยุดการเคลื่อนไหว':'เริ่มการเคลื่อนไหว';play.setAttribute('aria-pressed',String(playing));if(reduced)renderOnce()});
 document.getElementById('reset').addEventListener('click',()=>applyPreset(1));
 document.getElementById('preset-1').addEventListener('click',()=>applyPreset(1));
 document.getElementById('preset-2').addEventListener('click',()=>applyPreset(2));
 document.getElementById('preset-3').addEventListener('click',()=>applyPreset(3));
 document.addEventListener('visibilitychange',()=>{prev=performance.now()});
 addEventListener('message',(e)=>{ // LED-strip embed hook: {type:'spillway-flow', v:0..100}
  if(!EMBED||!e.data||e.data.type!=='spillway-flow')return;
  const v=Math.max(0,Math.min(100,Number(e.data.v)|0));
  flowSlider.value=String(v);flowSlider.dispatchEvent(new Event('input'));
 });
 addEventListener('pagehide',()=>{
  disposed=true;
  resizeObserverRef?.disconnect();
  try{controls?.dispose()}catch(_e){}
  try{pmrem?.dispose();envRT?.dispose();envScene?.traverse(x=>{x.geometry?.dispose();x.material?.dispose()})}catch(_e){}
  try{composer?.dispose()}catch(_e){}
  if(scene){scene.traverse(x=>{x.geometry?.dispose();if(x.material){for(const m of[].concat(x.material)){for(const t of Object.values(m).filter(v=>v&&v.isTexture||false))t?.dispose?.();m.dispose()}}})}
  renderer?.dispose()
 },{once:true});
}

// ---------- main loop ----------
function tick(ts){
 if(disposed||!renderer)return;
 requestAnimationFrame(tick);
 if(document.hidden)return;
 if(ts-lastRender<15)return; // vsync throttle: unthrottled headless rAF would burn CPU at ~900fps
 lastRender=ts;
 const dt=Math.min(0.06,(ts-prev)/1000||0.033);prev=ts;
 if(!visible)return;
 if(playing)simT+=dt;
 stepTween(ts);
 controls.autoRotate=!tween&&playing&&simT>0&&(performance.now()-lastInteraction)>5000;
 if(controls.autoRotate)controls.autoRotateSpeed=0.45*(0.6+0.4*Math.sin(simT*0.1))*(EMBED?0.4:1);
 controls.update();
 if(camera.position.y<0.55)camera.position.y=0.55; // camera collision floor (terrain/water safety net)
 // adaptive pixel ratio: step down if avg fps < 45, up if > 58 (hysteresis, silent)
 fpsFrames++;fpsTime+=dt;
 if(fpsTime>=2.0){
  const fps=fpsFrames/fpsTime;fpsShown=Math.round(fps);fpsFrames=0;fpsTime=0;
  const now=performance.now();
  if(now-lastDprStep>2500){
   if(fps<45&&dpr>1){dpr=Math.max(1,dpr-0.25);renderer.setPixelRatio(dpr);composer?.setPixelRatio(dpr);lastDprStep=now;splashMat&&(splashMat.uniforms.uPix.value=dpr)}
   else if(fps>58&&dpr<dprMax){dpr=Math.min(dprMax,dpr+0.25);renderer.setPixelRatio(dpr);composer?.setPixelRatio(dpr);lastDprStep=now;splashMat&&(splashMat.uniforms.uPix.value=dpr)}
  }
 }
 for(const w of waterUniforms){w.u.uTime.value=simT%600;const sv=(w.key==='E')?FS.E:FS.Q;if(w.u.uFlow)w.u.uFlow.value=sv;if(w.u.uQ)w.u.uQ.value=sv}
 const gateLiftTarget=CREST_Y+FS.a+1.4;
 gateLift+=(gateLiftTarget-gateLift)*(1-Math.exp(-dt/0.13)); // ~0.4s visible leaf ease
 if(gateMesh)gateMesh.position.y=gateLift;
 const sheetU=waterUniforms.find(w=>w.key==='sheets');sheetU&&(sheetU.u.uOpen.value=gateLift-CREST_Y-1.4);
 renderer.info.reset();
 composer?composer.render():renderer.render(scene,camera);
 lastCalls=renderer.info.render.calls;lastTris=renderer.info.render.triangles;
 if(Math.round(simT*60)%240===0&&fpsShown>0)console.info(`[spillway] drawCalls=${lastCalls} tris=${lastTris} dpr=${dpr.toFixed(2)} fps≈${fpsShown} (SIMULATED demo)`);
}
initialize();
