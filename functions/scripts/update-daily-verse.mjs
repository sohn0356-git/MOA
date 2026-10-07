import { cert, deleteApp, initializeApp } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const DURANNO_HOME = 'https://www.duranno.com/'
const SCRIPTURE_CACHE_DIR = resolve(process.cwd(), '../public/scripture/gae')
const REQUEST_TIMEOUT_MS = 15000
const FIREBASE_WRITE_TIMEOUT_MS = 15000

function getKstDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Seoul',
    year: 'numeric',
  }).formatToParts(value)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Failed to calculate KST date key.')
  }

  return { dayKey: `${month}${day}`, isoDate: `${year}-${month}-${day}`, year }
}

function decodeHtml(value) {
  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
}

function stripTags(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

async function fetchDurannoHome() {
  const response = await fetch(DURANNO_HOME, {
    headers: {
      'user-agent': 'MOA daily verse updater (+https://github.com/sohn0356/MOA)',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Duranno request failed with HTTP ${response.status}.`)
  }

  const buffer = await response.arrayBuffer()
  return new TextDecoder('euc-kr').decode(buffer)
}

async function fetchDurannoBible(isoDate) {
  const sourceUrl = `${DURANNO_HOME}qt/view/bible.asp?qtDate=${isoDate}&d=k`
  const response = await fetch(sourceUrl, {
    headers: {
      'user-agent': 'MOA daily verse updater (+https://github.com/sohn0356/MOA)',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Duranno Bible request failed with HTTP ${response.status}.`)
  }

  const buffer = await response.arrayBuffer()
  return {
    html: new TextDecoder('euc-kr').decode(buffer),
  }
}

function withTimeout(promise, timeoutMs, label) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

function parseTodayQt(html) {
  const todayQtMatch = html.match(/<h2[^>]*>[\s\S]*?alt=["']오늘의 QT["'][\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<\/h2>/)
  const source = todayQtMatch?.[1]

  if (!source) {
    throw new Error('Could not find the Duranno 오늘의 QT section.')
  }

  const spanMatch = source.match(/^\s*([^<]+?)\s*<em[^>]*>[\s\S]*?<\/em>\s*<em[^>]*>([\s\S]*?)<\/em>/)
  const book = stripTags(spanMatch?.[1] ?? '').trim()
  const chapterAndVerses = stripTags(spanMatch?.[2] ?? source)
  const rangeMatch = chapterAndVerses.match(/(\d+)\s*:\s*(\d+)\s*(?:[-~–]\s*(\d+))?/)
  const chapter = Number(rangeMatch?.[1])
  const startVerse = Number(rangeMatch?.[2])
  const endVerse = Number(rangeMatch?.[3] ?? rangeMatch?.[2])

  if (!book || !Number.isFinite(chapter) || !Number.isFinite(startVerse) || !Number.isFinite(endVerse)) {
    throw new Error(`Could not parse Duranno QT reference from "${stripTags(source)}".`)
  }

  return [book, chapter, startVerse, endVerse]
}

function parseBibleVerses(html, startVerse, endVerse) {
  const bibleMatch = html.match(/<div class=["']bible["'][^>]*>([\s\S]*?)<\/div>\s*<div class=["']amen/)
  const bibleHtml = bibleMatch?.[1]

  if (!bibleHtml) {
    throw new Error('Could not find the Duranno Bible text section.')
  }

  const verses = []
  const rowPattern = /<tr>\s*<th[^>]*>\s*(\d+)\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/g

  for (const match of bibleHtml.matchAll(rowPattern)) {
    const number = Number(match[1])

    if (number >= startVerse && number <= endVerse) {
      verses.push({
        number,
        text: stripTags(match[2]),
      })
    }
  }

  if (verses.length !== endVerse - startVerse + 1) {
    throw new Error(`Expected ${endVerse - startVerse + 1} Bible verses, parsed ${verses.length}.`)
  }

  return verses
}

function getScriptureBookPath(book) {
  if (book.includes('/') || book.includes('\\')) {
    throw new Error(`Invalid scripture book name: ${book}`)
  }

  return resolve(SCRIPTURE_CACHE_DIR, `${book}.json`)
}

async function readScriptureBook(book) {
  const bookPath = getScriptureBookPath(book)

  try {
    return JSON.parse(await readFile(bookPath, 'utf8'))
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return {
        translation: '개역개정',
        book,
        chapters: {},
      }
    }

    throw error
  }
}

async function mergeScriptureCache(range, verses) {
  const [book, chapter] = range
  const chapterKey = String(chapter)
  const cache = await readScriptureBook(book)

  cache.translation = '개역개정'
  cache.book = book
  cache.chapters ??= {}
  cache.chapters[chapterKey] ??= {}

  for (const verse of verses) {
    cache.chapters[chapterKey][String(verse.number)] = verse.text
  }

  await mkdir(SCRIPTURE_CACHE_DIR, { recursive: true })
  await writeFile(getScriptureBookPath(book), `${JSON.stringify(cache, null, 2)}\n`)
}

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT

  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT secret.')
  }

  return JSON.parse(raw)
}

async function main() {
  const serviceAccount = getServiceAccount()
  const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL || `https://${projectId}-default-rtdb.firebaseio.com`
  const targetDate = process.env.UPDATE_DATE ? new Date(`${process.env.UPDATE_DATE}T00:00:00+09:00`) : new Date()
  const { dayKey, isoDate, year } = getKstDateKey(targetDate)
  const html = await fetchDurannoHome()
  const range = parseTodayQt(html)
  const bible = await fetchDurannoBible(isoDate)
  const verses = parseBibleVerses(bible.html, range[2], range[3])
  await mergeScriptureCache(range, verses)

  const app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL,
  })

  try {
    const db = getDatabase()
    await withTimeout(db.ref(`verse/${year}/${dayKey}`).set([range]), FIREBASE_WRITE_TIMEOUT_MS, 'Firebase verse update')
  } finally {
    await deleteApp(app)
  }

  console.log(`Updated verse/${year}/${dayKey} for ${isoDate}: ${JSON.stringify(range)}, ${verses.length} verses`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
