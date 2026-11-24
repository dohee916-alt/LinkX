import {getStore, updateStore} from "../../shared/store.js";

export const REWARDS = {
  1:{name:"시작의 증표", meaning:"새로운 시도를 시작한 나를 기억하는 리워드예요."},
  2:{name:"발견의 망원경", meaning:"익숙하지 않은 상황을 살펴본 호기심을 기억해요."},
  3:{name:"마주한 순간", meaning:"완벽하지 않아도 대화를 이어간 경험을 기억해요."},
  4:{name:"작은 호감", meaning:"대화를 조금 더 따뜻하게 만든 시도를 기억해요."},
  5:{name:"첫마디 명사수", meaning:"먼저 인사를 건넨 용기를 기념해요", mission:"짧게 먼저 말 걸어보기", missionId:"greeting-05"},
  6:{name:"약속과 만남"}, 7:{name:"마음이 담긴 글씨"}, 8:{name:"별빛 추억"}
};

// The existing exhibition scenario, not a fabricated saved user conversation.
export const DEMO_RECORD = Object.freeze({
  rewardId:5, missionId:"greeting-05", missionTitle:REWARDS[5].mission,
  source:"demo", title:"먼저 건넨 한마디",
  reflection:"학생회관 앞에서 외국인 학생에게 먼저 인사를 건넸어요. 떨렸지만, 생각보다 편하게 대화를 마쳤어요.",
  achievement:"떨리는 마음에도 먼저 인사를 건네며 현실의 대화를 시작했어요.",
  next:"인사한 뒤, 짧은 질문 한마디를 더 이어가 보세요."
});
const owns = (obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const validId = id=>Number.isInteger(Number(id)) && !!REWARDS[Number(id)];
export function unlockedIds(store){
  const ids=store.unlockedRewards ?? store.rewardUnlocked ?? store.rewards?.unlocked;
  if(Array.isArray(ids))return [...new Set(ids.filter(validId).map(Number))];
  return [1,2,3,4,5]; // Existing exhibition's five-reward starting state.
}
export function recordFor(store,id){
  id=Number(id);
  const records=store.rewardRecords;
  if(records && owns(records,String(id))){
    const record=records[id];
    return record && Number(record.rewardId)===id ? record : null;
  }
  const mission=store.mission;
  if(mission && (Number(mission.rewardId)===id || (id===5 && mission.id===REWARDS[5].missionId))){
    const reflection=mission.reflection ?? mission.feedbackSummary ?? mission.summary ?? mission.reviewSummary;
    return {rewardId:id, missionId:mission.id, missionTitle:mission.title || REWARDS[id].mission,
      reflection:typeof reflection==="string"?reflection:"", source:"saved"};
  }
  // Explicit records/states must never silently fall back to the exhibition story.
  const explicit=Array.isArray(store.unlockedRewards ?? store.rewardUnlocked ?? store.rewards?.unlocked);
  return id===5 && !records && !explicit ? {...DEMO_RECORD} : null;
}
export function sortedRewards(store,order="newest"){
  const owned=new Set(unlockedIds(store));
  const acquired=[...owned].sort((a,b)=>{
    const ta=Date.parse(recordFor(store,a)?.acquiredAt || "") || a;
    const tb=Date.parse(recordFor(store,b)?.acquiredAt || "") || b;
    return order==="oldest" ? ta-tb : tb-ta;
  });
  return [...acquired,...Object.keys(REWARDS).map(Number).filter(id=>!owned.has(id))];
}
export function claimReward(id=5){
  if(!validId(id))throw new Error("Unknown reward");
  id=Number(id);
  const store=getStore();
  const unlocked=[...new Set([...unlockedIds(store),id])];
  const previous=recordFor(store,id);
  const record={...(previous || {rewardId:id}),acquiredAt:previous?.acquiredAt || new Date().toISOString()};
  return updateStore({unlockedRewards:unlocked,rewardRecords:{...store.rewardRecords,[id]:record}});
}
