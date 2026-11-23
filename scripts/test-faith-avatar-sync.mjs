import assert from 'node:assert/strict'
import {mkdir,writeFile,rm} from 'node:fs/promises'
import path from 'node:path'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from 'playwright'
const folder='.faith-avatar-sync-smoke'
await mkdir(folder,{recursive:true});await mkdir('test-results/faith-gallery',{recursive:true})
await writeFile(folder+'/index.html','<html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./main.tsx"></script></html>')
await writeFile(folder+'/firebase.ts',`
import {initializeApp} from 'firebase/app'
import {getAuth,connectAuthEmulator,signInAnonymously} from 'firebase/auth'
import {getDatabase,connectDatabaseEmulator} from 'firebase/database'
const app=initializeApp({apiKey:'demo-key',projectId:'demo-moa',authDomain:'localhost',databaseURL:'http://127.0.0.1:9000?ns=demo-moa-default-rtdb'})
const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true})
const db=getDatabase(app);connectDatabaseEmulator(db,'127.0.0.1',9000)
export const getRealtimeDb=()=>db;export const getFaithDb=()=>db
export async function login(){await signInAnonymously(auth);window.ownerUid=auth.currentUser.uid;return{uid:auth.currentUser.uid,displayName:'작성자'}}
`)
await writeFile(folder+'/main.tsx',`
import React,{useState,useEffect} from 'react'
import {createRoot} from 'react-dom/client'
import '../src/index.css'
import '../src/apps/meditation/FaithSocial.css'
import '../src/apps/meditation/PixelAvatar.css'
import '../src/apps/meditation/SanctuaryCommunity.css'
import {ProfileAvatarCard} from '../src/apps/meditation/ProfileAvatarCard'
import {SyncedAuthorAvatar,useFeedAuthorAvatars,FeedAuthorAvatar} from '../src/apps/meditation/FeedAuthor'
import {login} from './firebase'
function App(){const [member,setMember]=useState(null),uid=new URLSearchParams(location.search).get('uid');useEffect(()=>{if(!uid)login().then(setMember)},[]);return <main className="faith-social" style={{padding:24}}>{uid?<><h1>비로그인 독자의 작성자 아바타</h1><div id="guest-avatar" style={{width:68,height:68}}><SyncedAuthorAvatar uid={uid} name="작성자"/></div></>:<><ProfileAvatarCard member={member}/>{member&&<div id="owner-feed-avatar" style={{width:36,height:36}}><SyncedAuthorAvatar uid={member.uid} name="작성자"/></div>}</>}</main>}
createRoot(document.getElementById('root')).render(<App/>);
`)
const server=await createServer({configFile:false,root:process.cwd(),plugins:[react()],resolve:{alias:[{find:'../../services/firebase',replacement:path.resolve(folder+'/firebase.ts')},{find:'../../services/faithSession',replacement:path.resolve(folder+'/firebase.ts')}]},server:{host:'127.0.0.1',port:4188,strictPort:true}})
await server.listen();const browser=await chromium.launch({headless:true,...(process.env.MOA_BROWSER_PATH?{executablePath:process.env.MOA_BROWSER_PATH}:{channel:'chrome'})}),errors=[]
const ownerContext=await browser.newContext({viewport:{width:390,height:850}}),guestContext=await browser.newContext({viewport:{width:390,height:850}})
try{
 const owner=await ownerContext.newPage(),guest=await guestContext.newPage();for(const p of [owner,guest])p.on('pageerror',e=>errors.push(e.message))
 const url='http://127.0.0.1:4188/'+folder+'/index.html'
 await owner.goto(url);await owner.getByRole('button',{name:'아바타 편집'}).waitFor()
 const uid=await owner.evaluate(()=>window.ownerUid)
 await guest.goto(url+'?uid='+uid)
 await owner.getByRole('button',{name:'아바타 편집'}).click()
 await owner.getByRole('tab',{name:'여성',exact:true}).click()
 await owner.getByRole('button',{name:'라벤더 샘플 선택'}).click()
 const preview=owner.locator('.sanctuary-avatar-turntable .pixel-avatar')
 const appearance=()=>preview.evaluate(el=>[el.dataset.gender,el.dataset.hairStyle,el.dataset.topStyle,el.dataset.accessory,...['skin','hair','shirt','pants'].map(key=>el.style.getPropertyValue('--avatar-'+key))])
 const name=await owner.getByRole('textbox',{name:'캐릭터 이름'}).inputValue()
 let previous=await appearance()
 for(let i=0;i<3;i++){
  await owner.getByRole('button',{name:'아바타 랜덤 생성'}).click()
  const next=await appearance();assert.notDeepEqual(next,previous,'every reroll changes the visible appearance');assert.equal(next[0],'female');previous=next
 }
 assert.equal(await owner.getByRole('textbox',{name:'캐릭터 이름'}).inputValue(),name,'random appearance never changes the entered name')
 await owner.screenshot({path:'test-results/faith-gallery/avatar-random-mobile.png'})

 await owner.getByRole('button',{name:'캐릭터 저장',exact:true}).click()
 for(const p of [owner,guest])await p.waitForFunction(()=>document.querySelector('#guest-avatar .pixel-avatar,#owner-feed-avatar .pixel-avatar')?.dataset.gender==='female')
 assert.equal(await owner.getByRole('img',{name:'프로필의 내 아바타'}).getAttribute('data-gender'),'female')
 const fingerprint=p=>p.locator('#guest-avatar .pixel-avatar,#owner-feed-avatar .pixel-avatar').evaluate(el=>[el.dataset.gender,el.dataset.hairStyle,el.style.getPropertyValue('--avatar-shirt'),el.style.getPropertyValue('--avatar-hair')])
 assert.deepEqual(await fingerprint(owner),await fingerprint(guest),'guest feed uses the same current appearance as the owner')
 await guest.screenshot({path:'test-results/faith-gallery/guest-synced-avatar.png'})
 await owner.getByRole('button',{name:'아바타 편집'}).click();await owner.getByRole('tab',{name:'남성',exact:true}).click();await owner.getByRole('button',{name:/샘플 선택/}).first().click();await owner.getByRole('button',{name:'캐릭터 저장',exact:true}).click()
 await guest.waitForFunction(()=>document.querySelector('#guest-avatar .pixel-avatar')?.dataset.gender==='male')
 assert.deepEqual(await fingerprint(owner),await fingerprint(guest),'another profile edit appears without reload')
 await guest.reload();await guest.waitForFunction(()=>document.querySelector('#guest-avatar .pixel-avatar')?.dataset.gender==='male')
 assert.equal(await guest.locator('#guest-avatar img').count(),0,'old profile photographs are never used')
 assert.deepEqual(errors,[])
 console.log('Avatar synchronization: canonical profile edits propagate live to own feed and an unauthenticated reader, and survive guest reload.')
}finally{await ownerContext.close();await guestContext.close();await browser.close();await server.close();await rm(folder,{recursive:true,force:true})}
