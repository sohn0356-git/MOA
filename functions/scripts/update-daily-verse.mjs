import { cert, initializeApp } from 'firebase-admin/app'
import { getDatabase, ServerValue } from 'firebase-admin/database'

const DURANNO_HOME = 'https://www.duranno.com/'

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
  })

  if (!response.ok) {
    throw new Error(`Duranno request failed with HTTP ${response.status}.`)
  }

  const buffer = await response.arrayBuffer()
  return new TextDecoder('euc-kr').decode(buffer)
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

  initializeApp({
    credential: cert(serviceAccount),
    databaseURL,
  })

  const db = getDatabase()
  await db.ref(`verse/${year}/${dayKey}`).set([range])
  await db.ref(`verseMeta/${year}/${dayKey}`).set({
    date: isoDate,
    reference: `${range[0]} ${range[1]}:${range[2]}${range[2] === range[3] ? '' : `-${range[3]}`}`,
    source: DURANNO_HOME,
    updatedAt: ServerValue.TIMESTAMP,
  })

  console.log(`Updated verse/${year}/${dayKey}: ${JSON.stringify(range)}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
