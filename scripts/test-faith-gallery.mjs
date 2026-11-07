import assert from 'node:assert/strict'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from 'playwright'
const folder = '.faith-gallery-smoke'
await mkdir(folder, { recursive: true })
await mkdir('test-results/faith-gallery', { recursive: true })
await writeFile(folder + '/index.html', '<html lang="ko"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="./main.tsx"></script></html>')
await writeFile(folder + '/main.tsx', `
import React, { useState } from 'react'
import '../src/index.css'
import { createRoot } from 'react-dom/client'
import { FaithGallery } from '../src/apps/meditation/FaithGallery'
import { useDevotionDraft } from '../src/apps/meditation/useDevotionDraft'
import { normalizeDevotionFields } from '../src/apps/meditation/devotionEditing'
function App() {
 const [view,setView] = useState<'public'|'mine'>('public')
 const [group,setGroup] = useState('')
 const [groups,setGroups] = useState(['매일 묵상','기도','주일'])
 const [editing,setEditing] = useState(false)
 const [mind,setMind] = useState('')
 const draft = useDevotionDraft('smoke-user',editing,{mode:'write',entryId:'',values:{...normalizeDevotionFields({mind},'2026-11-05'),groupName:'매일 묵상'}})
 const photos = Array.from({length:8},(_,i)=>({id:String(i),caption:'함께 걷는 하루 '+i+'\\n사진을 눌러 읽는 묵상 본문',imageUrl:'',authorName:'AI 01',groupName:i%2?'기도':'매일 묵상'}))
 return <div style={{maxWidth:850,margin:'auto',fontFamily:'NanumSquare Neo',padding:12}}>
  <h1>MOA Faith</h1>
  <button onClick={()=>{draft.activate();setEditing(true)}}>묵상 작성</button>
  {!editing && draft.drafts.length>0 && <button onClick={()=>{draft.activate(draft.drafts[0]);setMind(draft.drafts[0].values.mind);setEditing(true)}}>이어서 쓰기</button>}
  {editing && <label>묵상 메모<textarea value={mind} onChange={e=>{draft.flush({mind:e.target.value});setMind(e.target.value)}} /></label>}
  <FaithGallery view={view} onViewChange={next=>{setView(next);setGroup('')}} photos={view==='mine'?photos.slice(0,2):photos} groups={groups} selectedGroup={group} onSelectGroup={setGroup} onAddGroup={name=>{setGroups([...groups,name]);setGroup(name)}} limit={8} sentinelRef={null} header={<p>작은 묵상, 함께하는 하루</p>} renderDetail={(photo)=> <article><h2>{photo.caption.split('\\n')[0]}</h2><p>사진을 눌러 읽는 묵상 본문</p></article>}/>
 </div>
}
createRoot(document.getElementById('root')!).render(<App/>)
`)
const server = await createServer({ configFile: false, root: process.cwd(), base: '/MOA/', plugins: [react()], server: { host: '127.0.0.1', port: 4179, strictPort: true } })
await server.listen()
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
try {
 const page = await browser.newPage()
 page.on('dialog', dialog => dialog.accept())
 const errors = []
 page.on('pageerror', error=>errors.push(error.message))
 for (const width of [360,768,1440]) {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('http://127.0.0.1:4179/MOA/' + folder + '/index.html')
  await page.locator('.faith-gallery-tile').first().waitFor()
  assert.equal(await page.getByRole('navigation',{name:'피드 그룹'}).count(),0,'bookmarks start folded')
  await page.getByRole('button',{name:'책갈피 펼치기'}).click()
  const positions = await page.locator('.faith-gallery-tile').evaluateAll(tiles=>tiles.slice(0,3).map(tile=>({x:tile.getBoundingClientRect().x,y:tile.getBoundingClientRect().y})))
  assert.equal(positions[0].y,positions[1].y,'first row has two columns')
  assert.ok(positions[1].x>positions[0].x)
  assert.ok(positions[2].y>positions[0].y)
  const style = await page.locator('.faith-gallery-art').first().evaluate(el=>({radius:getComputedStyle(el).borderRadius,border:getComputedStyle(el).borderWidth}))
  assert.equal(style.radius,'0px'); assert.equal(style.border,'0px')
  assert.ok(await page.locator('.faith-gallery-grid').evaluate(el=>parseFloat(getComputedStyle(el).gap)<=1))
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow')
  assert.equal(await page.locator('.faith-gallery-tile').first().innerText(),'','album tiles contain no metadata')
  assert.equal(await page.locator('.faith-gallery-heading,.faith-gallery-caption,.faith-gallery-group').count(),0)
  await page.locator('.faith-gallery-tile').first().click()
  await page.getByRole('dialog').waitFor()
  assert.ok(await page.getByRole('dialog').getByText('사진을 눌러 읽는 묵상 본문').isVisible())
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('dialog').count(),0)
  await page.getByRole('navigation',{name:'피드 그룹'}).getByRole('button',{name:'기도',exact:true}).click()
  assert.equal(await page.locator('.faith-gallery-tile').count(),4)
  await page.getByRole('button',{name:'내 글',exact:true}).click()
  assert.equal(await page.locator('.faith-gallery-tile').count(),2)
  await page.getByRole('button',{name:'공개 피드',exact:true}).click()
  const groupBeforeCollapse = await page.getByRole('navigation',{name:'피드 그룹'}).getByRole('button',{pressed:true}).innerText()
  const widthBeforeCollapse = await page.locator('.faith-gallery-body').evaluate(el=>el.getBoundingClientRect().width)
  await page.getByRole('button',{name:'책갈피 접기'}).click()
  assert.equal(await page.getByRole('navigation',{name:'피드 그룹'}).count(),0)
  assert.ok(await page.locator('.faith-gallery-body').evaluate(el=>el.getBoundingClientRect().width)>widthBeforeCollapse)
  await page.screenshot({path:'test-results/faith-gallery/handle-folded-'+width+'.png',fullPage:true})
  await page.getByRole('button',{name:'책갈피 펼치기'}).click()
  assert.equal(await page.getByRole('navigation',{name:'피드 그룹'}).getByRole('button',{pressed:true}).innerText(),groupBeforeCollapse)
  await page.screenshot({path:'test-results/faith-gallery/gallery-'+width+'.png',fullPage:true})
 }
 await page.getByRole('button',{name:'묵상 작성',exact:true}).click()
 await page.getByRole('textbox',{name:'묵상 메모'}).fill('새로고침해도 남아야 하는 실제 입력')
 await page.reload()
 await page.getByRole('button',{name:'이어서 쓰기'}).click()
 assert.equal(await page.getByRole('textbox',{name:'묵상 메모'}).inputValue(),'새로고침해도 남아야 하는 실제 입력')
 assert.deepEqual(errors,[])
 console.log('Gallery passed at 360/768/1440px: two columns, group filter, detail dialog and reload restoration.')
} finally {
 await browser.close()
 await server.close()
 await rm(folder,{recursive:true,force:true})
}
