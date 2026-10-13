'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('apps-script/Code.gs', 'utf8');

function setup({pm25=0,avg=0,pm10=undefined,apiStatus=200,appendFailure=false}={}) {
  const calls={rows:[],errors:[],triggersRemoved:[],triggersCreated:[],api:0};
  const spreadsheet={
    getSheetByName(name) {
      if(name !== 'ชีต1' && name !== 'ชีต2') return null;
      return {
        getRange(){ return {getValue(){return 'Timestamp';},setValues(){ throw Error('Header should not be overwritten'); }}; },
        appendRow(row){ if(appendFailure) throw Error('Write rejected'); calls.rows.push({name,row}); }
      };
    }
  };
  const unrelated={getHandlerFunction:()=> 'dailyHospitalReport'};
  const mainTrigger={getHandlerFunction:()=> 'main'};
  const appScriptContext={
    console:{ log(){},error(message){ calls.errors.push(message); } },
    UrlFetchApp:{fetch(){ calls.api++;return {getResponseCode(){return 200;},getContentText(){ return JSON.stringify({status:apiStatus,data:[{tb_tn:'อุทัย',pm25,pm25Avg24hr:avg,pm10}],datetimeThai:{dateThai:'ทดสอบ'}}); }}; }},
    SpreadsheetApp:{openById(){return spreadsheet;}},
    ScriptApp:{
      getProjectTriggers(){ return [unrelated,mainTrigger]; },
      deleteTrigger(t){ calls.triggersRemoved.push(t.getHandlerFunction()); },
      newTrigger(fn){return {timeBased(){return this;},atHour(hour){this.hour=hour;return this;},everyDays(n){calls.triggersCreated.push({fn,hour:this.hour,n});return {create(){}};}};}
    }
  };
  vm.createContext(appScriptContext);
  vm.runInContext(source,appScriptContext,{filename:'apps-script/Code.gs'});
  return {ctx:appScriptContext,calls};
}
test('PM10 unavailable never blocks main PM2.5 recording; zero is preserved',()=>{
  const x=setup({pm25:0,avg:14,pm10:undefined});
  x.ctx.main();
  assert.equal(x.calls.api,1);
  assert.equal(x.calls.rows.length,1);
  assert.equal(x.calls.rows[0].name,'ชีต1');
  const row=x.calls.rows[0].row;
  assert.equal(row.length,5);
  assert.equal(row[1],'');
  assert.equal(row[2],'');
  assert.equal(row[3],0);
  assert.equal(row[4],14);
  assert.equal(Object.prototype.toString.call(row[0]),'[object Date]');
});
test('missing concentration does not become zero or NaN, failed source is rejected',()=>{
  const x=setup({pm25:' ',avg:'NaN'});
  assert.equal(x.ctx.validConcentration(null),null);
  assert.equal(x.ctx.validConcentration('  '),null);
  assert.equal(x.ctx.validConcentration(false),null);
  assert.equal(x.ctx.validConcentration([]),null);
  assert.equal(x.ctx.validConcentration(0),0);
  assert.throws(()=>x.ctx.main(),/concentrations unavailable/);
  assert.equal(x.calls.rows.length,0);
});
test('GISTDA errors and spreadsheet errors propagate so execution is marked failed',()=>{
  const offline=setup({apiStatus:500});
  assert.throws(()=>offline.ctx.main(),/error status/);
  assert.equal(offline.calls.rows.length,0);
  const rejected=setup({pm25:12,avg:13,appendFailure:true});
  assert.throws(()=>rejected.ctx.main(),/Write rejected/);
});
test('daily trigger regeneration leaves unrelated trigger untouched',()=>{
  const x=setup();
  x.ctx.createDailyTrigger();
  assert.equal(x.calls.triggersRemoved.includes('dailyHospitalReport'),false);
  assert.deepEqual(x.calls.triggersRemoved,['main']);
  assert.deepEqual(x.calls.triggersCreated.map(x=>x.fn),['main','main','logGistdaData','logGistdaData']);
});
test('widget returns structured unavailable rather than stale valid concentration',()=>{
  const x=setup({apiStatus:500});
  const d=x.ctx.getWidgetData();
  assert.equal(d.error,true);
  assert.ok(!d.gistda);
});
test('legacy HTML clears stale values after refresh fails',()=>{
  const html=fs.readFileSync('apps-script/index.html','utf8');
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  const elements={};
  for(const id of ['activeLevel','emojiIcon','valueBox','pmValue','recommendationText']) {
    elements[id]={style:{},textContent:'',classList:{add(){}},removeAttribute(name){if(name==='src') this.src='';},src:''};
  }
  elements.emojiIcon.src='image';
  const label={style:{}};
  let poll;
  let response;
  const chain={
    withSuccessHandler(fn){this.ok=fn;return this;},
    withFailureHandler(fn){this.fail=fn;return this;},
    getWidgetData(){if(response==='fail')this.fail(Error('offline'));else this.ok(response);}
  };
  const ctx={
    console:{log(){},error(){}},
    document:{getElementById(id){return elements[id];},querySelector(selector){return selector==='.pm-label'?label:null;}},
    google:{script:{run:chain}},
    setInterval(fn){poll=fn;}
  };
  response={gistda:{selectedArea:{pm25Avg24hr:25}}};
  vm.runInNewContext(script,ctx);
  assert.equal(elements.pmValue.textContent,'25.0');
  response='fail';poll();
  assert.equal(elements.pmValue.textContent,'--');
  assert.equal(elements.recommendationText.textContent,'ไม่มีข้อมูลล่าสุด');
  assert.equal(elements.activeLevel.style.backgroundColor,'#68717d');
});
