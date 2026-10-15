import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const source = read('src/apps/meditation/MeditationApp.tsx')
const accounts = read('src/data/aiAccounts.ts')
const helpers = read('src/apps/meditation/faithUtils.ts')
const start = source.indexOf('function getAiDevotionEntries(')
const end = source.indexOf('\nfunction Avatar(', start)
const code = stripTypeScriptTypes([
  accounts.replace('export ', ''),
  helpers.replaceAll('export ', ''),
  'const aiAuthors = aiLoginAccounts.map(({ accountId, displayName }) => ({ uid: accountId, displayName }))',
  source.slice(start, end),
  'export { aiAuthors, getAiDevotionEntries, getAiPrayerRequests, getAiFaithQuestions, normalizeFaithTags, getRelatedQuestions }',
].join('\n'))
const api = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
assert.ok(api.aiAuthors.length > 5, 'Exercise accounts beyond the five sample templates')
for (const verses of [[], [{ number: 1, text: '말씀' }]]) {
  const plan = { reference: '로마서 12:1', theme: '헌신', verses }
  const entries = api.getAiDevotionEntries('2026-10-15', plan)
  const prayers = api.getAiPrayerRequests('2026-10-15')
  const questions = api.getAiFaithQuestions('2026-10-15')
  // These run during MeditationApp's initial AI-mode render, regardless of tab.
  const tags = api.normalizeFaithTags(questions.flatMap(question => question.tags))
  assert.ok(tags.length)
  for (const question of questions) assert.ok(Array.isArray(question.tags))
  assert.doesNotThrow(() => api.getRelatedQuestions(questions, '', ['기도']))
  for (const records of [entries, prayers, questions]) {
    assert.equal(records.length, api.aiAuthors.length)
    assert.equal(new Set(records.map(record => record.id)).size, records.length)
    for (const record of records) assert.ok(Number.isFinite(Date.parse(record.createdAt)))
  }
  for (const entry of entries) {
    assert.equal(typeof entry.mind, 'string')
    assert.equal(typeof entry.apply, 'string')
    assert.ok(entry.mind.trim())
    assert.ok(entry.apply.trim())
  }
  for (const record of [...prayers, ...questions]) {
    assert.equal(typeof record.title, 'string')
    assert.equal(typeof record.body, 'string')
    assert.ok(record.title.trim())
    assert.ok(record.body.trim())
  }

}
console.log('Faith startup regression passed for all configured AI accounts, tags, text, dates, and empty verses.')
