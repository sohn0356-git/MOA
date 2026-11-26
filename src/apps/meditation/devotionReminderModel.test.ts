import {expect,it} from 'vitest'
import {ALL_REMINDER_DAYS,dueReminderKey,parseReminderPreferences,reminderDaysLabel,serializeReminders} from './devotionReminderModel'
it('shows daily only for the full week and preserves Sunday-to-Saturday ordering',()=>{
 expect(reminderDaysLabel(ALL_REMINDER_DAYS)).toBe('매일');expect(reminderDaysLabel([5,1,3])).toBe('월·수·금');expect(reminderDaysLabel([0,6])).toBe('일·토')
})
it('preserves legacy daily alarms and round-trips several weekly alarms',()=>{
 const old=parseReminderPreferences({enabled:true,time:'07:00',timezone:'Asia/Seoul'});expect(old.reminders[0].days).toHaveLength(7)
 const value={enabled:true,reminders:[{id:'morning',enabled:true,time:'07:00',timezone:'Asia/Seoul',days:[1,3,5]},{id:'night',enabled:false,time:'21:30',timezone:'Asia/Seoul',days:[0,6]}]}
 expect(parseReminderPreferences(serializeReminders(value))).toEqual(value)
 expect(parseReminderPreferences({version:2,enabled:false})).toEqual({enabled:false,reminders:[]})
})
it('fires only on a chosen local weekday and minute with a distinct key per alarm',()=>{
 const alarm={id:'a',enabled:true,time:'07:00',timezone:'Asia/Seoul',days:[1,3,5]}
 expect(dueReminderKey(alarm,new Date('2026-11-25T22:00:00Z'))).toBeNull()
 expect(dueReminderKey(alarm,new Date('2026-11-26T22:00:00Z'))).toBe('a:2026-11-27:07:00')
 expect(dueReminderKey({...alarm,id:'b'},new Date('2026-11-26T22:00:00Z'))).toBe('b:2026-11-27:07:00')
 expect(dueReminderKey({...alarm,enabled:false},new Date('2026-11-26T22:00:00Z'))).toBeNull()
 expect(dueReminderKey({...alarm,timezone:'invalid'},new Date())).toBeNull()
})
