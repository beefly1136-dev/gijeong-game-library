import { githubPath, githubRawUrl } from './github.js';
import mirrors from './github-mirror.json';
export async function serveGithub(request,env,ctx,describe){
 const url=new URL(request.url);let path;
 try{path=githubPath(url.pathname.slice('/github/'.length),env);}catch{return new Response('올바르지 않은 게임 경로입니다.',{status:400});}
 // These filenames contain a verified content hash. Changed media receives a new name.
 // Keep source control on GitHub while delivering unchanged media directly from Cloudflare.
 if(mirrors[path]&&env.ASSETS){
   const asset=await env.ASSETS.fetch(new Request(url.origin+'/'+mirrors[path]));
   if(asset.status===200){const {type}=describe(path),headers=new Headers(asset.headers);headers.set('Content-Type',type);headers.set('Cache-Control','public, max-age=31536000, immutable');headers.set('X-Game-Delivery','cloudflare-static');headers.set('X-Content-Type-Options','nosniff');headers.set('Cross-Origin-Resource-Policy','cross-origin');headers.set('Content-Security-Policy',`frame-ancestors ${env.SITE_ORIGIN}`);return new Response(request.method==='HEAD'?null:asset.body,{headers});}
 }
 const cache=caches.default,key=new Request(url.origin+'/github/'+path.split('/').map(encodeURIComponent).join('/'));
 const cached=await cache.match(key);
 const fresh=cached&&Date.now()-Number(cached.headers.get('X-GitHub-Fetched-At'))<60000;
 function finish(response,stale=false){const headers=new Headers(response.headers);headers.set('Cache-Control','public, max-age=60');headers.set('X-Game-Delivery',stale?'github-stale':'github');return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});}
 if(fresh)return finish(cached);
 let upstream;
 try{upstream=await fetch(githubRawUrl(env,path),{signal:AbortSignal.timeout(15000)});}catch{if(cached)return finish(cached,true);return new Response('게임 파일 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.',{status:502});}
 if(!upstream.ok){await upstream.body?.cancel();if(cached&&upstream.status>=500)return finish(cached,true);return new Response('GitHub에서 게임 파일을 찾지 못했습니다.',{status:upstream.status===404?404:502});}
 const {type,encoding}=describe(path);
 const headers=new Headers({'Content-Type':type,'Cache-Control':'public, max-age=300','X-GitHub-Fetched-At':String(Date.now()),'X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'cross-origin','Content-Security-Policy':`frame-ancestors ${env.SITE_ORIGIN}`,'X-Game-Delivery':'github'});
 if(encoding)headers.set('Content-Encoding',encoding);
 const response=new Response(upstream.body,{headers,encodeBody:encoding?'manual':'automatic'});
 ctx.waitUntil(cache.put(key,response.clone()).catch(()=>{}));return finish(response);
}
