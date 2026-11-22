import assert from 'node:assert/strict'
import {deployStorageRules} from '../functions/scripts/deploy-storage-rules.mjs'
const config={projectId:'demo-moa',bucket:'demo-moa.appspot.com',source:'rules'}
for(const exists of [true,false]){
 const calls=[]
 const request=async(url,method,body)=>{calls.push({url,method,body});if(url.endsWith('/rulesets'))return{name:'projects/demo-moa/rulesets/new'};if(method==='PATCH'&&!exists)throw Object.assign(new Error('not found'),{status:404});return{rulesetName:'projects/demo-moa/rulesets/new'}}
 await deployStorageRules({...config,request})
 assert.deepEqual(calls[0].body,{source:{files:[{name:'storage.rules',content:'rules'}]}})
 assert.ok(calls.some(c=>c.method==='PATCH'&&c.body.release.rulesetName==='projects/demo-moa/rulesets/new'))
 assert.equal(calls.filter(c=>c.method==='POST'&&c.url.endsWith('/releases')).length,exists?0:1)
 assert.equal(calls.at(-1).method,'GET')
}
const calls=[]
await assert.rejects(deployStorageRules({...config,request:async(url,method)=>{calls.push(method);if(method==='POST')return{name:'projects/demo-moa/rulesets/new'};throw Object.assign(new Error('denied'),{status:403})}}),/denied/)
assert.deepEqual(calls,['POST','PATCH'],'permission denials are preserved, never retried as creation')
await assert.rejects(deployStorageRules({...config,request:async(_url,method)=>method==='POST'?{name:'projects/demo-moa/rulesets/new'}:{rulesetName:'wrong'}}),/verification/)
console.log('Storage deployment: existing/new releases, exact source, active release verification and permission denial handling passed.')
