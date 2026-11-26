import assert from 'node:assert/strict'
import {validSchedule,reminderDay,validSubscription} from '../functions/lib/notificationLogic.js'
const schedule=validSchedule({enabled:true,time:'07:00',timezone:'Asia/Seoul'})
assert.equal(reminderDay(schedule,new Date('2026-11-25T22:00:00Z')),'2026-11-26')
assert.equal(reminderDay(schedule,new Date('2026-11-25T21:59:00Z')),null)
assert.equal(reminderDay({...schedule,enabled:false},new Date('2026-11-25T22:00:00Z')),null)
const usa=validSchedule({enabled:true,time:'07:00',timezone:'America/New_York'})
assert.equal(reminderDay(usa,new Date('2026-07-01T11:00:00Z')),'2026-07-01')
assert.equal(reminderDay(usa,new Date('2026-12-01T12:00:00Z')),'2026-12-01')
for(const value of [{enabled:true,time:'25:00',timezone:'UTC'},{enabled:'true',time:'07:00',timezone:'UTC'},{enabled:true,time:'7:00',timezone:'UTC'},{enabled:true,time:'07:00',timezone:'invalid'}])assert.throws(()=>validSchedule(value))
const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/example',keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}}
assert.deepEqual(validSubscription(subscription),subscription)
for(const endpoint of ['http://fcm.googleapis.com/fcm/send/x','https://localhost/push','https://fcm.googleapis.com.evil.test/push','https://127.0.0.1/push','https://fcm.googleapis.com:9999/push','https://user@fcm.googleapis.com/push'])assert.throws(()=>validSubscription({...subscription,endpoint}))
assert.throws(()=>validSubscription({...subscription,keys:{...subscription.keys,p256dh:'short'}}))
console.log('Notifications: exact local minute, timezone/day rollover, DST, disabled schedules, input validation and push endpoint restrictions passed.')

const weekly=validSchedule({...schedule,days:[1,4]})
assert.equal(reminderDay(weekly,new Date('2026-11-25T22:00:00Z')),'2026-11-26')
assert.equal(reminderDay({...weekly,days:[1]},new Date('2026-11-25T22:00:00Z')),null)
for(const days of [[],[7],[1,1],['4']])assert.throws(()=>validSchedule({...schedule,days}))
