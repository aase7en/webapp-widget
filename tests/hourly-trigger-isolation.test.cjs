'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('apps-script/BackendApi.gs','utf8');
const start=source.indexOf('function BackendApiPm25Hourly_(event) {');
const end=source.indexOf('\nfunction BackendApiInstallPm25Hourly_',start);
test('PM history exception does not prevent the weather and water snapshot collector',()=>{
 let calls=0;const context={BackendApi:{isHourlyAuthorized:()=>true,hourlyHistory(){throw Error('sheet failure')}},BackendApiSnapshotHourly_(){calls++},Logger:{log(){}}};
 vm.runInNewContext(source.slice(start,end),context);let result=context.BackendApiPm25Hourly_({triggerUid:'fixture'});assert.equal(calls,1);assert.equal(result.status,'unavailable');
});

const snapshotSource=fs.readFileSync('apps-script/HourlySnapshot.gs','utf8');
const snapshotStart=snapshotSource.indexOf('function BackendApiSnapshotHourly_(event) {');
const snapshotEnd=snapshotSource.indexOf('\n/* Owner-only staged cutover',snapshotStart);
test('snapshot storage failure does not suppress authorized water collection',()=>{let calls=0;const ctx={HourlySnapshot:{authorized:()=>true,collect(){throw Error('schema mismatch')}},WaterHistory:{syncHourly(){calls++;return {stored:1}}}};vm.runInNewContext(snapshotSource.slice(snapshotStart,snapshotEnd),ctx);let result=ctx.BackendApiSnapshotHourly_({triggerUid:'fixture'});assert.equal(calls,1);assert.equal(result.water.stored,1)});
test('unauthorized caller cannot invoke water collection',()=>{let calls=0;const ctx={HourlySnapshot:{authorized:()=>false},WaterHistory:{syncHourly(){calls++}}};vm.runInNewContext(snapshotSource.slice(snapshotStart,snapshotEnd),ctx);assert.throws(()=>ctx.BackendApiSnapshotHourly_({}),/not authorized/);assert.equal(calls,0)});

test('untrusted PM trigger cannot start either collector',()=>{let pm=0,snapshot=0;const ctx={BackendApi:{isHourlyAuthorized:()=>false,hourlyHistory(){pm++}},BackendApiSnapshotHourly_(){snapshot++},Logger:{log(){}}};vm.runInNewContext(source.slice(start,end),ctx);assert.throws(()=>ctx.BackendApiPm25Hourly_({}),/not authorized/);assert.equal(pm,0);assert.equal(snapshot,0)});
test('manual snapshot entry requires trusted owner before collector',()=>{
 const start=snapshotSource.indexOf('function runWidgetSnapshotNow() {'),end=snapshotSource.indexOf('\nfunction enableWidgetSnapshotMode',start);let calls=0;
 const ctx={BackendApi:{assertTrustedCaller(){throw Error('owner required')}},BackendApiSnapshotHourly_(){calls++}};
 vm.runInNewContext(snapshotSource.slice(start,end),ctx);assert.throws(()=>ctx.runWidgetSnapshotNow(),/owner required/);assert.equal(calls,0);
});
