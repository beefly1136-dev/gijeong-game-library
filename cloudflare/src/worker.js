import { serveGithub } from './github-delivery.js';
const TYPES={html:'text/html; charset=utf-8',htm:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json; charset=utf-8',txt:'text/plain; charset=utf-8',csv:'text/csv; charset=utf-8',xml:'application/xml',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',ico:'image/x-icon',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4',mp4:'video/mp4',webm:'video/webm',wasm:'application/wasm',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',otf:'font/otf',glb:'model/gltf-binary',gltf:'model/gltf+json'};
function describe(path){const parts=path.toLowerCase().split('/').pop().split('.');let ext=parts.pop(),encoding;if(ext==='br'||ext==='gz'){encoding=ext==='br'?'br':'gzip';ext=parts.pop()}return{type:TYPES[ext]||'application/octet-stream',encoding};}
const missing=()=>new Response('파일을 찾을 수 없습니다.',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8'}});
export default{async fetch(request,env,ctx){
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405});
 const url=new URL(request.url);if(url.pathname.startsWith('/github/'))return serveGithub(request,env,ctx,describe);let key,path;const game=url.pathname.match(/^\/g\/([0-9a-f-]{36})\/(\d+)\/(.*)$/),thumb=url.pathname.match(/^\/t\/([0-9a-f-]{36})\/(\d+)\.webp$/);
 if(game){try{path=decodeURIComponent(game[3])||'index.html'}catch{return missing()}if(path.endsWith('/'))path+='index.html';if(path.split('/').includes('..'))return missing();key=`games/${game[1]}/${game[2]}/${path}`;}else if(thumb){path='thumbnail.webp';key=`thumbnails/${thumb[1]}/${thumb[2]}.webp`;}else return missing();
 const cacheKey=new Request(url.origin+url.pathname,{method:'GET'}),cache=caches.default;
 const hit=await cache.match(cacheKey);if(hit){const headers=new Headers(hit.headers);headers.set('X-Game-Delivery','edge-cache');return new Response(request.method==='HEAD'?null:hit.body,{status:hit.status,headers});}
 let response,delivery='static';
 if(game){const asset=await env.ASSETS.fetch(cacheKey);if(asset.status===200)response=asset;}
 const {type,encoding}=describe(path);
 if(!response){delivery='kv';const body=await env.GAMES.get(key,{type:'stream',cacheTtl:86400});if(!body)return missing();response=new Response(body,{headers:{'Content-Type':type},encodeBody:encoding?'manual':'automatic'});}
 const headers=new Headers(response.headers);headers.set('Cache-Control','public, max-age=31536000, immutable');headers.set('X-Content-Type-Options','nosniff');headers.set('Cross-Origin-Resource-Policy','cross-origin');headers.set('Content-Security-Policy',`frame-ancestors ${env.SITE_ORIGIN}`);headers.set('X-Game-Delivery',delivery);if(encoding)headers.set('Content-Encoding',encoding);
 const result=new Response(response.body,{headers,encodeBody:encoding?'manual':'automatic'});ctx.waitUntil(cache.put(cacheKey,result.clone()).catch(()=>{}));
 return request.method==='HEAD'?new Response(null,{headers}):result;
}};
