'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const patch = fs.readFileSync('apps-script/LIVE-HOTFIX-CANDIDATE.gs','utf8');
function env({
  pm25=11, avg=14, status=200, http=200,
  validStructure=true, failAppend=false, name='อุทัย'
} = {}) {
  const recorded = { requests:0, appended:[], formatted:false, logged:[], deleted:0, ranWAQI:false };
  const sheet = {
    appendRow(row) { if(failAppend) throw Error('Sheet write denied'); recorded.appended.push(row); },
    getLastRow() {return recorded.appended.length + 1;},
    getRange(row,col,nrows,ncols) {
      return {
        setNumberFormat(format) {assert.equal(format,'0.00');recorded.formatted=true;},
        getValues() {return [['Timestamp','AQI (US)','PM10 (µg/m³)','PM2.5 (µg/m³)','PM2.5 24hr Avg (µg/m³)']];},
        setValues() { throw Error('Unexpected header overwrite'); }
      };
    },
    deleteRows() {recorded.deleted++;}
  };
  const context = {
    CONFIG: {SPREADSHEET_ID:'dummy_sheet',API_ENDPOINTS:{GISTDA_AIR:'https://example.invalid/gistda'}},
    SpreadsheetApp: {openById(id) {assert.equal(id,'dummy_sheet');return {getSheetByName(name) {assert.equal(name,'ชีต1');return sheet;}};}},
    UrlFetchApp: {fetch(url) {
      assert.equal(url,'https://example.invalid/gistda');
      recorded.requests++;
      return {getResponseCode(){return http;},getContentText(){return JSON.stringify({
        status,
        data:validStructure ? [{tb_tn:name,pm25,pm25Avg24hr:avg}] : null,
        datetimeThai:{dateThai:'วันศุกร์',timeThai:'12:00'}
      });}};
    }},
    Logger: {log(message) {recorded.logged.push(message);}}
  };
  vm.createContext(context);
  vm.runInContext(patch,context,{filename:'apps-script/LIVE-HOTFIX-CANDIDATE.gs'});
  return {context,recorded};
}
test('the live hotfix writes GISTDA without touching WAQI/PM10 and preserves 0',()=>{
  const x=env({pm25:0,avg:14});
  x.context.main();
  assert.equal(x.recorded.requests,1);
  assert.equal(x.recorded.appended.length,1);
  const row=x.recorded.appended[0];
  assert.equal(row[1],'');assert.equal(row[2],'');assert.equal(row[3],0);assert.equal(row[4],14);
  assert.equal(Object.prototype.toString.call(row[0]),'[object Date]');
  assert.equal(x.recorded.deleted,0);assert.equal(x.recorded.formatted,true);
});
test('missing PM10 and entire WAQI data never influence the PM2.5 sheet',()=>{
  const x=env({pm25:10,avg:14});
  assert.doesNotThrow(()=>x.context.main());
  assert.equal(x.recorded.appended.length,1);
  assert.equal(x.recorded.appended[0].length,5);
});
test('true missing/NaN/booleans do not turn into 0',()=>{
  const x=env({pm25:null,avg:'NaN'});
  assert.equal(x.context.optionalPM25_(false),null);
  assert.equal(x.context.optionalPM25_([]),null);
  assert.equal(x.context.optionalPM25_('  '),null);
  assert.equal(x.context.optionalPM25_(0),0);
  assert.throws(()=>x.context.main(),/unavailable/);
  assert.equal(x.recorded.appended.length,0);
});
test('bad API response or non-Uthai data fails the execution with no write',()=>{
  for(const config of [{status:500},{http:502},{validStructure:false},{name:'ไม่ใช่อุทัย'}]) {
    const x=env(config);
    assert.throws(()=>x.context.main());
    assert.equal(x.recorded.appended.length,0);
    assert.ok(x.recorded.logged.some(s=>s.startsWith('main failed:')));
  }
});
test('blank sheet writes header before data, not over first row',()=>{
  const order=[];
  const existing=[];
  const sheet={
    appendRow(row){order.push('append');existing.push(row);},
    getLastRow(){return existing.length;},
    getRange(){
      return {
        getValues(){return [existing[0] || ['', '', '', '', '']];},
        setValues(rows){order.push('header');existing[0]=rows[0];},
        setNumberFormat(format){assert.equal(format,'0.00');}
      };
    }
  };
  const context={
    CONFIG:{SPREADSHEET_ID:'testing',API_ENDPOINTS:{GISTDA_AIR:'https://example.invalid/gistda'}},
    SpreadsheetApp:{openById(){return {getSheetByName(){return sheet;}};}},
    UrlFetchApp:{fetch(){return {getResponseCode(){return 200;},getContentText(){return JSON.stringify({
      status:200,data:[{tb_tn:'อุทัย',pm25:5,pm25Avg24hr:8}]
    });}};}},
    Logger:{log(){}}
  };
  vm.createContext(context);
  vm.runInContext(patch,context);
  context.main();
  assert.deepEqual(order,['header','append']);
  assert.equal(existing.length,2);
  assert.equal(existing[0][0],'Timestamp');
  assert.equal(existing[1][3],5);
});

test('spreadsheet append failure propagates; a successful execution cannot be claimed',()=>{
  const x=env({failAppend:true});
  assert.throws(()=>x.context.main(),/Sheet write denied/);
  assert.equal(x.recorded.appended.length,0);
});
