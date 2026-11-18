// Relative URLs work on GitHub Pages and locally. No framework required.
const root = new URL("../", import.meta.url);
const routes={home:"index.html",emergency:"modules/emergency/index.html",saved:"modules/saved/index.html"};
export function navigate(route,params={}){if(!routes[route])throw new Error("Unregistered route: "+route);const url=new URL(routes[route],root);for(const [k,v] of Object.entries(params))if(v!=null)url.searchParams.set(k,String(v));location.assign(url.href)}
export function registerRoute(key,path){routes[key]=path}
export function params(){return new URLSearchParams(location.search)}
export function back(fallback="home"){if(document.referrer&&new URL(document.referrer).origin===location.origin)history.back();else navigate(fallback)}
