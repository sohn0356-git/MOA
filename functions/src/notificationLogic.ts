export type ReminderSchedule={enabled:boolean;time:string;timezone:string}
export function validSchedule(raw:unknown):ReminderSchedule{
 const value=raw as Partial<ReminderSchedule>|null
 if(!value||typeof value.enabled!=='boolean'||typeof value.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)||typeof value.timezone!=='string'||value.timezone.length>80)throw new Error('올바른 알림 시간과 시간대를 선택해주세요.')
 new Intl.DateTimeFormat('en',{timeZone:value.timezone}).format()
 return {enabled:value.enabled,time:value.time,timezone:value.timezone}
}
export function reminderDay(schedule:ReminderSchedule,now:Date):string|null{
 if(!schedule.enabled)return null
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:schedule.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]))
 return `${p.hour}:${p.minute}`===schedule.time?`${p.year}-${p.month}-${p.day}`:null
}
export function validSubscription(raw:unknown){
 const s=raw as {endpoint?:unknown;keys?:{p256dh?:unknown;auth?:unknown}}|null
 if(!s||typeof s.endpoint!=='string'||s.endpoint.length>4096)throw new Error('알림 구독 정보가 올바르지 않습니다.')
 const url=new URL(s.endpoint)
 if(url.protocol!=='https:'||url.port||url.username||url.password||!['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(url.hostname)&&!url.hostname.endsWith('.push.services.mozilla.com')&&!url.hostname.endsWith('.notify.windows.com'))throw new Error('지원하지 않는 푸시 서비스입니다.')
 if(typeof s.keys?.p256dh!=='string'||!/^[A-Za-z0-9_-]{80,150}$/.test(s.keys.p256dh)||typeof s.keys?.auth!=='string'||! /^[A-Za-z0-9_-]{16,40}$/.test(s.keys.auth))throw new Error('알림 암호화 키가 올바르지 않습니다.')
 return {endpoint:s.endpoint,keys:{p256dh:s.keys.p256dh,auth:s.keys.auth}}
}
