import {applicationDefault} from 'firebase-admin/app'
const project=process.env.FIREBASE_PROJECT_ID,{access_token:token}=await applicationDefault().getAccessToken()
const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'}
const permissions=['cloudfunctions.functions.list','cloudfunctions.functions.create','cloudfunctions.functions.update','cloudfunctions.functions.setIamPolicy','cloudscheduler.jobs.create','serviceusage.services.get','serviceusage.services.enable','iam.serviceAccounts.actAs']
const iam=await fetch(`https://cloudresourcemanager.googleapis.com/v1/projects/${project}:testIamPermissions`,{method:'POST',headers,body:JSON.stringify({permissions})});const iamBody=await iam.json();console.log('Notification deployment permissions:',iam.ok?iamBody.permissions||[]:iamBody.error?.message)
for(const service of ['cloudfunctions','cloudscheduler']){
 const url=service==='cloudfunctions'?`https://cloudfunctions.googleapis.com/v1/projects/${project}/locations/-/functions`:`https://cloudscheduler.googleapis.com/v1/projects/${project}/locations/us-central1/jobs`
 const response=await fetch(url,{headers}),body=await response.json()
 console.log(service+' direct API availability:',response.status,response.ok?'accessible':body.error?.message||'unavailable')
 if(!response.ok&&JSON.stringify(body.error?.details||[]).includes('SERVICE_DISABLED')){
  const enabled=await fetch(`https://serviceusage.googleapis.com/v1/projects/${project}/services/${service}.googleapis.com:enable`,{method:'POST',headers,body:'{}'}),value=await enabled.json()
  console.log(service+' enable attempt:',enabled.status,enabled.ok?'requested':value.error?.message||'unavailable')
 }
}
