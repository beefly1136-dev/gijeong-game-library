import { githubPath, githubRawUrl } from './github.js';
import mirrors from './github-mirror.json';
import snapshots from './github-snapshots.json';
const refreshing = new Map(), attempted = new Map();
const FRESH_MS = 60000;
function delivered(response,request,source,immutable=false){
  const headers=new Headers(response.headers);
  headers.set('Cache-Control',immutable?'public, max-age=31536000, immutable':'public, max-age=60');
  headers.set('X-Game-Delivery',source);
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});
}
function gameHeaders(env,path,describe){
  const {type,encoding}=describe(path);
  const headers=new Headers({'Content-Type':type,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'cross-origin','Content-Security-Policy':`frame-ancestors ${env.SITE_ORIGIN}`});
  if(encoding)headers.set('Content-Encoding',encoding);
  return headers;
}
// Never wait for this operation when a cached or deployed copy is available.
function refresh(path,key,env,cache,describe){
  if(refreshing.has(key.url))return refreshing.get(key.url);
  if(Date.now()-(attempted.get(key.url)||0)<FRESH_MS)return Promise.resolve(null);
  attempted.set(key.url,Date.now());
  if(attempted.size>2000)attempted.delete(attempted.keys().next().value);
  const task=(async()=>{
    try{
      const upstreamUrl=new URL(githubRawUrl(env,path));
      upstreamUrl.searchParams.set('snapshot',snapshots[path]?.revision||'live');
      const upstream=await fetch(upstreamUrl,{signal:AbortSignal.timeout(10000)});
      if(!upstream.ok){await upstream.body?.cancel();return new Response('GitHub에서 게임 파일을 찾지 못했습니다.',{status:upstream.status===404?404:502});}
      // Complete upstream transfer off the gameplay path, including its slow body stream.
      const bytes=await upstream.arrayBuffer();
      const headers=gameHeaders(env,path,describe);
      headers.set('X-GitHub-Fetched-At',String(Date.now()));
      const response=new Response(bytes,{headers,encodeBody:describe(path).encoding?'manual':'automatic'});
      await cache.put(key,response.clone());return response;
    }catch{return null;}
  })().finally(()=>refreshing.delete(key.url));
  refreshing.set(key.url,task);return task;
}
export async function serveGithub(request,env,ctx,describe){
  const url=new URL(request.url);let path;
  try{path=githubPath(url.pathname.slice('/github/'.length),env);}catch{return new Response('올바르지 않은 게임 경로입니다.',{status:400});}
  if(mirrors[path]&&env.ASSETS){
    const asset=await env.ASSETS.fetch(new Request(url.origin+'/'+mirrors[path]));
    if(asset.status===200)return delivered(new Response(asset.body,{headers:gameHeaders(env,path,describe)}),request,'cloudflare-static',true);
  }
  const cache=caches.default,key=new Request(url.origin+'/github-cache-v2/'+(snapshots[path]?.revision||'live')+'/'+path.split('/').map(encodeURIComponent).join('/'));
  const cached=await cache.match(key);
  if(cached){
    const fresh=Date.now()-Number(cached.headers.get('X-GitHub-Fetched-At'))<FRESH_MS;
    if(!fresh)ctx.waitUntil(refresh(path,key,env,cache,describe));
    return delivered(cached,request,fresh?'cloudflare-cache':'cloudflare-cache-stale');
  }
  // Include every game HTML and nonhashed asset in deployment, not just media hashes.
  if(snapshots[path]&&env.ASSETS){
    const asset=await env.ASSETS.fetch(new Request(url.origin+'/'+snapshots[path].asset));
    if(asset.status===200){
      ctx.waitUntil(refresh(path,key,env,cache,describe));
      return delivered(new Response(asset.body,{headers:gameHeaders(env,path,describe)}),request,'cloudflare-snapshot');
    }
  }
  const response=await refresh(path,key,env,cache,describe);
  return response?delivered(response,request,'github'):new Response('게임 파일이 아직 준비되지 않았습니다. 파일 경로와 배포 상태를 확인해 주세요.',{status:502});
}
