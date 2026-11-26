export type DevotionReminder={id:string;time:string;days:number[];timezone:string;enabled:boolean}
export type ReminderPreferences={enabled:boolean;reminders:DevotionReminder[]}
export const ALL_REMINDER_DAYS=[0,1,2,3,4,5,6]
export const REMINDER_DAY_LABELS=['일','월','화','수','목','금','토']
export function reminderDaysLabel(days:number[]){return days.length===7?'매일':ALL_REMINDER_DAYS.filter(day=>days.includes(day)).map(day=>REMINDER_DAY_LABELS[day]).join('·')}
export function validReminderTime(time:string){return /^([01]\d|2[0-3]):[0-5]\d$/.test(time)}
export function parseReminderPreferences(raw:unknown):ReminderPreferences{
 const value=raw as {version?:number;enabled?:boolean;time?:string;timezone?:string;schedules?:Record<string,{enabled?:boolean;time?:string;timezone?:string;days?:Record<string,boolean>}>}|null
 if(!value)return{enabled:false,reminders:[]}
 if(value.version!==2)return{enabled:value.enabled===true,reminders:validReminderTime(value.time||'')?[{id:'legacy',enabled:true,time:value.time!,timezone:value.timezone||'Asia/Seoul',days:[...ALL_REMINDER_DAYS]}]:[]}
 return {enabled:value.enabled===true,reminders:Object.entries(value.schedules||{}).map(([id,row])=>({id,time:row.time||'',timezone:row.timezone||'Asia/Seoul',enabled:row.enabled===true,days:ALL_REMINDER_DAYS.filter(day=>row.days?.[day]===true)})).filter(row=>validReminderTime(row.time)&&row.days.length>0).sort((a,b)=>a.time.localeCompare(b.time)||a.id.localeCompare(b.id))}
}
export function serializeReminders(value:ReminderPreferences){return{version:2,enabled:value.enabled,schedules:Object.fromEntries(value.reminders.map(({id,...row})=>[id,{...row,days:Object.fromEntries(row.days.map(day=>[day,true]))}]))}}
export function dueReminderKey(reminder:DevotionReminder,now:Date):string|null{
 if(!reminder.enabled)return null
 try{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:reminder.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',weekday:'short',hourCycle:'h23'}).formatToParts(now).map(part=>[part.type,part.value]));const day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday)
 return reminder.days.includes(day)&&`${p.hour}:${p.minute}`===reminder.time?`${reminder.id}:${p.year}-${p.month}-${p.day}:${reminder.time}`:null}catch{return null}
}
