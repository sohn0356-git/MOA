import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import vm from 'node:vm'

const source = (await readFile(new URL('../functions/scripts/update-daily-verse.mjs', import.meta.url), 'utf8'))
  .replace(/^import .*$/gm, '').replace(/main\(\)\.catch\([\s\S]*$/, '')
function harness({englishFails = false, koreanFails = false} = {}) {
  const events = [], writes = [], warnings = [], caches = []
  const range = ['아가', 1, 1, 2]
  const context = vm.createContext({
    process: {cwd: () => '/project/functions', env: {UPDATE_DATE: '2026-10-24', FIREBASE_SERVICE_ACCOUNT: '{"project_id":"test-project"}'}},
    resolve, setTimeout, clearTimeout, AbortSignal, TextDecoder, Date,
    console: {log() {}, warn: message => warnings.push(message)},
    cert: value => value, initializeApp: () => ({}), deleteApp: async () => {},
    getDatabase: () => ({ref: path => ({get: async () => ({val: () => null}), set: async payload => {events.push('write-ko'); writes.push({path, payload})}})}),
    readFile: async () => {throw Object.assign(new Error('missing fixture cache'), {code: 'ENOENT'})},
    mkdir: async () => {}, writeFile: async (path, data) => caches.push({path, data: JSON.parse(data)}),
    fetch: async url => {
      const english = url.includes('/web.json'); events.push(english ? 'fetch-en' : 'fetch-ja')
      if (english && englishFails) throw new Error('English source temporarily unavailable')
      return {ok: true, json: async () => ({books: [{nr: 22, name: english ? 'Song of Solomon' : '雅歌', chapters: [{chapter: 1, verses: [{verse: 1, text: 'verse one'}, {verse: 2, text: 'verse two'}]}]}]})}
    },
  })
  vm.runInContext(source + `
    fetchDurannoHome = async () => '<h2><img alt="오늘의 QT"><span>아가<em></em><em>1:1-2</em></span></h2>';
    fetchDurannoBible = async () => {
      if (${koreanFails}) throw new Error('Korean source unavailable');
      return {sourceUrl:'https://www.duranno.com/qt/view/bible.asp?qtDate=2026-10-24&d=k', html:'<div class="bible"><table><tr><th>1</th><td>한국어 첫 절</td></tr><tr><th>2</th><td>한국어 둘째 절</td></tr></table></div><div class="amen">'};
    };
    globalThis.api = {main, fetchGetBibleVerses};
  `, context)
  return {api: context.api, events, writes, warnings, caches, range}
}
{
  const h = harness()
  const verses = await h.api.fetchGetBibleVerses('en', h.range)
  assert.equal(verses.length, 2, 'Song of Solomon resolves despite the old Song of Songs spelling')
  assert.equal((await h.api.fetchGetBibleVerses('ja', h.range)).length, 2, 'canonical number works across translation names')
  await h.api.main()
  assert.equal(h.writes[0].path, 'verse/2026/1024')
  assert.equal(h.writes[0].payload.date, '2026-10-24')
  assert.equal(h.writes[0].payload.verses.length, 2)
  assert.equal(h.warnings.length, 0)
  assert.equal(h.caches.length, 3, 'all language caches are saved')
}
{
  const h = harness({englishFails: true})
  await h.api.main()
  assert.equal(h.writes.length, 1, 'translation failure must not block Korean publication')
  assert.ok(h.events.indexOf('write-ko') < h.events.indexOf('fetch-en'))
  assert.equal(h.warnings.length, 1, 'translation failures remain visible in Actions')
  assert.ok(h.caches.some(c => c.path.includes('/ja/')), 'one failed translation must not block another')
}
{
  const h = harness({koreanFails: true})
  await assert.rejects(h.api.main(), /Could not resolve non-empty Duranno verses/)
  assert.equal(h.writes.length, 0, 'do not replace the daily verse with a fallback when the primary source fails')
}
console.log('Daily verse regression passed: canonical book identity, date path, Korean-first publication, isolated translation failures, and primary-source failure protection.')
