'use strict';
/* Shared boot harness for location/provenance tests: runs the real strip.js
 * against a minimal DOM stub and paints a given payload. No browser needed. */
const path=require('node:path');
const vm=require('node:vm');
const D=require('../../led-rotation.js');

const IDS=['clock-a','day-a','pm-value','pm-unit','pm-badge','pm-note','pm-loc','slide-pm',
  'wx-temp','wx-hi','wx-rain','wx-badge','wx-note','wx-dot','wx-loc','wx-credit','heat-thermo','slide-weather',
  'wa-value','wa-badge','wa-loc','water-rig','slide-water','stage'];
function makeEl(id){
  const el={id,textContent:'',style:{setProperty(k,v){this[k]=v;}},dataset:{},attrs:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    setAttribute(k,v){this.attrs[k]=String(v);},getAttribute(k){return this.attrs[k]??null;},
    addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},
    closest(){return null;}};
  return el;
}
function boot(raw,nowMs){
  const reg={};
  for(const id of IDS)reg[id]=makeEl(id);
  const document={
    getElementById:id=>reg[id]||null,
    querySelector:sel=>sel==='.slide.active, .slide.entering'?reg['slide-pm']:null,
    querySelectorAll:()=>[],
    documentElement:{classList:{add(){},remove(){},toggle(){},contains(){return false;}}},
    addEventListener(){},visibilityState:'visible',
  };
  const win={
    document,
    UthaiLEDRotation:D,
    innerWidth:432,matchMedia:()=>({matches:false}),
    setInterval:()=>0,clearInterval(){},setTimeout:()=>0,
    addEventListener(){},
  };
  const sandbox={window:win,console,Date,Math,Intl,Object,Number,String,Array,RegExp,JSON,
    Boolean,Promise,Error,module:{exports:{}},globalThis:null};
  sandbox.globalThis=sandbox;
  const src=require('node:fs').readFileSync(path.join(__dirname,'../../strip.js'),'utf8');
  vm.runInNewContext(src,sandbox);
  const api=sandbox.module.exports;
  api.paintAllFrom(raw,nowMs); /* normalize + paint atomically */
  return {reg,api};
}
module.exports={boot,IDS,makeEl};
