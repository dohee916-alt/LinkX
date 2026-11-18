const key="linkx:v1";
const defaults=()=>({emergencyDraft:null,savedConversations:[],mission:null});
export function getStore(){try{return {...defaults(),...JSON.parse(localStorage.getItem(key)||"{}")}}catch{return defaults()}}
export function updateStore(patch){const next={...getStore(),...patch};localStorage.setItem(key,JSON.stringify(next));return next}
export function saveConversation(item){const current=getStore().savedConversations;return updateStore({savedConversations:[{...item,updatedAt:Date.now()},...current.filter(x=>x.id!==item.id)]})}
export function removeConversation(id){return updateStore({savedConversations:getStore().savedConversations.filter(x=>x.id!==id)})}
