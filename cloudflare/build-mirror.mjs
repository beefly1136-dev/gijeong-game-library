// 게임 폴더에서 내용이 검증된 해시 이름 미디어를 찾아 Cloudflare 정적 복제본을 만듭니다.
// 파일 이름 속 24자리 해시가 파일 내용의 SHA-256 앞 24자리와 같을 때만 복제합니다.
// 내용이 바뀌면 이름도 바뀌므로 오래 캐시해도 예전 파일이 보이지 않습니다.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
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

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const mirror = {};
let skipped = 0;
for (const top of ['g', 'games']) {
  const base = join(root, top);
  if (!existsSync(base)) continue;
  for (const file of walk(base)) {
    const path = relative(root, file).split(sep).join('/');
    const match = path.split('/').pop().match(HASH);
    if (!match || !MEDIA.has(match[2])) continue;
    const data = readFileSync(file);
    if (data.length > MAX_BYTES || createHash('sha256').update(data).digest('hex').slice(0, 24) !== match[1]) { skipped++; continue; }
    mkdirSync(dirname(join(out, path)), { recursive: true });
    cpSync(file, join(out, path));
    mirror[path] = path;
  }
}
const sorted = Object.fromEntries(Object.entries(mirror).sort(([a], [b]) => (a < b ? -1 : 1)));
writeFileSync(join(here, 'src', 'github-mirror.json'), JSON.stringify(sorted));
console.log(`정적 복제 ${Object.keys(sorted).length}개, 해시 불일치로 제외 ${skipped}개`);
