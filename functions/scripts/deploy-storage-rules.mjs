import {readFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'

// Deploy through the Rules API itself. Reading Service Usage metadata is not
// required to publish rules to the app's already configured Storage bucket.
export async function deployStorageRules({projectId,bucket,source,request}) {
  if(!projectId||!bucket||!source) throw new Error('Missing Storage rules deployment configuration')
  const base='https://firebaserules.googleapis.com/v1/projects/'+encodeURIComponent(projectId)
  const ruleset=await request(base+'/rulesets','POST',{source:{files:[{name:'storage.rules',content:source}]}})
  if(!ruleset.name?.startsWith('projects/'+projectId+'/rulesets/')) throw new Error('Invalid created ruleset')
  const release={name:'projects/'+projectId+'/releases/firebase.storage/'+bucket,rulesetName:ruleset.name}
  try {await request(base+'/releases/firebase.storage/'+encodeURIComponent(bucket),'PATCH',{release})}
  catch(error){if(error.status!==404)throw error;await request(base+'/releases','POST',release)}
  const current=await request(base+'/releases/firebase.storage/'+encodeURIComponent(bucket),'GET')
  if(current.rulesetName!==ruleset.name)throw new Error('Storage release verification failed')
  return ruleset.name
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const {applicationDefault}=await import('firebase-admin/app')
  const {access_token:token}=await applicationDefault().getAccessToken()
  const request=async(url,method,body)=>{
    const response=await fetch(url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})
    const result=await response.json()
    if(!response.ok){const error=new Error('Storage rules API '+response.status+': '+(result.error?.message||'request failed'));error.status=response.status;throw error}
    return result
  }
  await deployStorageRules({projectId:process.env.FIREBASE_PROJECT_ID,bucket:process.env.FIREBASE_STORAGE_BUCKET,source:await readFile(new URL('../../storage.rules',import.meta.url),'utf8'),request})
  console.log('Storage rules published and active release verified.')
}
