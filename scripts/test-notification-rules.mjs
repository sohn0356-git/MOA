import assert from 'node:assert/strict'
const base='http://127.0.0.1:9000',ns='demo-moa-default-rtdb'
function token(uid){const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000);return enc({alg:'none',typ:'JWT'})+'.'+enc({sub:uid,user_id:uid,aud:'demo-moa',iss:'https://securetoken.google.com/demo-moa',iat:now,exp:now+3600,firebase:{identities:{},sign_in_provider:'custom'}})+'.'}
async function request(path,method,data,uid='alice',admin=false){const url=new URL(base+'/'+path+'.json');url.searchParams.set('ns',ns);if(uid&&!admin)url.searchParams.set('auth',token(uid));return fetch(url,{method,headers:{'Content-Type':'application/json',...(admin?{Authorization:'Bearer owner'}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})})}
async function check(ok,path,method,data,uid,admin){const r=await request(path,method,data,uid,admin),body=await r.text();assert.equal(r.status,ok?200:401,path+': '+body);return JSON.parse(body)}
const stamp={'.sv':'timestamp'},post='source-proof-post',comment='source-proof-comment'
await check(true,'crossPhotos/'+post,'PUT',{ownerUid:'alice',authorUid:'eve',sourceType:'devotion'},null,true)
await check(true,'crossPhotoComments/'+post+'/'+comment,'PUT',{authorUid:'bob',authorName:'Bob',body:'댓글'},'bob')
const notice={kind:'comment',ownerUid:'alice',actorUid:'bob',actorName:'Bob',targetId:post,sourceId:comment,title:'묵상에 댓글이 달렸어요',body:'내 묵상에 댓글을 남겼어요.',createdAt:stamp},path='faithNotifications/alice/comment:'+post+':'+comment
await check(false,path,'PUT',notice,null)
await check(false,path,'PUT',notice,'eve')
await check(false,path,'PUT',{...notice,targetId:'missing'},'bob')
await check(false,path,'PUT',{...notice,actorUid:'eve'},'bob')
await check(false,path,'PUT',{...notice,body:'관리자를 사칭하는 알림'},'bob')
await check(false,path,'PUT',{...notice,createdAt:1},'bob')
await check(false,path+'-spam','PUT',notice,'bob')
await check(true,path,'GET',undefined,'bob')
await check(true,path,'PUT',notice,'bob')
await check(true,path,'GET',undefined,'alice')
await check(true,path,'GET',undefined,'bob')
await check(false,'faithNotifications/alice','GET',undefined,'bob')
await check(false,path,'GET',undefined,'eve')
await check(false,path,'PUT',notice,'bob')
await check(false,path+'/readAt','PUT',stamp,'alice')
await check(true,'users/alice/activityNotificationReads/'+path.split('/').at(-1),'PUT',stamp,'alice')
await check(false,'users/alice/activityNotificationReads','GET',undefined,'bob')
await check(false,path+'/readAt','PUT',stamp,'bob')
await check(false,path+'/body','PUT','변조','alice')
await check(false,'faithNotifications/eve/comment:'+post+':'+comment,'PUT',{...notice,ownerUid:'eve'},'bob')
await check(false,'crossPhotoComments/'+post+'/'+comment+'/authorUid','PUT','eve','bob')
const like={...notice,kind:'like',sourceId:'bob',title:'묵상에 좋아요가 달렸어요',body:'내 묵상에 마음을 남겼어요.'},likePath='faithNotifications/alice/like:'+post+':bob'
await check(false,likePath,'PUT',like,'bob');await check(true,'crossPhotoReactions/'+post+'/bob','PUT',true,'bob');await check(true,likePath,'PUT',like,'bob')
await check(true,'sanctuary/prayers/source-proof-prayer','PUT',{uid:'alice',name:'Alice',title:'기도',body:'중보해요',createdAt:Date.now(),updatedAt:Date.now(),answered:false},null,true)
const prayer={...notice,kind:'intercession',targetId:'source-proof-prayer',sourceId:'bob',title:'함께 기도하는 마음이 도착했어요',body:'내 기도제목을 위해 함께 기도했어요.'},prayerPath='faithNotifications/alice/intercession:source-proof-prayer:bob'
await check(false,prayerPath,'PUT',prayer,'bob');await check(true,'sanctuary/intercessions/source-proof-prayer/bob','PUT',{at:stamp},'bob');await check(true,prayerPath,'PUT',prayer,'bob')
await check(false,'faithReminders/alice','PUT',{enabled:true,time:'07:00',timezone:'Asia/Seoul'},'alice')
await check(false,'_faithPushKeys','GET',undefined,'alice');await check(false,'faithPushSubscriptions/alice','GET',undefined,'alice')
await check(true,'faithNotifications/alice/reminder-test','PUT',{kind:'reminder',actorUid:'',actorName:'MOA',title:'묵상 시간',body:'기도해요',targetId:'devotion',createdAt:Date.now()},null,true)
await check(true,'users/alice/activityNotificationReads/reminder-test','PUT',stamp,'alice')
console.log('Notification rules: proof of source action, unique immutable event IDs, owner resolution, no forged/duplicate/self messages, private inbox, readable own sent receipt, recipient-only read marking, reminder protection and comment authorship passed.')
