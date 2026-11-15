import assert from 'node:assert/strict'
import {readFile,readdir,stat,mkdir,writeFile} from 'node:fs/promises'
import {gzipSync} from 'node:zlib'
import path from 'node:path'
const removed=['ai-city','do-list','memo','mini-room','music','sample','suggestions','timer','wedding']
const dirs=await readdir('src/apps')
assert.deepEqual(dirs,['meditation'],'only the Faith app directory remains')
const sync=await readFile('.github/workflows/sync-improvements.yml','utf8')
assert.ok(!sync.includes('sync-ai-city'),'post-deploy cannot invoke retired app synchronization')
const shell=await readFile('src/app/AppShell.tsx','utf8')
assert.ok(!shell.includes('registry')&&!shell.includes('AiCity')&&!shell.includes('AuthGate'),'entry cannot initialize other apps')
const manifest=JSON.parse(await readFile('dist/.vite/manifest.json','utf8'))
for(const [key,value] of Object.entries(manifest)){assert.ok(!removed.some(name=>key.includes('src/apps/'+name+'/')),key);assert.ok(!removed.some(name=>value.file.toLowerCase().includes(name+'app')),value.file)}
const sw=await readFile('dist/sw.js','utf8')
assert.ok(!sw.includes('/fonts/nanum-square-neo/'),'duplicate public fonts are not precached')
assert.ok(sw.includes('MOA_APPLY_UPDATE')&&sw.includes('MOA_UPDATE_SAFETY'),'safe update protocol is preserved')
async function measure(dir){
 const files=[]
 async function visit(folder){for(const name of await readdir(folder)){const full=path.join(folder,name);if((await stat(full)).isDirectory())await visit(full);else if(/\.(js|css)$/.test(name)&&name!=='sw.js')files.push(full)}}
 await visit(dir)
 let raw=0,gzip=0;for(const file of files){const bytes=await readFile(file);raw+=bytes.length;gzip+=gzipSync(bytes).length}
 const html=await readFile(path.join(dir,'index.html'),'utf8'),entry=html.match(/src="[^"]*\/([^/"]+\.js)"/)?.[1]
 const entries=files.filter(p=>path.basename(p)===entry)
 return{raw,gzip,entryRaw:entries.length?(await readFile(entries[0])).length:0,files:files.length}
}
const current=await measure('dist')
const baseline=process.env.MOA_BOOT_BASELINE?await measure(path.join(process.env.MOA_BOOT_BASELINE,'dist')):null
if(baseline){assert.ok(current.gzip<baseline.gzip,'Faith-only bundle should reduce compressed JS/CSS')}
await mkdir('test-results/faith-boot',{recursive:true})
await writeFile('test-results/faith-boot/bundle-size.json',JSON.stringify({baseline,current,gzipReduction:baseline?1-current.gzip/baseline.gzip:null},null,2))
console.log('Faith-only build passed:',JSON.stringify({baseline,current,gzipReduction:baseline?1-current.gzip/baseline.gzip:null}))
