import {applicationDefault,initializeApp} from 'firebase-admin/app'
import {getDatabaseWithUrl} from 'firebase-admin/database'
const project=process.env.FIREBASE_PROJECT_ID,credential=applicationDefault(),{access_token:token}=await credential.getAccessToken()
const url=`https://cloudscheduler.googleapis.com/v1/projects/${project}/locations/us-central1/jobs/firebase-schedule-faithDailyReminders-us-central1`,response=await fetch(url,{headers:{Authorization:'Bearer '+token}}),job=await response.json()
if(!response.ok||job.state!=='ENABLED')throw Error('The reminder schedule is not active; settings will remain disabled.')
initializeApp({credential,projectId:project})
await getDatabaseWithUrl(`https://${project}-default-rtdb.firebaseio.com`).ref('_faithNotificationsReady').set(true)
console.log('Scheduled reminder job verified; reminder settings are ready.')
