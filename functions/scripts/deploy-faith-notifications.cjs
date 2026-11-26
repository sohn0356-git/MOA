const path=require('node:path')
const root=process.env.FIREBASE_CLI_ROOT
if(!root||!process.env.FIREBASE_PROJECT_ID)throw Error('Missing Firebase deployment configuration')
// The deploy identity can publish Firebase resources while being unable to read
// Service Usage metadata. Only omit that optional read on its specific 403;
// real Functions/Build/Scheduler API authorization remains fully enforced.
const api=require(path.join(root,'lib/ensureApiEnabled.js'))
const metadataDenied=error=>/serviceusage\.googleapis\.com/.test(error?.message||'')&&/403/.test(error.message)&&/Permission denied to get service/.test(error.message)
for(const method of ['ensure','check']){
 const original=api[method]
 api[method]=async(...args)=>{try{return await original(...args)}catch(error){if(!metadataDenied(error))throw error;console.warn('Service Usage metadata is unavailable; actual resource APIs will validate availability and deployment permission.');return method==='check'?false:undefined}}
}
const bin=path.join(root,'lib/bin/firebase.js')
process.argv=[process.execPath,bin,'deploy','--project',process.env.FIREBASE_PROJECT_ID,'--only','functions:faithPushKey,functions:configureFaithReminder,functions:faithCommentNotice,functions:faithLikeNotice,functions:faithIntercessionNotice,functions:faithDailyReminders,functions:faithImageNotice','--non-interactive']
require(bin)
