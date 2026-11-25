import assert from 'node:assert/strict'
import {mkdir,writeFile,rm} from 'node:fs/promises'
import path from 'node:path'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from 'playwright'
const folder='.faith-questions-smoke'
await mkdir(folder,{recursive:true})
await writeFile(folder+'/index.html','<html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./main.tsx"></script></html>')
await writeFile(folder+'/firebase.ts',`
import {initializeApp} from 'firebase/app';import {getAuth,connectAuthEmulator,signInAnonymously,updateProfile} from 'firebase/auth';import {getDatabase,connectDatabaseEmulator,ref,get} from 'firebase/database';import {getStorage} from 'firebase/storage'
const app=initializeApp({apiKey:'demo-key',projectId:'demo-moa',authDomain:'localhost',storageBucket:'demo-moa.appspot.com',databaseURL:'http://127.0.0.1:9000?ns=demo-moa-default-rtdb'}),auth=getAuth(app),db=getDatabase(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectDatabaseEmulator(db,'127.0.0.1',9000)
export const getFirebaseApp=()=>app;export const getFirebaseConfigError=()=>'';export const getFirebaseAuth=()=>auth;export const getFaithAuth=getFirebaseAuth;export const getRealtimeDb=()=>db;export const getFaithDb=getRealtimeDb;export const getFirebaseStorage=()=>getStorage(app);export const getFaithStorage=getFirebaseStorage
export async function login(){await auth.authStateReady();if(!auth.currentUser)await signInAnonymously(auth);await updateProfile(auth.currentUser,{displayName:new URLSearchParams(location.search).get('name')||'Alice'});window.questionUid=auth.currentUser.uid}
window.readQuestions=async()=>({questions:(await get(ref(db,'faithQuestions'))).val(),answers:(await get(ref(db,'faithQuestionAnswers'))).val()})
`)
await writeFile(folder+'/main.tsx',`
import React,{useEffect,useState} from 'react';import {createRoot} from 'react-dom/client';import '../src/index.css';import {MeditationApp} from '../src/apps/meditation/MeditationApp';import {login} from './firebase'
function App(){const [ready,setReady]=useState(false);useEffect(()=>{login().then(()=>setReady(true))},[]);return ready?<MeditationApp activityId="legacy-activity"/>:<p>연결 중</p>}createRoot(document.getElementById('root')).render(<App/>);
`)
const server=await createServer({configFile:false,root:process.cwd(),plugins:[react()],resolve:{alias:[{find:'../../services/firebase',replacement:path.resolve(folder+'/firebase.ts')},{find:'../../services/faithSession',replacement:path.resolve(folder+'/firebase.ts')}]},server:{host:'127.0.0.1',port:4191,strictPort:true}})
await server.listen();const browser=await chromium.launch({headless:true,...(process.env.MOA_BROWSER_PATH?{executablePath:process.env.MOA_BROWSER_PATH}:{channel:'chrome'})}),errors=[]
const a=await browser.newContext({viewport:{width:390,height:900}}),b=await browser.newContext({viewport:{width:390,height:900}})
const alice=await a.newPage(),bob=await b.newPage(),url='http://127.0.0.1:4191/'+folder+'/index.html'
const tab=page=>page.getByRole('navigation',{name:'MOA',exact:true}).getByRole('button',{name:'질문',exact:true}).click()
for(const page of [alice,bob]){page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept())}
try{
 await Promise.all([alice.goto(url+'?name=Alice'),bob.goto(url+'?name=Bob')]);await tab(alice);await tab(bob)
 await alice.getByRole('button',{name:'질문 작성',exact:true}).click();await alice.getByPlaceholder('궁금한 내용을 한 줄로 적어주세요').fill('기도는 어떻게 시작하나요?');await alice.getByPlaceholder('질문의 상황을 조금 더 알려주세요').fill('매일 기도하며 말씀을 읽고 싶어요.');await alice.getByRole('button',{name:'질문 올리기',exact:true}).click()
 await alice.getByRole('heading',{name:'기도는 어떻게 시작하나요?',exact:true}).waitFor();await bob.getByRole('heading',{name:'기도는 어떻게 시작하나요?',exact:true}).click()
 await bob.getByPlaceholder('답변을 남겨주세요').fill('짧은 감사의 기도로 시작해보세요.');await bob.getByRole('button',{name:'답변 등록',exact:true}).click();await bob.getByText('짧은 감사의 기도로 시작해보세요.',{exact:true}).waitFor()
 const data=await bob.evaluate(()=>window.readQuestions()),[id,q]=Object.entries(data.questions).find(([,q])=>q.title==='기도는 어떻게 시작하나요?'),answer=Object.values(data.answers[id])[0]
 assert.equal(q.authorUid,await alice.evaluate(()=>window.questionUid));assert.equal(answer.authorUid,await bob.evaluate(()=>window.questionUid));assert.equal('activityId' in q,false);assert.equal('activityId' in answer,false)
 await alice.getByRole('heading',{name:'기도는 어떻게 시작하나요?',exact:true}).click();await alice.getByText('짧은 감사의 기도로 시작해보세요.',{exact:true}).waitFor();await alice.getByRole('button',{name:'질문 수정',exact:true}).click();await alice.getByPlaceholder('궁금한 내용을 한 줄로 적어주세요').fill('기도를 시작하는 방법');await alice.getByRole('button',{name:'수정 저장',exact:true}).click();await bob.getByRole('heading',{name:'기도를 시작하는 방법',exact:true}).waitFor()
 await alice.getByRole('button',{name:'질문 삭제',exact:true}).click();await bob.waitForFunction(async id=>{const d=await window.readQuestions();return !d.questions?.[id]&&!d.answers?.[id]},id);assert.deepEqual(errors,[])
 console.log('Real question UI + Auth/DB: publish with legacy activity prop, other-account read/answer, exact stored payloads, owner edit and atomic deletion passed.')
}finally{await a.close();await b.close();await browser.close();await server.close();await rm(folder,{recursive:true,force:true})}
