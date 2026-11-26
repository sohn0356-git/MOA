import assert from 'node:assert/strict'
const base='http://127.0.0.1:9000',ns='demo-moa-default-rtdb'
function token(uid){const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000);return enc({alg:'none',typ:'JWT'})+'.'+enc({sub:uid,user_id:uid,aud:'demo-moa',iss:'https://securetoken.google.com/demo-moa',iat:now,exp:now+3600,firebase:{identities:{},sign_in_provider:'custom'}})+'.'}
async function check(ok,path,method,data,uid='alice'){const url=new URL(base+'/'+path+'.json');url.searchParams.set('ns',ns);if(uid)url.searchParams.set('auth',token(uid));const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})}),body=await r.text();assert.equal(r.status,ok?200:401,path+': '+body);return JSON.parse(body)}
const path='faithReminders/alice',alarm={enabled:true,time:'07:00',timezone:'Asia/Seoul',days:{1:true,3:true,5:true}},data={version:2,enabled:true,schedules:{morning:alarm,night:{...alarm,time:'21:30',days:{0:true,6:true}}},updatedAt:{'.sv':'timestamp'}}
await check(false,path,'PUT',data,null);await check(false,path,'PUT',data,'bob');await check(true,path,'PUT',data)
await check(false,path,'GET',undefined,'bob');assert.equal((await check(true,path,'GET')).schedules.morning.time,'07:00')
await check(false,path+'/schedules/morning/time','PUT','24:30')
await check(false,path+'/schedules/morning/days','PUT',{})
await check(false,path+'/schedules/morning/days','PUT',{7:true})
await check(false,path+'/schedules/morning/days','PUT',{1:false})
await check(false,path+'/schedules/morning/hack','PUT','anything')
await check(false,path+'/schedules/morning/enabled','PUT','true')
await check(true,path+'/schedules/morning/days','PUT',{0:true,1:true,2:true,3:true,4:true,5:true,6:true})
await check(true,path+'/schedules/night','DELETE')
await check(true,path+'/enabled','PUT',false)
const saved=await check(true,path,'GET');assert.equal(saved.enabled,false);assert.equal(saved.schedules.morning.time,'07:00');assert.equal(saved.schedules.night,undefined)
await check(true,path+'/schedules/morning','DELETE')
assert.equal((await check(true,path,'GET')).version,2,'deleting the final alarm must preserve the no-recreate marker')
await check(false,'faithPushSubscriptions/alice','PUT',{endpoint:'fake'})
console.log('Reminder rules: private owner writes, multiple schedules, valid time/day maps, independent deletion/toggle and version marker preservation passed.')
