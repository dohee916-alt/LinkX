// Relative URLs work on GitHub Pages and locally. No framework required.
const root = new URL("../", import.meta.url);
const routes={home:"modules/main/index.html",emergency:"modules/emergency/index.html",saved:"modules/saved/index.html"};
function goAcross(url,replace=false){
 try{if(window.parent!==window&&typeof window.parent.linkxTransitionNavigate==="function"&&window.parent.linkxTransitionNavigate(url,window,replace))return;}catch{}
 if(replace)location.replace(url);else location.assign(url);
}
export function navigate(route,params={}){if(!routes[route])throw new Error("Unregistered route: "+route);const url=new URL(routes[route],root);for(const [k,v] of Object.entries(params))if(v!=null)url.searchParams.set(k,String(v));goAcross(url.href)}
export function registerRoute(key,path){routes[key]=path}
export function params(){return new URLSearchParams(location.search)}
export function back(fallback="home"){if(document.referrer&&new URL(document.referrer).origin===location.origin)history.back();else navigate(fallback)}

/** Shared entry contract for any team module. Return URL stays inside LinkX. */
export function openSaved(tab="emergency",returnParams={}){
 const from=new URL(location.href);
 for(const [k,v] of Object.entries(returnParams))from.searchParams.set(k,String(v));
 navigate("saved",{tab,returnTo:from.href});
}
export function returnFromSaved(){
 const q=params();
 const candidates=[q.get("returnTo"),document.referrer];
 for(const candidate of candidates){if(!candidate)continue;try{const target=new URL(candidate,root);if(target.origin!==root.origin||!target.pathname.startsWith(root.pathname)||target.pathname.includes("/modules/saved/"))continue;
 if(/\/modules\/emergency\/(?:index\.html)?$/.test(target.pathname))target.searchParams.set("resume","1");
 goAcross(target.href,true);return;
 }catch{}}
 if(q.get("from")==="emergency"){navigate("emergency",{resume:1});return}navigate("home");
}
export function syncScrollEdges(el){
 const max=Math.max(0,el.scrollHeight-el.clientHeight);
 el.dataset.hasAbove=String(max>1&&el.scrollTop>1);
 el.dataset.hasBelow=String(max>1&&el.scrollTop<max-1);
}
