import assert from 'node:assert/strict'
const ns='demo-moa-default-rtdb',base='http://127.0.0.1:9000'
function token(uid){const e=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000);return e({alg:'none',typ:'JWT'})+'.'+e({sub:uid,user_id:uid,aud:'demo-moa',iss:'https://securetoken.google.com/demo-moa',iat:now,exp:now+3600,firebase:{identities:{},sign_in_provider:'custom'}})+'.'}
async function request(path,method,data,uid){const url=new URL(base+'/'+path+'.json');url.searchParams.set('ns',ns);if(uid)url.searchParams.set('auth',token(uid));return fetch(url,{method,headers:{'Content-Type':'application/json',...(!uid?{Authorization:'Bearer owner'}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})})}
async function check(ok,path,method,data,uid){const r=await request(path,method,data,uid),body=await r.text();assert.equal(r.status,ok?200:401,path+': '+body);return JSON.parse(body)}
const source='users/image-owner/meditationEntries/image-entry',post='devotion_image-owner_image-entry',share='crossPhotos/'+post,image='data:image/png;base64,AAAA',next='data:image/png;base64,BBBB',stamp={'.sv':'timestamp'}
await check(true,source,'PUT',{authorUid:'image-owner',authorName:'작성자',audience:'public',mind:'원래 본문',crossImage:image,createdAt:'2026-11-26T00:00:00Z'})
await check(true,share,'PUT',{ownerUid:'image-owner',authorUid:'image-owner',sourceType:'devotion',sourceEntryId:'image-entry',imageUrl:image})
const id='image:'+post+':upload',path='faithNotifications/image-owner/'+id,notice={kind:'image',ownerUid:'image-owner',actorUid:'ai02',actorName:'AI 02',targetId:post,entryId:'image-entry',sourceId:'upload',title:'묵상 사진이 도착했어요',body:'AI가 내 묵상에 사진을 담았어요.',createdAt:stamp}
const changes={[source+'/crossImage']:next,[share+'/imageUrl']:next,[path]:notice}
await check(false,path,'PUT',notice,'ai02')
await check(false,'','PATCH',changes,'regular')
await check(false,'','PATCH',{...changes,[path]:{...notice,actorUid:'ai03'}},'ai02')
await check(false,'','PATCH',{[source+'/crossImage']:next,[path]:notice},'ai02')
await check(false,'','PATCH',{...changes,[path]:{...notice,body:'가짜 알림'}},'ai02')
assert.equal((await check(true,source,'GET',undefined,'image-owner')).crossImage,image,'failed notice must not partially save the photo')
await check(true,'','PATCH',changes,'ai02')
assert.equal((await check(true,source,'GET',undefined,'image-owner')).crossImage,next)
assert.equal((await check(true,path,'GET',undefined,'image-owner')).entryId,'image-entry')
await check(false,'faithNotifications/image-owner','GET',undefined,'regular')
await check(false,path,'PUT',notice,'ai02')
await check(false,'','PATCH',{[path+'-fake']:{...notice,sourceId:'upload-fake'}},'ai02')
await check(true,'users/image-owner/activityNotificationReads/'+id,'PUT',stamp,'image-owner')
await check(false,'users/image-owner/activityNotificationReads/'+id,'GET',undefined,'ai02')
const firstEntry='empty-image-entry',firstPost='devotion_image-owner_'+firstEntry,firstSource='users/image-owner/meditationEntries/'+firstEntry
await check(true,firstSource,'PUT',{authorUid:'image-owner',authorName:'작성자',audience:'public',mind:'사진 없는 글',createdAt:'2026-11-26T00:00:00Z'})
await check(true,'crossPhotos/'+firstPost,'PUT',{ownerUid:'image-owner',authorUid:'image-owner',sourceType:'devotion',sourceEntryId:firstEntry,imageUrl:''})
const firstPath='faithNotifications/image-owner/image:'+firstPost+':first'
await check(true,'','PATCH',{[firstSource+'/crossImage']:next,['crossPhotos/'+firstPost+'/imageUrl']:next,[firstPath]:{...notice,targetId:firstPost,entryId:firstEntry,sourceId:'first'}},'ai02')
assert.equal((await check(true,firstPath,'GET',undefined,'image-owner')).entryId,firstEntry)
await check(false,'','PATCH',{[firstSource+'/crossImage']:'',['crossPhotos/'+firstPost+'/imageUrl']:'',['faithNotifications/image-owner/image:'+firstPost+':remove']:{...notice,targetId:firstPost,entryId:firstEntry,sourceId:'remove'}},'ai02')
console.log('AI image notice: atomic original/public image plus owner receipt, AI-only changed-image proof, no forged/unchanged/deletion notifications, immutable event and private read status passed.')
