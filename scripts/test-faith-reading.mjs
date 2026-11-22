import assert from 'node:assert/strict'
import {mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import path from 'node:path'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from 'playwright'
const folder='.faith-reading-smoke'
await mkdir(folder,{recursive:true});await mkdir('test-results/faith-gallery',{recursive:true})
await writeFile(folder+'/index.html','<html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./main.tsx"></script></html>')
await writeFile(folder+'/main.tsx',`import React from 'react';import {createRoot} from 'react-dom/client';import '../src/index.css';import {MeditationApp} from '../src/apps/meditation/MeditationApp';createRoot(document.getElementById('root')!).render(<MeditationApp/>);`)
await writeFile(folder+'/session.ts',`const auth={currentUser:null};export const getFirebaseConfigError=()=>'';export const getFirebaseAuth=()=>auth;export const getFaithAuth=getFirebaseAuth;export const getRealtimeDb=()=>({});export const getFaithDb=getRealtimeDb;export const getFirebaseStorage=()=>({});export const getFaithStorage=getFirebaseStorage;`)
const ko=JSON.parse(await readFile('public/scripture/ko/2-corinthians.json','utf8')).chapters['1']
const versePayload={range:['고린도후서',1,1,24],verses:Object.entries(ko).map(([number,text])=>({number:Number(number),text}))}
await writeFile(folder+'/db.ts',`const versePayload=${JSON.stringify(versePayload)};export const ref=(_db,path='')=>path;export const get=async path=>({val:()=>path.startsWith('verse/')?versePayload:null});export const onValue=(_path,fn)=>{fn({val:()=>null});return()=>{}};export const query=node=>node;export const orderByValue=()=>null;export const startAt=()=>null;export const endAt=()=>null;export const orderByChild=()=>null;export const limitToLast=()=>null;export const onDisconnect=()=>({remove:async()=>{}});export const push=()=>({key:'new'});export const set=async()=>{};export const remove=async()=>{};export const update=async()=>{};export const serverTimestamp=()=>0;export const runTransaction=async()=>{};`)
const server=await createServer({configFile:false,root:process.cwd(),base:'/MOA/',plugins:[react()],resolve:{alias:[{find:'../../services/faithSession',replacement:path.resolve(folder+'/session.ts')},{find:'../../services/firebase',replacement:path.resolve(folder+'/session.ts')},{find:'firebase/database',replacement:path.resolve(folder+'/db.ts')}]},server:{host:'127.0.0.1',port:4185,strictPort:true}})
await server.listen()
const browser=await chromium.launch({headless:true,...(process.env.MOA_BROWSER_PATH?{executablePath:process.env.MOA_BROWSER_PATH}:{channel:'chrome'})}),errors=[]
const url='http://127.0.0.1:4185/MOA/'+folder+'/index.html'
const read=page=>page.getByRole('navigation',{name:'모아',exact:true}).getByRole('button',{name:'묵상·기도'}).click()
try{
 for(const width of [360,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),requests=[]
  page.on('pageerror',e=>{errors.push(e.message);console.error('Reading page error:',e.message)});page.on('request',r=>requests.push(r.url()))
  await page.goto(url);await read(page);await page.locator('.faith-verse-list>button').last().waitFor()
  assert.equal(await page.locator('.faith-verse-list>button').count(),24)
  assert.equal(requests.some(r=>r.includes('/scripture/en/')),false,'second language is not fetched while off')
  await page.getByRole('button',{name:'대조 읽기',exact:true}).click()
  await page.waitForFunction(()=>document.querySelectorAll('.faith-verse-translation').length===24)
  assert.ok((await page.locator('.faith-verse-translation').nth(16).innerText()).includes('When I therefore'))
  await page.evaluate(()=>document.fonts.ready)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'parallel reading fits viewport')
  await page.screenshot({path:'test-results/faith-gallery/parallel-reading-'+width+'.png',fullPage:true})
  await page.locator('.faith-verse-list>button').nth(16).click()
  const write=page.getByRole('button',{name:'묵상하기',exact:true});await write.scrollIntoViewIfNeeded()
  await page.screenshot({path:'test-results/faith-gallery/parallel-reading-bottom-'+width+'.png'})
  await write.click();await page.waitForFunction(()=>document.activeElement?.id==='write-title')
  const heading=await page.locator('#write-title').boundingBox();assert.ok(heading&&heading.y>=0&&heading.y<450,'bottom action opens the writing heading in view')
  const quote=await page.locator('.faith-selected-quote').innerText();assert.ok(quote.includes('[한국어]')&&quote.includes('[English]'))
  await page.getByRole('textbox',{name:/묵상 메모/}).fill('두 언어 본문과 함께 보관할 임시저장 메모')
  await page.reload();await page.getByRole('button',{name:'최근 묵상 이어쓰기'}).click()
  assert.equal(await page.getByRole('textbox',{name:/묵상 메모/}).inputValue(),'두 언어 본문과 함께 보관할 임시저장 메모')
  assert.equal(await page.locator('.faith-selected-quote').innerText(),quote,'bilingual quotation survives reload independently of pending fetches')
  await context.close()
 }
 const context=await browser.newContext({viewport:{width:390,height:850}}),page=await context.newPage()
 page.on('pageerror',e=>{errors.push(e.message);console.error('Reading page error:',e.message)})
 await page.route('**/scripture/en/2-corinthians.json',route=>route.fulfill({status:404,body:'missing'}))
 await page.goto(url);await read(page);await page.locator('.faith-verse-list>button').last().waitFor();await page.getByRole('button',{name:'대조 읽기',exact:true}).click()
 await page.getByText(/같은 날짜·범위의 대조 본문을/).waitFor()
 assert.equal(await page.locator('.faith-verse-translation').count(),0,'missing translation is never substituted with Korean')
 await page.unroute('**/scripture/en/2-corinthians.json');await page.getByRole('button',{name:'대조 본문 다시 불러오기'}).click()
 await page.waitForFunction(()=>document.querySelectorAll('.faith-verse-translation').length===24)
 await page.getByRole('combobox',{name:'대조 언어'}).selectOption('ja')
 await page.waitForFunction(()=>document.querySelectorAll('.faith-verse-translation[lang=ja]').length===24)
 await context.close();assert.deepEqual(errors,[])
 console.log('Parallel scripture: real KO/WEB/JA caches, aligned verses, mobile layout, end-of-reading writing/focus, bilingual draft restore and missing-language retry passed.')
}finally{await browser.close();await server.close();await rm(folder,{recursive:true,force:true})}
