import assert from 'node:assert/strict'
const ns='demo-moa-default-rtdb'
async function user(){const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});return r.json()}
const [alice,bob,eve]=await Promise.all([user(),user(),user()]);assert.ok(alice.idToken&&bob.idToken)
async function db(path,method='GET',data,auth){const url=new URL('http://127.0.0.1:9000/'+path+'.json');url.searchParams.set('ns',ns);if(auth)url.searchParams.set('auth',auth.idToken);return fetch(url,{method,headers:{'Content-Type':'application/json',...(!auth?{Authorization:'Bearer owner'}:{})},...(data!==undefined?{body:JSON.stringify(data)}:{})})}
async function write(path,data,auth){const r=await db(path,'PUT',data,auth);assert.equal(r.status,200,await r.text())}
async function call(name,data,auth=alice){const r=await fetch('http://127.0.0.1:5001/demo-moa/us-central1/'+name,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth.idToken}:{})},body:JSON.stringify({data})});return {status:r.status,value:await r.json()}}
async function inbox(){return (await db('faithNotifications/'+alice.localId,'GET',undefined,alice)).json()}
async function waitFor(check){const end=Date.now()+20000;while(Date.now()<end){const result=await check();if(result)return result;await new Promise(r=>setTimeout(r,200))}throw Error('Timed out waiting for notification trigger')}
await write('users/'+alice.localId+'/notificationPreferences',{friends:true,chapel:false,activity:false},alice)
const key=await call('faithPushKey',{});assert.equal(key.status,200);assert.ok(key.value.result.publicKey);assert.equal(key.value.result.privateKey,undefined);assert.equal(key.value.result.scheduledReady,false)
assert.equal((await call('configureFaithReminder',{enabled:true,time:'07:00',timezone:'Asia/Seoul'})).status,400,'unverified scheduler must not accept enabled reminders')
await write('_faithNotificationsReady',true)
assert.equal((await call('faithPushKey',{},null)).status,401)
assert.equal((await db('_faithPushKeys','GET',undefined,alice)).status,401)
const schedule={enabled:true,time:'07:00',timezone:'Asia/Seoul',subscription:{endpoint:'https://fcm.googleapis.com/fcm/send/emulator-only',keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}}}
assert.equal((await call('configureFaithReminder',schedule)).status,200)
assert.equal((await db('faithReminders/'+alice.localId,'GET',undefined,bob)).status,401)
assert.equal((await db('faithReminders/'+alice.localId,'PUT',schedule,alice)).status,401)
assert.equal((await call('configureFaithReminder',{...schedule,time:'99:99'})).status,400)
assert.equal((await call('configureFaithReminder',{...schedule,subscription:{...schedule.subscription,endpoint:'https://localhost/private'}})).status,400)
await write('crossPhotos/notice-post',{ownerUid:alice.localId,authorUid:alice.localId,imageUrl:'https://example.test/photo.jpg',createdAt:new Date().toISOString(),sourceType:'devotion'})
await write('sanctuary/avatars/'+bob.localId,{name:'Bob'})
await write('crossPhotoComments/notice-post/comment',{authorUid:bob.localId,authorName:'Bob',body:'함께 나눠요',createdAt:new Date().toISOString()},bob)
await write('crossPhotoReactions/notice-post/'+bob.localId,true,bob)
await write('sanctuary/prayers/notice-prayer',{uid:alice.localId,name:'Alice',title:'함께 기도해요',body:'평안',createdAt:Date.now(),updatedAt:Date.now(),answered:false})
await write('sanctuary/intercessions/notice-prayer/'+bob.localId,{at:{'.sv':'timestamp'}},bob)
const items=await waitFor(async()=>{const data=await inbox();return Object.keys(data||{}).length===3?data:null})
assert.deepEqual(Object.values(items).map(n=>n.kind).sort(),['comment','intercession','like'])
for(const n of Object.values(items))assert.equal(n.actorUid,bob.localId)
assert.equal((await db('faithNotifications/'+alice.localId,'GET',undefined,eve)).status,401)
assert.equal((await db('faithNotifications/'+alice.localId+'/forged','PUT',{kind:'like'},alice)).status,401)
const id=Object.keys(items)[0];await write('users/'+alice.localId+'/activityNotificationReads/'+id,{'.sv':'timestamp'},alice)
assert.equal((await db('faithNotifications/'+alice.localId+'/'+id+'/body','PUT','forged',alice)).status,401)
await write('crossPhotoComments/notice-post/self',{authorUid:alice.localId,authorName:'Alice',body:'내 댓글'},alice)
await write('crossPhotoReactions/notice-post/'+eve.localId,false,eve)
await new Promise(r=>setTimeout(r,1000));assert.equal(Object.keys(await inbox()).length,3,'self actions and false reactions must not notify')
assert.equal((await call('configureFaithReminder',{enabled:false,time:'07:00',timezone:'Asia/Seoul'})).status,200)
assert.equal((await (await db('faithReminders/'+alice.localId,'GET',undefined,alice)).json()).enabled,false)
console.log('Notifications backend: authenticated schedule settings, private keys/inbox, exact recipients for comment/like/intercession, self suppression, read-only messages, SSRF restrictions and disabling reminders passed.')
