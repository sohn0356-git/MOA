import assert from 'node:assert/strict'
import {mkdir,writeFile,rm} from 'node:fs/promises'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from 'playwright'
import path from 'node:path'
const folder='.faith-session-smoke'
await mkdir(folder,{recursive:true})
await writeFile(folder+'/index.html','<div id="root"></div><script type="module" src="./main.tsx"></script>')
await writeFile(folder+'/firebase.ts',`
import {initializeApp} from 'firebase/app'
import {getAuth,connectAuthEmulator} from 'firebase/auth'
const auth=getAuth(initializeApp({apiKey:'demo-key',projectId:'demo-moa',authDomain:'localhost'}))
connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true})
export const getFirebaseAuth=()=>auth
export const getFirebaseConfigError=()=>null
`)
await writeFile(folder+'/main.tsx',`
import React from 'react'
import {createRoot} from 'react-dom/client'
import {useAuth} from '../src/hooks/useAuth'
function App(){const a=useAuth();return <><output>{a.isAuthLoading?'restoring':a.user?.uid||'guest'}</output><button onClick={()=>a.signInWithEmail('session@example.com','test-password')}>login</button><button onClick={()=>a.signOutUser()}>logout</button><p>{a.authError}</p></>}
createRoot(document.getElementById('root')!).render(<App/>)
`)
const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'session@example.com',password:'test-password',returnSecureToken:true})})
const account=await response.json();assert.ok(account.localId,JSON.stringify(account))
const server=await createServer({configFile:false,root:process.cwd(),plugins:[react()],resolve:{alias:[{find:'../services/firebase',replacement:path.resolve(folder+'/firebase.ts')}]},server:{host:'127.0.0.1',port:4181,strictPort:true}})
await server.listen()
let context
const profile=path.resolve(folder+'/profile'),url='http://127.0.0.1:4181/'+folder+'/index.html'
async function open(){context=await chromium.launchPersistentContext(profile,{headless:true,channel:'chrome'});const page=await context.newPage();await page.goto(url);return page}
async function state(page,value){await page.waitForFunction(value=>document.querySelector('output')?.textContent===value,value)}
try{
 let page=await open();await state(page,'guest');await page.getByText('login',{exact:true}).click();await state(page,account.localId)
 await page.reload();await state(page,account.localId)
 await context.close();page=await open();await state(page,account.localId)
 await page.getByText('logout',{exact:true}).click();await state(page,'guest');await page.reload();await state(page,'guest')
 console.log('Real Firebase Auth: reload and browser restart retain identity; explicit logout persists.')
}finally{await context?.close();await server.close();await rm(folder,{recursive:true,force:true})}
