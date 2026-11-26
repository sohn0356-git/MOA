import {createHash} from 'node:crypto'
import {getDatabaseWithUrl} from 'firebase-admin/database'
import {onCall,HttpsError} from 'firebase-functions/v2/https'
import {onSchedule} from 'firebase-functions/v2/scheduler'
import * as v1 from 'firebase-functions/v1'
import * as webpush from 'web-push'
import {validSchedule,validSubscription,reminderDay,type ReminderSchedule} from './notificationLogic.js'
const database=()=>getDatabaseWithUrl(`https://${process.env.GCLOUD_PROJECT||'moa-gj'}-default-rtdb.firebaseio.com`)
const hash=(value:string)=>createHash('sha256').update(value).digest('hex')
async function pushKeys(){
 const node=database().ref('_faithPushKeys'),current=(await node.get()).val()
 if(current?.publicKey&&current?.privateKey)return current as {publicKey:string;privateKey:string}
 const result=await node.transaction(value=>value||webpush.generateVAPIDKeys())
 return result.snapshot.val() as {publicKey:string;privateKey:string}
}
export const faithPushKey=onCall(async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','로그인 후 설정해주세요.')
 return {publicKey:(await pushKeys()).publicKey,scheduledReady:(await database().ref('_faithNotificationsReady').get()).val()===true}
})
export const configureFaithReminder=onCall(async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','로그인 후 설정해주세요.')
 try{
  const schedule=validSchedule(request.data),uid=request.auth.uid
  if(schedule.enabled&&(await database().ref('_faithNotificationsReady').get()).val()!==true)throw new Error('예약 알림 서버 설정이 아직 완료되지 않았습니다.')
  if(schedule.enabled&&!request.data.subscription)throw new Error('이 기기의 알림을 먼저 허용해주세요.')
  if(request.data.subscription){
   const subscription=validSubscription(request.data.subscription)
   const key=hash(subscription.endpoint),owner=database().ref(`faithPushEndpointOwners/${key}`),previous=(await owner.get()).val()
   await owner.set(uid)
   const changes:Record<string,unknown>={[`faithPushSubscriptions/${uid}/${key}`]:{...subscription,updatedAt:Date.now()}}
   if(typeof previous==='string'&&previous!==uid)changes[`faithPushSubscriptions/${previous}/${key}`]=null
   await database().ref().update(changes)
  }
  await database().ref(`faithReminders/${uid}`).set({...schedule,updatedAt:Date.now()})
  return schedule
 }catch(error){throw new HttpsError('invalid-argument',error instanceof Error?error.message:'설정을 저장하지 못했습니다.')}
})
export type FaithNotice={kind:'comment'|'like'|'intercession'|'reminder'|'image';actorUid:string;actorName:string;title:string;body:string;targetId:string;sourceId?:string;entryId?:string;createdAt:number}
async function sendPush(uid:string,notice:FaithNotice,id:string){
 const db=database(),[preferences,subscriptions]=await Promise.all([db.ref(`users/${uid}/notificationPreferences`).get(),db.ref(`faithPushSubscriptions/${uid}`).get()])
 const prefs=preferences.val()||{}
 if(notice.kind==='intercession'?prefs.chapel===false:notice.kind!=='reminder'&&prefs.activity===false)return
 const keys=await pushKeys()
 await Promise.all(Object.entries(subscriptions.val()||{}).map(async([key,value])=>{
  try{if((await db.ref(`faithPushEndpointOwners/${key}`).get()).val()!==uid)return
   await webpush.sendNotification(value as webpush.PushSubscription,JSON.stringify({title:notice.title,body:notice.body,tag:id,url:'/MOA/'}),{TTL:notice.kind==='reminder'?3600:86400,vapidDetails:{subject:'https://sohn0356-git.github.io/MOA/',...keys}})}catch(error){
   const code=(error as {statusCode?:number}).statusCode
   if(code===404||code===410)await db.ref(`faithPushSubscriptions/${uid}/${key}`).remove()
   else console.error('Faith push delivery failed',{statusCode:code||0})
  }
 }))
}
async function publish(uid:string,eventId:string,notice:FaithNotice){
 if(!uid||uid===notice.actorUid)return
 const id=notice.sourceId?`${notice.kind}:${notice.targetId}:${notice.sourceId}`:hash(eventId),node=database().ref(`faithNotifications/${uid}/${id}`)
 await node.transaction(current=>current?undefined:notice)
 const delivery=await database().ref(`faithNotificationDeliveries/${uid}/${id}`).transaction(current=>current?undefined:{claimedAt:Date.now()})
 if(delivery.committed)await sendPush(uid,notice,id)
}
const dbTrigger=v1.region('us-central1').database.instance(`${process.env.GCLOUD_PROJECT||'moa-gj'}-default-rtdb`)
export const faithCommentNotice=dbTrigger.ref('/crossPhotoComments/{photoId}/{commentId}').onCreate(async(snap,context)=>{
 const value=snap.val(),photo=(await database().ref(`crossPhotos/${context.params.photoId}`).get()).val()
 if(!photo||!value?.authorUid||typeof value.body!=='string'||!value.body.trim())return
 await publish(photo.ownerUid||photo.authorUid,context.eventId,{kind:'comment',actorUid:value.authorUid,actorName:value.authorName||'이웃',title:'묵상에 댓글이 달렸어요',body:`${value.authorName||'이웃'}: ${String(value.body||'').slice(0,100)}`,targetId:context.params.photoId,sourceId:context.params.commentId,createdAt:Date.now()})
})
export const faithLikeNotice=dbTrigger.ref('/crossPhotoReactions/{photoId}/{actorUid}').onCreate(async(snap,context)=>{
 if(snap.val()!==true)return
 const photo=(await database().ref(`crossPhotos/${context.params.photoId}`).get()).val();if(!photo)return
 const actor=(await database().ref(`sanctuary/avatars/${context.params.actorUid}/name`).get()).val()||'이웃'
 await publish(photo.ownerUid||photo.authorUid,context.eventId,{kind:'like',actorUid:context.params.actorUid,actorName:actor,title:'묵상에 좋아요가 달렸어요',body:`${actor}님이 내 묵상에 마음을 남겼어요.`,targetId:context.params.photoId,sourceId:context.params.actorUid,createdAt:Date.now()})
})
export const faithIntercessionNotice=dbTrigger.ref('/sanctuary/intercessions/{prayerId}/{actorUid}').onCreate(async(_snap,context)=>{
 const prayer=(await database().ref(`sanctuary/prayers/${context.params.prayerId}`).get()).val();if(!prayer)return
 const actor=(await database().ref(`sanctuary/avatars/${context.params.actorUid}/name`).get()).val()||'이웃'
 await publish(prayer.uid,context.eventId,{kind:'intercession',actorUid:context.params.actorUid,actorName:actor,title:'함께 기도하는 마음이 도착했어요',body:`${actor}님이 ‘${String(prayer.title).slice(0,60)}’을 위해 중보했어요.`,targetId:context.params.prayerId,sourceId:context.params.actorUid,createdAt:Date.now()})
})
export const faithDailyReminders=onSchedule({schedule:'every 1 minutes',timeZone:'UTC',region:'us-central1',retryCount:2},async event=>{
 const now=new Date(event.scheduleTime||Date.now()),schedules=(await database().ref('faithReminders').get()).val()||{}
 await Promise.all(Object.entries(schedules).map(async([uid,raw])=>{
  try{const schedule=validSchedule(raw) as ReminderSchedule,day=reminderDay(schedule,now);if(!day)return
   await publish(uid,`reminder:${uid}:${day}`,{kind:'reminder',actorUid:'',actorName:'MOA',title:'말씀과 함께 하루를 시작해요',body:'잠시 마음을 가다듬고 오늘의 말씀을 묵상해보세요.',targetId:'devotion',createdAt:now.getTime()})
  }catch{console.error('Invalid faith reminder schedule')}
 }))
})

export const faithImageNotice=dbTrigger.ref('/faithNotifications/{uid}/{noticeId}').onCreate(async(snap,context)=>{
 const notice=snap.val() as FaithNotice
 if(notice?.kind!=='image'||!/^ai(0[1-9]|10)$/.test(notice.actorUid)||!notice.sourceId)return
 await publish(context.params.uid,context.eventId,notice)
})
