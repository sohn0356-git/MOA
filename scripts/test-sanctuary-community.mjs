import assert from 'node:assert/strict'
import {mkdir,writeFile,rm} from 'node:fs/promises'
import path from 'node:path'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from 'playwright'
const folder='.sanctuary-community-smoke'
await mkdir(folder,{recursive:true});await mkdir('test-results/faith-sanctuary',{recursive:true})
await writeFile(folder+'/index.html','<html lang="ko"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="./main.tsx"></script></html>')
await writeFile(folder+'/firebase.ts',`
import {initializeApp} from 'firebase/app'
import {getAuth,connectAuthEmulator,signInAnonymously} from 'firebase/auth'
import {getDatabase,connectDatabaseEmulator,goOffline,goOnline} from 'firebase/database'
const app=initializeApp({apiKey:'demo-key',projectId:'demo-moa',authDomain:'localhost',databaseURL:'http://127.0.0.1:9000?ns=demo-moa-default-rtdb'})
export const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true})
const db=getDatabase(app);connectDatabaseEmulator(db,'127.0.0.1',9000)
export const getRealtimeDb=()=>db
export async function login(){await auth.authStateReady();if(!auth.currentUser)await signInAnonymously(auth);return auth.currentUser!}
Object.assign(window,{roomOffline:()=>goOffline(db),roomOnline:()=>goOnline(db)})
`)
await writeFile(folder+'/main.tsx',`
import React,{useState,useEffect} from 'react'
import {createRoot} from 'react-dom/client'
import '../src/index.css'
import '../src/apps/meditation/FaithSocial.css'
import {SanctuaryTab} from '../src/apps/meditation/SanctuaryTab'
import {login} from './firebase'
function App(){const [member,setMember]=useState<any>(null);useEffect(()=>{login().then(u=>setMember({uid:u.uid,displayName:new URLSearchParams(location.search).get('name')||'방문자'}))},[]);return <main className="faith-screen faith-social" style={{padding:20}}><SanctuaryTab member={member} authBusy={!member} onRead={()=>{}} onPrayer={()=>{}} scripture={{reference:'요한복음 14:27',text:'평안을 너희에게 주노라'}}/></main>}
createRoot(document.getElementById('root')!).render(<App/>)
`)
const server=await createServer({configFile:false,root:process.cwd(),plugins:[react()],resolve:{alias:[{find:'../../services/firebase',replacement:path.resolve(folder+'/firebase.ts')}]},server:{host:'127.0.0.1',port:4182,strictPort:true}})
await server.listen()
const browser=await chromium.launch({headless:true,channel:'chrome'})
const errors=[]
async function ready(page){page.on('pageerror',e=>errors.push(e.message));await page.getByText('실시간 연결',{exact:true}).waitFor()}
const url='http://127.0.0.1:4182/'+folder+'/index.html'
const a=await browser.newContext({viewport:{width:390,height:950},hasTouch:true,isMobile:true}),b=await browser.newContext({viewport:{width:768,height:1000}})
try{
 const alice=await a.newPage();await alice.goto(url+'?name=Alice');await ready(alice)
 const bob=await b.newPage();await bob.goto(url+'?name=Bob');await ready(bob)
 const stats=p=>p.locator('.sanctuary-community-stats strong')
 await alice.waitForFunction(()=>document.querySelectorAll('.sanctuary-community-stats strong')[0]?.textContent==='2')
 await bob.waitForFunction(()=>document.querySelectorAll('.sanctuary-community-stats strong')[0]?.textContent==='2')
 assert.equal(await stats(alice).nth(1).innerText(),'2','distinct Korean-day visitors')
 await alice.locator('.sanctuary-peer').waitFor({state:'attached'})
 await alice.getByRole('button',{name:'캐릭터 만들기'}).click()
 await alice.getByRole('textbox',{name:'캐릭터 이름'}).fill('하늘')
 await alice.getByRole('button',{name:'피부 색상 3'}).click()
 await alice.getByRole('button',{name:'머리 색상 2'}).click()
 await alice.getByRole('button',{name:'옷 색상 2'}).click()
 await alice.getByRole('button',{name:'캐릭터 저장'}).click()
 await bob.locator('.sanctuary-avatar-name',{hasText:'하늘'}).waitFor()
 assert.ok((await bob.locator('.sanctuary-peer .pixel-avatar').getAttribute('style')).includes('#7495b6'),'custom appearance reaches the other account')
 const stick=alice.getByRole('button',{name:'아바타 이동 조이스틱'});await stick.scrollIntoViewIfNeeded()
 const box=await stick.boundingBox();assert.ok(box)
 const before=Number(await alice.locator('.sanctuary-avatar-anchor:not(.sanctuary-peer)').getAttribute('data-avatar-z'))
 const cdp=await a.newCDPSession(alice)
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+47,y:box.y+47}]})
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+47,y:box.y+17}]})
 await new Promise(r=>setTimeout(r,450))
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
 const after=Number(await alice.locator('.sanctuary-avatar-anchor:not(.sanctuary-peer)').getAttribute('data-avatar-z'))
 assert.ok(after<before-.1,'real touch joystick walks forward')
 await new Promise(r=>setTimeout(r,300))
 const stopped=Number(await alice.locator('.sanctuary-avatar-anchor:not(.sanctuary-peer)').getAttribute('data-avatar-z'))
 assert.ok(Math.abs(stopped-after)<.02,'releasing joystick stops movement')
 await bob.waitForFunction(()=>Number(document.querySelector('.sanctuary-peer')?.style.top?.replace('%',''))<88)
 assert.equal(await alice.getByRole('button',{name:'아바타 오른쪽 이동'}).isVisible(),false,'mobile does not show desktop arrows')
 await alice.getByRole('textbox',{name:'공동 기도제목'}).fill('가족의 평안을 위해')
 await alice.getByRole('textbox',{name:'공동 기도 내용'}).fill('서로를 돌보며 지낼 수 있도록 함께 기도해 주세요.')
 await alice.getByRole('button',{name:'기도제목 나누기'}).click()
 const topic=bob.locator('.sanctuary-shared-prayer',{hasText:'가족의 평안을 위해'});await topic.waitFor()
 assert.equal(await topic.getByRole('button',{name:'수정',exact:true}).count(),0)
 await topic.getByRole('button',{name:/함께 기도했어요/}).click()
 await alice.locator('.sanctuary-shared-prayer').getByRole('button',{name:/함께 기도했어요.*1/}).waitFor()
 await alice.locator('.sanctuary-shared-prayer').getByRole('button',{name:'수정',exact:true}).click()
 await alice.getByRole('textbox',{name:'공동 기도 내용'}).fill('수정한 공동의 기도')
 await alice.getByRole('button',{name:'기도제목 수정',exact:true}).click()
 await bob.getByText('수정한 공동의 기도',{exact:true}).waitFor()
 await bob.reload();await ready(bob)
 await bob.locator('.sanctuary-shared-prayer button[aria-pressed=true]').waitFor()
 await alice.getByRole('textbox',{name:'공동 기도제목'}).fill('임시 기도제목')
 await alice.reload();await ready(alice)
 assert.equal(await alice.getByRole('textbox',{name:'공동 기도제목'}).inputValue(),'임시 기도제목')
 await alice.getByRole('button',{name:'캐릭터 수정'}).waitFor()
 const another=await a.newPage();await another.goto(url+'?name=Alice');await ready(another)
 await another.waitForFunction(()=>document.querySelectorAll('.sanctuary-community-stats strong')[0]?.textContent==='2')
 assert.equal(await stats(another).nth(1).innerText(),'2','second tab does not duplicate visitors')
 await another.close()
 await bob.evaluate(()=>window.roomOffline())
 await alice.waitForFunction(()=>document.querySelectorAll('.sanctuary-community-stats strong')[0]?.textContent==='1')
 assert.equal(await alice.locator('.sanctuary-peer').count(),0,'disconnect removes the other avatar')
 assert.equal(await stats(alice).nth(1).innerText(),'2','daily visitors remain after leaving')
 await alice.getByRole('textbox',{name:'공동 기도제목'}).fill('')
 await alice.locator('.sanctuary-shared-prayer').getByRole('button',{name:'응답 표시'}).click()
 await alice.getByText('감사 · 응답',{exact:true}).waitFor()
 await alice.evaluate(()=>scrollTo(0,0))
 assert.ok(await alice.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile has no overflow')
 await alice.screenshot({path:'test-results/faith-sanctuary/community-mobile.png',fullPage:true})
 await bob.evaluate(()=>window.roomOnline());await ready(bob)
 await bob.getByText('감사 · 응답',{exact:true}).waitFor()
 await bob.evaluate(()=>scrollTo(0,0));await bob.screenshot({path:'test-results/faith-sanctuary/community-tablet.png',fullPage:true})
 assert.deepEqual(errors,[])
 console.log('Two real accounts: touch joystick, synced custom avatars/motion, tab-deduplicated online/daily visits, disconnect cleanup, shared prayer edits, unique intercession, draft restore and answered state passed.')
}finally{await a.close();await b.close();await browser.close();await server.close();await rm(folder,{recursive:true,force:true})}
