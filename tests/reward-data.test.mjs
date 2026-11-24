import test from 'node:test';
import assert from 'node:assert/strict';
import {REWARDS, DEMO_RECORD, unlockedIds, recordFor, sortedRewards, claimReward} from '../modules/reward/data.js';
let saved={};
globalThis.localStorage={getItem:()=>JSON.stringify(saved),setItem:(_key,value)=>{saved=JSON.parse(value);}};

test('latest acquired rewards precede locked rewards; oldest remains chronological',()=>{
 const store={unlockedRewards:[1,2,5],rewardRecords:{1:{rewardId:1,acquiredAt:'2026-11-23T10:00:00Z'},2:{rewardId:2,acquiredAt:'2026-11-25T02:00:00Z'},5:{rewardId:5,acquiredAt:'2026-11-24T22:00:00Z'}}};
 assert.deepEqual(sortedRewards(store,'newest'),[2,5,1,3,4,6,7,8]);
 assert.deepEqual(sortedRewards(store,'oldest'),[1,5,2,3,4,6,7,8]);
});
test('explicit empty collection is preserved and IDs are sanitized',()=>{
 assert.deepEqual(unlockedIds({unlockedRewards:[]}),[]);
 assert.deepEqual(unlockedIds({unlockedRewards:[5,'5',99,0,'bad',2]}),[5,2]);
});
test('exhibition example is available only for the default exhibition state',()=>{
 assert.equal(recordFor({},5).reflection,DEMO_RECORD.reflection);
 assert.equal(recordFor({unlockedRewards:[5]},5),null);
 assert.equal(recordFor({rewardRecords:{}},5),null);
 assert.equal(recordFor({rewardRecords:{5:null}},5),null);
});
test('records are isolated per reward and unrelated mission summaries are not reused',()=>{
 const store={unlockedRewards:[1,5],rewardRecords:{5:{rewardId:1,reflection:'wrong record'}},mission:{rewardId:2,summary:'other mission'}};
 assert.equal(recordFor(store,5),null);
 assert.equal(recordFor(store,1),null);
 assert.equal(recordFor({mission:{id:REWARDS[5].missionId,summary:'saved reflection'}},5).reflection,'saved reflection');
});
test('claim persists once, retains existing reflection, and leaves other team data intact',()=>{
 saved={unlockedRewards:[1,5],rewardRecords:{5:{rewardId:5,reflection:'my own reflection',acquiredAt:'2026-11-24T00:00:00Z'}},savedConversations:[{id:'keep'}],mission:{id:'other'}};
 const first=claimReward(5),second=claimReward(5);
 assert.deepEqual(second.unlockedRewards,[1,5]);
 assert.equal(second.rewardRecords[5].reflection,'my own reflection');
 assert.equal(second.rewardRecords[5].acquiredAt,first.rewardRecords[5].acquiredAt);
 assert.deepEqual(second.savedConversations,[{id:'keep'}]);
 assert.deepEqual(second.mission,{id:'other'});
});
test('claim in an empty collection awards only the completed reward',()=>{
 saved={unlockedRewards:[],rewardRecords:{}};
 const store=claimReward(5);
 assert.deepEqual(store.unlockedRewards,[5]);
 assert.ok(Date.parse(store.rewardRecords[5].acquiredAt));
 assert.equal(store.rewardRecords[5].reflection,undefined);
 assert.throws(()=>claimReward(99));
});
