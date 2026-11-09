export function githubConfig(env) {
  const repository=env.GITHUB_REPOSITORY||'';
  const branch=env.GITHUB_BRANCH||'main';
  if(!/^[\w.-]+\/[\w.-]+$/.test(repository)||!branch||/[\x00-\x1f]/.test(branch))return null;
  return {repository,branch,url:`https://github.com/${repository}`,upload_url:`https://github.com/${repository}/upload/${encodeURIComponent(branch)}`};
}
export function githubPath(value,env) {
  const config=githubConfig(env);if(!config)throw Error('GitHub 저장소가 연결되지 않았습니다.');
  let path=String(value||'').trim();
  if(/^https?:\/\//i.test(path)){
    const url=new URL(path),prefix=`/${config.repository}/blob/${encodeURIComponent(config.branch)}/`;
    if(url.origin!=='https://github.com'||!url.pathname.startsWith(prefix))throw Error('연결된 GitHub 저장소의 파일 주소를 입력해 주세요.');
    path=url.pathname.slice(prefix.length);
  }
  try{path=decodeURIComponent(path);}catch{throw Error('파일 경로가 올바르지 않습니다.');}
  if(!path||path.length>240||/[\\\x00-\x1f?#]/.test(path)||path.split('/').some(p=>!p||p==='.'||p==='..')||path.startsWith('.git/'))throw Error('게임 파일 경로가 올바르지 않습니다.');
  return path;
}
export function githubRawUrl(env,path) {
  const {repository,branch}=githubConfig(env)||{};
  if(!repository)throw Error('GitHub 연결이 없습니다.');
  const safe=githubPath(path,env);
  return `https://raw.githubusercontent.com/${repository}/${encodeURIComponent(branch)}/${safe.split('/').map(encodeURIComponent).join('/')}?gc=${Math.floor(Date.now()/60000)}`;
}
