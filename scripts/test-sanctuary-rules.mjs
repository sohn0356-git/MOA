import assert from 'node:assert/strict'
const base='http://127.0.0.1:9000',ns='demo-moa-default-rtdb'
function token(uid){const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000);return enc({alg:'none',typ:'JWT'})+'.'+enc({sub:uid,user_id:uid,aud:'demo-moa',iss:'https://securetoken.google.com/demo-moa',iat:now,exp:now+3600,firebase:{identities:{},sign_in_provider:'custom'}})+'.'}
async function request(path,method,data,uid='room-alice'){const url=new URL(base+'/'+path+'.json');url.searchParams.set('ns',ns);if(uid)url.searchParams.set('auth',token(uid));return fetch(url,{method,headers:{'content-type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})})}
async function check(ok,path,method,data,uid){const r=await request(path,method,data,uid);assert.equal(r.status,ok?200:401,path+': '+await r.text())}
const stamp={'.sv':'timestamp'},profile={name:'하늘',skin:1,hair:2,shirt:3},presence={...profile,x:0,z:.9,facing:0,moving:false,updatedAt:stamp}
await check(false,'sanctuary','GET',undefined,null)
await check(true,'sanctuary/avatars/room-alice','PUT',profile)
await check(false,'sanctuary/avatars/room-alice','PUT',profile,'room-bob')
await check(false,'sanctuary/avatars/room-alice','PUT',{...profile,shirt:9})
await check(false,'sanctuary/avatars/room-alice','PUT',{...profile,shirt:.5})
await check(true,'sanctuary/presence/room-alice/tab-a','PUT',presence)
await check(true,'sanctuary/presence/room-alice/tab-b','PUT',presence)
await check(true,'sanctuary/presence','GET',undefined,'room-bob')
await check(false,'sanctuary/presence/room-alice/tab-a','DELETE',undefined,'room-bob')
await check(false,'sanctuary/presence/room-alice/tab-a','PUT',{...presence,x:999})
await check(false,'sanctuary/presence/room-alice/tab-a','PUT',{...presence,updatedAt:1})
await check(true,'sanctuary/presence/room-alice/tab-a','DELETE')
await check(true,'sanctuary/visits/room-alice','PUT',stamp)
await check(true,'sanctuary/visits/room-alice','PUT',stamp)
await check(false,'sanctuary/visits/room-bob','PUT',stamp)
await check(false,'sanctuary/visits/room-alice','PUT',1)
const prayer={uid:'room-alice',name:'하늘',title:'가족을 위해',body:'평안을 주세요',createdAt:stamp,updatedAt:stamp,answered:false}
await check(true,'sanctuary/prayers/rule-prayer','PUT',prayer)
const saved=await (await request('sanctuary/prayers/rule-prayer','GET')).json()
await check(true,'sanctuary/prayers','GET',undefined,'room-bob')
await check(false,'sanctuary/prayers/rule-prayer','PATCH',{body:'다른 사람 수정',updatedAt:stamp},'room-bob')
await check(false,'sanctuary/prayers/rule-prayer','DELETE',undefined,'room-bob')
await check(false,'sanctuary/prayers/spoof','PUT',prayer,'room-bob')
await check(true,'sanctuary/prayers/rule-prayer','PATCH',{body:'수정된 기도',updatedAt:stamp})
await check(false,'sanctuary/prayers/rule-prayer','PATCH',{createdAt:1,updatedAt:stamp})
await check(true,'sanctuary/intercessions/rule-prayer/room-bob','PUT',{at:stamp},'room-bob')
await check(false,'sanctuary/intercessions/rule-prayer/room-bob','PUT',{at:stamp},'room-bob')
await check(false,'sanctuary/intercessions/rule-prayer/room-alice','PUT',{at:stamp},'room-bob')
await check(false,'sanctuary/intercessions/missing/room-bob','PUT',{at:stamp},'room-bob')
await check(true,'sanctuary/prayers/rule-prayer','PATCH',{answered:true,updatedAt:stamp})
await check(false,'sanctuary/intercessions/rule-prayer/room-alice','PUT',{at:stamp})
await check(true,'sanctuary/prayers/rule-prayer','DELETE')
console.log('Sanctuary rules: authenticated reads, own avatar/presence/visits, author-only prayers, immutable creation time and one intercession per identity passed.')
