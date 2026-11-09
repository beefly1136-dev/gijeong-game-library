// 모든 게임 파일을 Cloudflare에 미리 배포해 콜드 캐시에서도 GitHub를 기다리지 않습니다.
// 내용 해시가 검증된 미디어만 장기 캐시하고, 나머지는 배포본 우선 + 배경 갱신합니다.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = join(here, '.mirror');
const MEDIA = new Set('webp png jpg jpeg gif svg ico mp3 wav ogg m4a mp4 webm woff woff2 ttf otf'.split(' '));
const HASH = /(?:^|[-_.])([0-9a-f]{24})\.([a-z0-9]+)$/;
const MAX_BYTES = 25 * 1024 * 1024;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

if(existsSync(out)&&realpathSync(out).toLowerCase()!==out.toLowerCase())throw new Error('복제 출력 폴더가 다른 경로를 가리킵니다.');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const mirror = {}, snapshots = {};
let skipped = 0;
for (const top of ['g', 'games']) {
  const base = join(root, top);
  if (!existsSync(base)) continue;
  for (const file of walk(base)) {
    const path = relative(root, file).split(sep).join('/');
    const match = path.split('/').pop().match(HASH);
    const data = readFileSync(file);
    if(data.length>MAX_BYTES)throw new Error(`게임 파일이 25 MB를 초과합니다: ${path}`);
    mkdirSync(dirname(join(out, path)), { recursive: true });
    cpSync(file, join(out, path));
    if(match&&MEDIA.has(match[2])&&createHash('sha256').update(data).digest('hex').slice(0,24)===match[1])mirror[path]=path;
    else { snapshots[path]={asset:path,revision:createHash('sha256').update(data).digest('hex').slice(0,16)}; if(match)skipped++; }
  }
}
const sorted = Object.fromEntries(Object.entries(mirror).sort(([a], [b]) => (a < b ? -1 : 1)));
writeFileSync(join(here, 'src', 'github-mirror.json'), JSON.stringify(sorted));
writeFileSync(join(here, 'src', 'github-snapshots.json'), JSON.stringify(snapshots));
console.log(`고정 미디어 ${Object.keys(sorted).length}개, 즉시 실행 전달본 ${Object.keys(snapshots).length}개`);
