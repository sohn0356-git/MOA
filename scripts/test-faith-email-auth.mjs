import assert from 'node:assert/strict'
import {mkdir,writeFile,rm} from 'node:fs/promises'
import path from 'node:path'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from 'playwright'
const folder='.faith-email-smoke'
await mkdir(folder,{recursive:true});await mkdir('test-results/faith-boot',{recursive:true})
await writeFile(folder+'/index.html','<html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./main.tsx"></script></html>')
await writeFile(folder+'/main.tsx',`import React from 'react';import {createRoot} from 'react-dom/client';import '../src/index.css';import '../src/apps/meditation/SanctuaryCommunity.css';import '../src/apps/meditation/SanctuaryCompact.css';import '../src/apps/meditation/FaithSocial.css';import {AppShell} from '../src/app/AppShell';createRoot(document.getElementById('root')).render(<AppShell/>);`)
await writeFile(folder+'/firebase.ts',`
import {initializeApp} from 'firebase/app';import {getAuth,connectAuthEmulator} from 'firebase/auth'
const auth=getAuth(initializeApp({apiKey:'demo-key',projectId:'demo-moa',authDomain:'localhost'}));connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true})
export const getFirebaseAuth=()=>auth;export const getFirebaseConfigError=()=>null;Object.assign(window,{emailAuth:auth});
`)
await writeFile(folder+'/hooks.ts',`export const useFaithActivity=()=>({activityId:'',isLoading:false,isSwitching:false,error:'',selectActivity:async()=>{},clearActivity:async()=>{window.activityCleared=(window.activityCleared||0)+1}});export const useAppUpdate=()=>({hasUpdate:false,isUpdating:false,applyUpdate:async()=>{},updateError:''})`)
await writeFile(folder+'/meditation.tsx',`import React,{useEffect} from 'react';export function MeditationApp({entryActions,profileActions,churchMember,onChurchSignIn,onStartupState}){useEffect(()=>{onStartupState({owner:churchMember?.uid||'guest',scripture:true,entries:true,feed:true})},[churchMember?.uid,onStartupState]);return <section className="faith-screen faith-social"><header className="faith-header"><h2>MOA</h2>{entryActions}{profileActions}</header><output aria-label="계정">{churchMember?.uid||'guest'}</output><button onClick={onChurchSignIn}>로그인하고 예배당 입장</button></section>}`)
const server=await createServer({configFile:false,root:process.cwd(),plugins:[react()],resolve:{alias:[{find:'../services/firebase',replacement:path.resolve(folder+'/firebase.ts')},{find:'../hooks/useFaithActivity',replacement:path.resolve(folder+'/hooks.ts')},{find:'../hooks/useAppUpdate',replacement:path.resolve(folder+'/hooks.ts')},{find:'../apps/meditation/MeditationApp',replacement:path.resolve(folder+'/meditation.tsx')}]},server:{host:'127.0.0.1',port:4189,strictPort:true}})
await server.listen();const profile=path.resolve(folder+'/browser'),url='http://127.0.0.1:4189/'+folder+'/index.html',errors=[]
let context,page
async function open(){context=await chromium.launchPersistentContext(profile,{headless:true,viewport:{width:360,height:850},...(process.env.MOA_BROWSER_PATH?{executablePath:process.env.MOA_BROWSER_PATH}:{channel:'chrome'})});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url)}
const account=()=>page.getByLabel('계정',{exact:true})
const dialog=()=>page.getByRole('dialog',{name:'이메일 로그인',exact:true})
const email='email-ui@example.com',password='email-test-password'
async function fill(pass=password){await dialog().getByLabel('이메일',{exact:true}).fill(email);await dialog().getByLabel('비밀번호',{exact:true}).fill(pass)}
try{
 await open();await account().filter({hasText:'guest'}).waitFor()
 await page.getByRole('button',{name:'이메일 로그인',exact:true}).click()
 await dialog().getByRole('button',{name:'회원가입',exact:true}).click();await fill();await dialog().getByLabel('비밀번호 확인',{exact:true}).fill(password)
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 await page.screenshot({path:'test-results/faith-boot/email-signup-mobile.png'})
 await dialog().getByRole('button',{name:'이메일로 가입하기',exact:true}).click()
 await page.waitForFunction(()=>window.emailAuth.currentUser?.email==='email-ui@example.com')
 const uid=await page.evaluate(()=>window.emailAuth.currentUser.uid)
 await page.waitForFunction(uid=>document.querySelector('output')?.textContent===uid,uid)
 await dialog().waitFor({state:'detached'});await page.reload();await page.waitForFunction(uid=>document.querySelector('output')?.textContent===uid,uid)
 assert.equal(await page.locator('.moa-launch').count(),0,'email restoration must not replay launch on reload')
 await context.close();await open();await page.waitForFunction(uid=>document.querySelector('output')?.textContent===uid,uid)
 await page.getByRole('button',{name:'로그아웃',exact:true}).click();await account().filter({hasText:'guest'}).waitFor()
 await page.getByRole('button',{name:'로그인하고 예배당 입장',exact:true}).click()
 await dialog().getByRole('button',{name:'구글 계정으로 로그인',exact:true}).waitFor()
 await fill('wrong-password');await dialog().getByRole('button',{name:'이메일로 로그인',exact:true}).click()
 await dialog().getByRole('alert').filter({hasText:'이메일 또는 비밀번호'}).waitFor()
 assert.equal(await dialog().getByLabel('이메일',{exact:true}).inputValue(),email)
 assert.equal(await account().innerText(),'guest','invalid credentials grant no church identity')
 await fill();await dialog().getByRole('button',{name:'이메일로 로그인',exact:true}).click();await dialog().waitFor({state:'detached'})
 await page.waitForFunction(uid=>document.querySelector('output')?.textContent===uid,uid)
 await page.getByRole('button',{name:'로그아웃',exact:true}).click();await account().filter({hasText:'guest'}).waitFor();await page.reload();await account().filter({hasText:'guest'}).waitFor()
 assert.deepEqual(errors,[])
 console.log('Email UI: signup, primary church identity, invalid-password retry, login, reload/browser restart persistence, logout and chapel entry auth choices passed against Firebase Auth emulator.')
}finally{await context?.close();await server.close();await rm(folder,{recursive:true,force:true})}
