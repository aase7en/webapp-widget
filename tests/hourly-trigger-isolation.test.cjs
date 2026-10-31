'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('apps-script/BackendApi.gs','utf8');
const start=source.indexOf('function BackendApiPm25Hourly_(event) {');
const end=source.indexOf('\nfunction BackendApiInstallPm25Hourly_',start);
test('PM history exception does not prevent the weather and water snapshot collector',()=>{
 let calls=0;const context={BackendApi:{hourlyHistory(){throw Error('sheet failure')}},BackendApiSnapshotHourly_(){calls++},Logger:{log(){}}};
 vm.runInNewContext(source.slice(start,end),context);let result=context.BackendApiPm25Hourly_({triggerUid:'fixture'});assert.equal(calls,1);assert.equal(result.status,'unavailable');
});
