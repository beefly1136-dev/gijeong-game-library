import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {Script} from 'node:vm';

export function bundleStartup(out,entry){
 const file=join(out,'github',entry);if(!existsSync(file))return null;
 let html=readFileSync(file,'utf8');
 const tags=[...html.matchAll(/<script\b([^>]*\bsrc=["']([^"']+)["'][^>]*)>\s*<\/script>/g)];
 if(tags.length<8)return null;
 if(tags.some(t=>/\b(?:async|defer|type|integrity)\s*=?/i.test(t[1])||/^https?:|^\/\//.test(t[2])))throw Error('Only ordered local classic scripts may be bundled: '+entry);
 const sources=tags.map(t=>{const name=decodeURIComponent(t[2].split(/[?#]/)[0]);if(name.startsWith('/')||name.split('/').includes('..'))throw Error('Unsafe script path');return{path:name,code:readFileSync(join(dirname(file),name),'utf8')};});
 const between=html.slice(tags[0].index,tags.at(-1).index+tags.at(-1)[0].length).replace(/<script\b[^>]*src=["'][^"']+["'][^>]*>\s*<\/script>/g,'');
 if(/<script\b/i.test(between))throw Error('An inline dependency occurs between external scripts');
 const code=sources.map(s=>`\n/* ${s.path} */\n${s.code}\n;`).join('');
 new Script(code,{filename:entry});
 const hash=createHash('sha256').update(code).digest('hex').slice(0,24),relative=`src/start-${hash}.js`;
 mkdirSync(join(dirname(file),'src'),{recursive:true});writeFileSync(join(dirname(file),relative),code);
 let first=true;html=html.replace(/<script\b([^>]*\bsrc=["']([^"']+)["'][^>]*)>\s*<\/script>/g,()=>{if(first){first=false;return `<script defer src="${relative}"></script>`;}return '';});
 html=html.replace('</head>',`<link rel="preload" as="script" href="${relative}"></head>`);
 // Ask for title art in parallel with code; do not preload later-stage media.
 const mapFile=join(dirname(file),'src/core/hashmap.js');
 if(existsSync(mapFile)){
   const mapText=readFileSync(mapFile,'utf8'),match=mapText.match(/window\.BPF_HASH\s*=\s*(\{[^\n]+\});/);
   if(match){const map=JSON.parse(match[1]);for(const key of ['assets/ui/title_bg.jpg','assets/ui/title_logo.png'])if(map[key])html=html.replace('</head>',`<link rel="preload" as="image" href="${map[key]}" fetchpriority="high"></head>`);}
 }
 writeFileSync(file,html);
 return {entry,scriptsBefore:tags.length,scriptsAfter:1,bytes:Buffer.byteLength(code),bundle:relative};
}
