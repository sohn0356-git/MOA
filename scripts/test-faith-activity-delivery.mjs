import assert from 'node:assert/strict'
import {mkdir,writeFile,rm} from 'node:fs/promises'
import path from 'node:path'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from 'playwright'
const folder='.faith-delivery-smoke'
await mkdir(folder,{recursive:true})
await writeFile(folder+'/index.html','<html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./main.tsx"></script></html>')
await writeFile(folder+'/firebase.ts',`
import {initializeApp} from 'firebase/app';import {getAuth,connectAuthEmulator,signInAnonymously} from 'firebase/auth';import {getDatabase,connectDatabaseEmulator,ref,set,push,serverTimestamp} from 'firebase/database';import {publishFaithActivity} from '../src/apps/meditation/publishFaithActivity'
const app=initializeApp({apiKey:'demo-key',projectId:'demo-moa',authDomain:'localhost',databaseURL:'https://demo-moa-default-rtdb.firebaseio.com'}),auth=getAuth(app),db=getDatabase(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectDatabaseEmulator(db,'127.0.0.1',9000)
export const getFaithDb=()=>db;export const getFaithAuth=()=>auth
export async function login(){await auth.authStateReady();if(!auth.currentUser)await signInAnonymously(auth);window.uid=auth.currentUser.uid;return auth.currentUser.uid}
window.interact=async(kind,owner)=>{const uid=auth.currentUser.uid;let sourceId=uid;if(kind==='comment'){const node=push(ref(db,'crossPhotoComments/post'));sourceId=node.key;await set(node,{authorUid:uid,authorName:'Bob',body:'함께 나눠요',createdAt:new Date().toISOString()})}else if(kind==='like')await set(ref(db,'crossPhotoReactions/post/'+uid),true);else await set(ref(db,'sanctuary/intercessions/prayer/'+uid),{at:serverTimestamp()});await publishFaithActivity({kind,ownerUid:owner,actorUid:uid,actorName:'Bob',targetId:kind==='intercession'?'prayer':'post',sourceId},{db,uid})}
`)
await writeFile(folder+'/main.tsx',`
import React,{useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';import '../src/index.css';import {FaithNotificationCenter} from '../src/apps/meditation/FaithNotificationCenter';import {login} from './firebase'
function App(){const [uid,setUid]=useState('');useEffect(()=>{login().then(setUid)},[]);return uid?<FaithNotificationCenter social={{uid,notices:[],unread:[]}} preferences={{friends:true,chapel:true,activity:true}} onFriends={()=>{}} onOpen={n=>{window.opened=n.kind}}/>:<p>연결 중</p>}createRoot(document.getElementById('root')).render(<App/>);
`)
const server=await createServer({configFile:false,root:process.cwd(),plugins:[react()],resolve:{alias:[{find:'../../services/faithSession',replacement:path.resolve(folder+'/firebase.ts')}]},server:{host:'127.0.0.1',port:4193,strictPort:true}})
await server.listen();const browser=await chromium.launch({headless:true,...(process.env.MOA_BROWSER_PATH?{executablePath:process.env.MOA_BROWSER_PATH}:{channel:'chrome'})}),a=await browser.newContext(),b=await browser.newContext(),errors=[]
const url='http://127.0.0.1:4193/'+folder+'/index.html';let owner=await a.newPage();const actor=await b.newPage()
const handle=page=>page.on('pageerror',e=>errors.push(e.message));handle(owner);handle(actor)
async function seed(path,data){const r=await fetch('http://127.0.0.1:9000/'+path+'.json?ns=demo-moa-default-rtdb',{method:'PUT',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify(data)});assert.equal(r.status,200,await r.text())}
try{
 await Promise.all([owner.goto(url),actor.goto(url)]);await owner.getByRole('button',{name:'알림',exact:true}).waitFor();await actor.getByRole('button',{name:'알림',exact:true}).waitFor();const uid=await owner.evaluate(()=>window.uid)
 await seed('crossPhotos/post',{ownerUid:uid,authorUid:uid,sourceType:'devotion'});await seed('sanctuary/prayers/prayer',{uid,name:'Alice',title:'평안',body:'기도해요',createdAt:Date.now(),updatedAt:Date.now(),answered:false})
 await owner.close();await actor.evaluate(owner=>window.interact('comment',owner),uid);await actor.evaluate(owner=>window.interact('like',owner),uid);await actor.evaluate(owner=>window.interact('intercession',owner),uid)
 owner=await a.newPage();handle(owner);await owner.goto(url);await owner.getByRole('button',{name:'알림 3개',exact:true}).waitFor();assert.equal(await owner.evaluate(()=>window.uid),uid)
 await owner.getByRole('button',{name:'알림 3개',exact:true}).click();assert.equal(await owner.getByText('묵상에 댓글이 달렸어요',{exact:true}).count(),1);assert.equal(await owner.getByText('묵상에 좋아요가 달렸어요',{exact:true}).count(),1);assert.equal(await owner.getByText('함께 기도하는 마음이 도착했어요',{exact:true}).count(),1)
 await owner.getByRole('button',{name:/묵상에 댓글이 달렸어요/}).click();await owner.getByRole('button',{name:'알림 2개',exact:true}).waitFor();await owner.waitForFunction(()=>window.opened==='comment')
 await actor.evaluate(owner=>window.interact('like',owner),uid);await owner.reload();await owner.getByRole('button',{name:'알림 2개',exact:true}).waitFor();await owner.getByRole('button',{name:'알림 2개',exact:true}).click();assert.equal(await owner.getByText('묵상에 좋아요가 달렸어요',{exact:true}).count(),1);assert.deepEqual(errors,[])
 console.log('Two-account client activity: offline recipient receives persisted comment/like/intercession without Functions, exact inbox count, read persistence and idempotent re-delivery passed.')
}finally{await a.close();await b.close();await browser.close();await server.close();await rm(folder,{recursive:true,force:true})}
