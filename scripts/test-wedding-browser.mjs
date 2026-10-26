import assert from 'node:assert/strict'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const html = 'wedding-preview.html', entry = 'wedding-preview.tsx'
await writeFile(html, '<!doctype html><html lang="ko"><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="/wedding-preview.tsx"></script></html>')
await writeFile(entry, "import {createRoot} from 'react-dom/client'; import {WeddingPlanner} from './src/apps/wedding/WeddingApp'; import './src/index.css'; createRoot(document.getElementById('root')!).render(<main className='app-shell'><WeddingPlanner storageKey='wedding-browser-test'/></main>);")
let server, browser
try {
  server = await createServer({ base: '/', server: { host: '127.0.0.1', port: 4175, strictPort: true } })
  await server.listen()
  browser = await chromium.launch({ headless: true })
  await mkdir('wedding-browser-artifacts', { recursive: true })
  for (const width of [360, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, serviceWorkers: 'block' })
    page.setDefaultTimeout(15000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('http://127.0.0.1:4175/' + html)
    await page.getByRole('heading', { name: /함께 그리는/ }).waitFor()
    const nav = page.getByRole('navigation', { name: '결혼준비 메뉴' })
    assert.equal(await nav.getByRole('button').count(), 5)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'home overflows at ' + width)
    await page.screenshot({ path: 'wedding-browser-artifacts/home-' + width + '.png', fullPage: true })
    await nav.getByRole('button', { name: '지도', exact: true }).click()
    const map = page.getByRole('region', { name: '대한민국 지도', exact: true })
    await map.waitFor()
    const box = await map.boundingBox()
    assert.ok(box)
    // Dragging moves the map and must not open a marker editor.
    await page.mouse.move(box.x + 80, box.y + 190)
    await page.mouse.down()
    await page.mouse.move(box.x + 130, box.y + 220, { steps: 8 })
    await page.mouse.up()
    assert.equal(await page.getByRole('dialog').count(), 0)
    await map.click({ position: { x: 90, y: 240 } })
    let editor = page.getByRole('dialog', { name: '장소 편집' })
    await editor.getByLabel('제목', { exact: true }).fill('우리의 웨딩홀')
    await editor.getByLabel('내용', { exact: true }).fill('토요일 상담 예정')
    await editor.getByLabel('마커 색상').fill('#123abc')
    await editor.getByLabel('아이콘 (이모지 / 문자)', { exact: true }).fill('🌷')
    await editor.getByRole('button', { name: '저장하기' }).click()
    await page.getByRole('button', { name: '우리의 웨딩홀 수정', exact: true }).waitFor()
    await page.getByRole('button', { name: '우리의 웨딩홀 수정', exact: true }).click()
    editor = page.getByRole('dialog', { name: '장소 편집' })
    await editor.getByLabel('제목', { exact: true }).fill('수정한 웨딩홀')
    await editor.getByLabel('내용', { exact: true }).fill('수정한 상담 내용')
    await editor.getByRole('button', { name: '아이콘 📷', exact: true }).click()
    await editor.getByLabel('마커 색상').fill('#ff00aa')
    await editor.getByRole('button', { name: '저장하기' }).click()
    await page.reload()
    await page.getByRole('navigation').getByRole('button', { name: '지도', exact: true }).click()
    await page.getByRole('button', { name: /수정한 웨딩홀.*수정한 상담 내용/ }).click()
    editor = page.getByRole('dialog', { name: '장소 편집' })
    assert.equal(await editor.getByLabel('마커 색상').inputValue(), '#ff00aa')
    assert.equal(await editor.getByLabel('아이콘 (이모지 / 문자)', { exact: true }).inputValue(), '📷')
    await editor.getByRole('button', { name: '취소', exact: true }).click()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'map overflows at ' + width)
    await page.getByRole('button', { name: '한국 전체 보기' }).click()
    await page.screenshot({ path: 'wedding-browser-artifacts/map-' + width + '.png', fullPage: true })
    console.log('WEDDING_BROWSER_OK', width, 'loaded tiles:', await page.locator('.w-tiles img').evaluateAll(imgs => imgs.filter(img => img.complete && img.naturalWidth > 0).length))
    assert.deepEqual(errors, [])
    await page.close()
  }
} finally {
  await browser?.close()
  await server?.close()
  await Promise.all([rm(html, { force: true }), rm(entry, { force: true })])
}
