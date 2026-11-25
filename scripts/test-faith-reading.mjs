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
await writeFile(folder+'/db.ts',`const versePayload=${JSON.stringify(versePayload)};export const ref=(_db,path='')=>path;export const get=async path=>({val:()=>path.startsWith('verse/')?versePayload:null});export const onValue=(_path,fn)=>{fn({val:()=>null});return()=>{}};export const query=node=>node;export const orderByValue=()=>null;export const startAt=()=>null;export const endAt=()=>null;export const equalTo=()=>null;export const orderByChild=()=>null;export const limitToLast=()=>null;export const onDisconnect=()=>({remove:async()=>{}});export const push=()=>({key:'new'});export const set=async()=>{};export const remove=async()=>{};export const update=async()=>{};export const serverTimestamp=()=>0;export const runTransaction=async()=>{};`)
const server=await createServer({configFile:false,root:process.cwd(),base:'/MOA/',plugins:[react()],resolve:{alias:[{find:'../../services/faithSession',replacement:path.resolve(folder+'/session.ts')},{find:'../../services/firebase',replacement:path.resolve(folder+'/session.ts')},{find:'firebase/database',replacement:path.resolve(folder+'/db.ts')}]},server:{host:'127.0.0.1',port:4185,strictPort:true}})
await server.listen()
const browser=await chromium.launch({headless:true,...(process.env.MOA_BROWSER_PATH?{executablePath:process.env.MOA_BROWSER_PATH}:{channel:'chrome'})}),errors=[]
const url='http://127.0.0.1:4185/MOA/'+folder+'/index.html'
const read=page=>page.getByRole('navigation',{name:'MOA',exact:true}).getByRole('button',{name:'묵상·기도'}).click()
try{
 for(const width of [360,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),requests=[]
  page.on('pageerror',e=>{errors.push(e.message);console.error('Reading page error:',e.message)});page.on('request',r=>requests.push(r.url()))
  await page.goto(url);await read(page);await page.locator('.faith-verse-list>button').last().waitFor()
  assert.equal(await page.locator('.faith-verse-list>button').count(),24)
  assert.equal(await page.getByRole('button',{name:'대조 읽기',exact:true}).count(),0)
  assert.ok((await page.getByRole('button',{name:'말씀 언어 선택'}).innerText()).includes('한글 + 영어'),'Korean and English start selected')
  await page.waitForFunction(()=>document.querySelectorAll('.faith-verse-translation').length===24)
  assert.ok((await page.locator('.faith-verse-translation').nth(16).innerText()).includes('When I therefore'))
  await page.evaluate(()=>document.fonts.ready)
  if(width===360){await page.getByRole('button',{name:'말씀 언어 선택'}).click();await page.screenshot({path:'test-results/faith-gallery/language-multiselect-360.png'});await page.getByRole('menuitem',{name:'선택 완료',exact:true}).click()}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'parallel reading fits viewport')
  await page.screenshot({path:'test-results/faith-gallery/parallel-reading-'+width+'.png',fullPage:true})
  assert.equal(await page.locator('.faith-selection-next').count(),0,'no floating action before scripture selection')
  await page.locator('.faith-verse-list>button').nth(16).click()
  const floating=page.getByRole('button',{name:'선택한 말씀으로 묵상하기',exact:true});await floating.waitFor()
  await page.locator('.faith-verse-list>button').nth(16).click();await floating.waitFor({state:'detached'})
  await page.locator('.faith-verse-list>button').nth(16).click();await floating.waitFor()
  const dock=await floating.boundingBox(),nav=await page.getByRole('navigation',{name:'MOA',exact:true}).boundingBox()
  assert.ok(dock&&nav&&dock.width<=50&&dock.height<=50&&dock.y+dock.height<=nav.y,'small floating action sits above bottom navigation')
  const reading=await page.locator('.faith-verse-list').evaluate(el=>({height:el.getBoundingClientRect().height,overflow:getComputedStyle(el).overflowY}))
  assert.ok(reading.height>900&&reading.overflow==='visible','scripture uses full natural page height without a clipped scroll panel')
  assert.ok(await page.locator('.faith-verse-pair').evaluateAll((nodes,left)=>nodes.every(node=>node.getBoundingClientRect().right<=left),dock.x),'floating action has a clear side gutter and never covers scripture text')
  await page.screenshot({path:'test-results/faith-gallery/parallel-reading-floating-'+width+'.png'})
  if(width===360){
   await page.locator('.faith-reading-finish').scrollIntoViewIfNeeded();await floating.waitFor({state:'detached'})
   await page.screenshot({path:'test-results/faith-gallery/parallel-reading-bottom-'+width+'.png'})
   await page.getByRole('button',{name:'묵상하기',exact:true}).click()
  }else{await floating.click()}
  await page.waitForFunction(()=>document.activeElement?.id==='write-title')
  const heading=await page.locator('#write-title').boundingBox();assert.ok(heading&&heading.y>=0&&heading.y<450,'bottom action opens the writing heading in view')
  const layout=await page.locator('.faith-selected-quote').evaluate(el=>({display:getComputedStyle(el).display,width:el.getBoundingClientRect().width,parent:el.parentElement.getBoundingClientRect().width,scroll:el.scrollWidth}))
  assert.equal(layout.display,'block','selected quotation must not use the old narrow verse-number grid')
  assert.ok(layout.width>200&&layout.width>=layout.parent-1,'selected text uses the full available width')
  assert.ok(layout.scroll<=layout.width+1,'selected text wraps within the viewport')
  const typography=await page.locator('.faith-selected-quote').evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),line:parseFloat(getComputedStyle(el).lineHeight),tracking:parseFloat(getComputedStyle(el).letterSpacing)}))
  assert.ok(typography.size>=17&&typography.line/typography.size>=1.85&&typography.tracking>=0,'reading text is large, open and uncompressed')
  await page.screenshot({path:'test-results/faith-gallery/selected-scripture-clean-'+width+'.png'})
  const quote=await page.locator('.faith-selected-quote').innerText();assert.ok(!/\[(한국어|한글|English)\]/.test(quote),'selected verses have no generated language labels');assert.ok(/[가-힣]/.test(quote)&&/[a-zA-Z]/.test(quote),'both language texts remain')
  await page.getByRole('textbox',{name:/묵상 메모/}).fill('두 언어 본문과 함께 보관할 임시저장 메모')
  await page.reload();await page.getByRole('button',{name:'최근 묵상 이어쓰기'}).waitFor();await page.screenshot({path:'test-results/faith-gallery/draft-recovery-'+width+'.png',fullPage:true});await page.getByRole('button',{name:'최근 묵상 이어쓰기'}).click()
  assert.equal(await page.getByRole('textbox',{name:/묵상 메모/}).inputValue(),'두 언어 본문과 함께 보관할 임시저장 메모')
  assert.equal(await page.locator('.faith-selected-quote').innerText(),quote,'bilingual quotation survives reload independently of pending fetches')
  await page.getByRole('button',{name:'다시 선택',exact:true}).click()
  const picker=await page.locator('.faith-verse-picker').boundingBox(),complete=await page.locator('.faith-verse-sheet .faith-sheet-action').boundingBox()
  assert.ok(picker&&complete&&picker.y+picker.height<=complete.y+1&&complete.y+complete.height<=900,'verse picker completion has its own visible space')
  await page.getByRole('button',{name:'말씀 선택 닫기',exact:true}).click()

  await context.close()
 }
 const context=await browser.newContext({viewport:{width:390,height:850}}),page=await context.newPage()
 page.on('pageerror',e=>{errors.push(e.message);console.error('Reading page error:',e.message)})
 await page.route('**/scripture/en/2-corinthians.json',route=>route.fulfill({status:404,body:'missing'}))
 await page.goto(url);await read(page);await page.locator('.faith-verse-list>button').last().waitFor()
 await page.getByText(/같은 날짜·범위 본문을/).waitFor()
 assert.equal(await page.locator('.faith-verse-translation').count(),0,'missing translation is never substituted with Korean')
 await page.unroute('**/scripture/en/2-corinthians.json');await page.getByRole('button',{name:'English 본문 다시 불러오기'}).click()
 await page.waitForFunction(()=>document.querySelectorAll('.faith-verse-translation').length===24)
 await page.getByRole('button',{name:'말씀 언어 선택'}).click()
 await page.getByRole('menuitemcheckbox',{name:'日本語',exact:true}).click()
 await page.waitForFunction(()=>document.querySelectorAll('.faith-verse-translation[lang=ja]').length===24)
 assert.equal(await page.locator('.faith-verse-translation[lang=en]').count(),24,'English and Japanese can both stay selected')
 await page.getByRole('menuitemcheckbox',{name:'한국어',exact:true}).click()
 await page.getByRole('menuitemcheckbox',{name:'English',exact:true}).click()
 assert.equal(await page.getByRole('menuitemcheckbox',{name:'日本語',exact:true}).isDisabled(),true,'one language must remain')
 await context.close();assert.deepEqual(errors,[])
 console.log('Parallel scripture: real KO/WEB/JA caches, aligned verses, mobile layout, end-of-reading writing/focus, bilingual draft restore and missing-language retry passed.')
}finally{await browser.close();await server.close();await rm(folder,{recursive:true,force:true})}
