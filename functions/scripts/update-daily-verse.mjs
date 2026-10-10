import { cert, deleteApp, initializeApp } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const DURANNO_HOME = 'https://www.duranno.com/'
const SCRIPTURE_CACHE_ROOT = resolve(process.cwd(), '../public/scripture')
const REQUEST_TIMEOUT_MS = 15000
const FIREBASE_WRITE_TIMEOUT_MS = 15000
const BOOK_SLUGS = {
  창세기: 'genesis',
  출애굽기: 'exodus',
  레위기: 'leviticus',
  민수기: 'numbers',
  신명기: 'deuteronomy',
  여호수아: 'joshua',
  사사기: 'judges',
  룻기: 'ruth',
  사무엘상: '1-samuel',
  사무엘하: '2-samuel',
  열왕기상: '1-kings',
  열왕기하: '2-kings',
  역대상: '1-chronicles',
  역대하: '2-chronicles',
  에스라: 'ezra',
  느헤미야: 'nehemiah',
  에스더: 'esther',
  욥기: 'job',
  시편: 'psalms',
  잠언: 'proverbs',
  전도서: 'ecclesiastes',
  아가: 'song-of-songs',
  이사야: 'isaiah',
  예레미야: 'jeremiah',
  예레미야애가: 'lamentations',
  에스겔: 'ezekiel',
  다니엘: 'daniel',
  호세아: 'hosea',
  요엘: 'joel',
  아모스: 'amos',
  오바댜: 'obadiah',
  요나: 'jonah',
  미가: 'micah',
  나훔: 'nahum',
  하박국: 'habakkuk',
  스바냐: 'zephaniah',
  학개: 'haggai',
  스가랴: 'zechariah',
  말라기: 'malachi',
  마태복음: 'matthew',
  마가복음: 'mark',
  누가복음: 'luke',
  요한복음: 'john',
  사도행전: 'acts',
  로마서: 'romans',
  고린도전서: '1-corinthians',
  고린도후서: '2-corinthians',
  갈라디아서: 'galatians',
  에베소서: 'ephesians',
  빌립보서: 'philippians',
  골로새서: 'colossians',
  데살로니가전서: '1-thessalonians',
  데살로니가후서: '2-thessalonians',
  디모데전서: '1-timothy',
  디모데후서: '2-timothy',
  디도서: 'titus',
  빌레몬서: 'philemon',
  히브리서: 'hebrews',
  야고보서: 'james',
  베드로전서: '1-peter',
  베드로후서: '2-peter',
  요한일서: '1-john',
  요한이서: '2-john',
  요한삼서: '3-john',
  유다서: 'jude',
  요한계시록: 'revelation',
}
const GETBIBLE_BOOK_NAMES = {
  창세기: 'Genesis',
  출애굽기: 'Exodus',
  레위기: 'Leviticus',
  민수기: 'Numbers',
  신명기: 'Deuteronomy',
  여호수아: 'Joshua',
  사사기: 'Judges',
  룻기: 'Ruth',
  사무엘상: '1 Samuel',
  사무엘하: '2 Samuel',
  열왕기상: '1 Kings',
  열왕기하: '2 Kings',
  역대상: '1 Chronicles',
  역대하: '2 Chronicles',
  에스라: 'Ezra',
  느헤미야: 'Nehemiah',
  에스더: 'Esther',
  욥기: 'Job',
  시편: 'Psalms',
  잠언: 'Proverbs',
  전도서: 'Ecclesiastes',
  아가: 'Song of Songs',
  이사야: 'Isaiah',
  예레미야: 'Jeremiah',
  예레미야애가: 'Lamentations',
  에스겔: 'Ezekiel',
  다니엘: 'Daniel',
  호세아: 'Hosea',
  요엘: 'Joel',
  아모스: 'Amos',
  오바댜: 'Obadiah',
  요나: 'Jonah',
  미가: 'Micah',
  나훔: 'Nahum',
  하박국: 'Habakkuk',
  스바냐: 'Zephaniah',
  학개: 'Haggai',
  스가랴: 'Zechariah',
  말라기: 'Malachi',
  마태복음: 'Matthew',
  마가복음: 'Mark',
  누가복음: 'Luke',
  요한복음: 'John',
  사도행전: 'Acts',
  로마서: 'Romans',
  고린도전서: '1 Corinthians',
  고린도후서: '2 Corinthians',
  갈라디아서: 'Galatians',
  에베소서: 'Ephesians',
  빌립보서: 'Philippians',
  골로새서: 'Colossians',
  데살로니가전서: '1 Thessalonians',
  데살로니가후서: '2 Thessalonians',
  디모데전서: '1 Timothy',
  디모데후서: '2 Timothy',
  디도서: 'Titus',
  빌레몬서: 'Philemon',
  히브리서: 'Hebrews',
  야고보서: 'James',
  베드로전서: '1 Peter',
  베드로후서: '2 Peter',
  요한일서: '1 John',
  요한이서: '2 John',
  요한삼서: '3 John',
  유다서: 'Jude',
  요한계시록: 'Revelation',
}
const GETBIBLE_TRANSLATIONS = {
  en: { key: 'web', name: 'World English Bible' },
  ja: { key: 'japbungo', name: 'Japanese Bungo-yaku' },
}

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

function addDaysToKstDateKey(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00+09:00`)
  date.setUTCDate(date.getUTCDate() + days)
  return getKstDateKey(date)
}

function sameVersePayload(first, second) {
  if (!first || typeof first !== 'object' || !second || typeof second !== 'object') {
    return false
  }

  return first.date === second.date
    && JSON.stringify(first.range) === JSON.stringify(second.range)
    && first.translation === second.translation
    && JSON.stringify(first.verses) === JSON.stringify(second.verses)
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
    sourceUrl,
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
  const rangeMatch = chapterAndVerses.match(/(\d+)\s*:\s*(\d+)\s*(?:[-~–]\s*(?:(\d+)\s*:\s*)?(\d+))?/)
  const chapter = Number(rangeMatch?.[1])
  const startVerse = Number(rangeMatch?.[2])
  const endChapter = Number(rangeMatch?.[3] ?? rangeMatch?.[1])
  const endVerse = Number(rangeMatch?.[4] ?? rangeMatch?.[2])

  if (!book || !Number.isFinite(chapter) || !Number.isFinite(startVerse) || !Number.isFinite(endChapter) || !Number.isFinite(endVerse)) {
    throw new Error(`Could not parse Duranno QT reference from "${stripTags(source)}".`)
  }

  return chapter === endChapter ? [book, chapter, startVerse, endVerse] : [book, chapter, startVerse, endChapter, endVerse]
}

function getRangeParts(range) {
  const [book, startChapter, startVerse, endOrChapter, endVerseValue] = range
  const endChapter = endVerseValue === undefined ? startChapter : endOrChapter
  const endVerse = endVerseValue === undefined ? endOrChapter : endVerseValue
  return {
    book,
    endChapter: Number(endChapter),
    endVerse: Number(endVerse),
    startChapter: Number(startChapter),
    startVerse: Number(startVerse),
  }
}

function getVerseKey(chapter, verseNumber, startChapter, endChapter) {
  return startChapter === endChapter ? verseNumber : `${chapter}:${verseNumber}`
}

function expectedVerseCountFromRows(rows, parts) {
  return rows.filter((verse) => {
    if (verse.chapter < parts.startChapter || verse.chapter > parts.endChapter) {
      return false
    }

    if (verse.chapter === parts.startChapter && verse.number < parts.startVerse) {
      return false
    }

    if (verse.chapter === parts.endChapter && verse.number > parts.endVerse) {
      return false
    }

    return true
  }).length
}

function parseBibleVerses(html, range) {
  const bibleMatch = html.match(/<div class=["']bible["'][^>]*>([\s\S]*?)<\/div>\s*<div class=["']amen/)
  const bibleHtml = bibleMatch?.[1]

  if (!bibleHtml) {
    throw new Error('Could not find the Duranno Bible text section.')
  }

  const parts = getRangeParts(range)
  const rows = []
  const rowPattern = /<tr>\s*<th[^>]*>\s*(\d+)\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/g
  let currentChapter = parts.startChapter
  let previousNumber = 0

  for (const match of bibleHtml.matchAll(rowPattern)) {
    const number = Number(match[1])

    if (number < previousNumber) {
      currentChapter += 1
    }

    previousNumber = number
    rows.push({
      chapter: currentChapter,
      number,
      text: stripTags(match[2]),
    })
  }

  const verses = rows
    .filter((verse) => {
      if (verse.chapter < parts.startChapter || verse.chapter > parts.endChapter) {
        return false
      }

      if (verse.chapter === parts.startChapter && verse.number < parts.startVerse) {
        return false
      }

      if (verse.chapter === parts.endChapter && verse.number > parts.endVerse) {
        return false
      }

      return true
    })
    .map((verse) => ({
      chapter: verse.chapter,
      number: getVerseKey(verse.chapter, verse.number, parts.startChapter, parts.endChapter),
      text: verse.text,
    }))

  const expected = expectedVerseCountFromRows(rows, parts)

  if (!expected || verses.length !== expected) {
    throw new Error(`Expected ${expected || 'non-empty'} Bible verses, parsed ${verses.length}.`)
  }

  return verses
}

function getScriptureBookPath(book, language = 'ko') {
  const slug = BOOK_SLUGS[book]

  if (!slug) {
    throw new Error(`Unsupported scripture book name: ${book}`)
  }

  return resolve(SCRIPTURE_CACHE_ROOT, language, `${slug}.json`)
}

async function readScriptureBook(book, language = 'ko', translation = '개역개정') {
  const bookPath = getScriptureBookPath(book, language)

  try {
    return JSON.parse(await readFile(bookPath, 'utf8'))
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return {
        translation,
        language,
        book,
        chapters: {},
      }
    }

    throw error
  }
}

function hasCachedVerses(cache, range) {
  const parts = getRangeParts(range)

  for (let chapter = parts.startChapter; chapter <= parts.endChapter; chapter += 1) {
    const chapterVerses = cache.chapters?.[String(chapter)]

    if (!chapterVerses) {
      return false
    }

    const verseNumbers = Object.keys(chapterVerses).map(Number).filter(Number.isFinite).sort((first, second) => first - second)
    const from = chapter === parts.startChapter ? parts.startVerse : verseNumbers[0]
    const to = chapter === parts.endChapter ? parts.endVerse : verseNumbers[verseNumbers.length - 1]

    for (let verseNumber = from; verseNumber <= to; verseNumber += 1) {
      if (!chapterVerses[String(verseNumber)]) {
        return false
      }
    }
  }

  return true
}

async function mergeScriptureCache(language, range, verses, translation) {
  const [book] = range
  const cache = await readScriptureBook(book, language, translation)

  cache.translation = translation
  cache.language = language
  cache.book = book
  cache.chapters ??= {}

  for (const verse of verses) {
    const chapter = verse.chapter ?? getRangeParts(range).startChapter
    const verseNumber = String(verse.number).includes(':') ? String(verse.number).split(':')[1] : String(verse.number)
    const chapterKey = String(chapter)
    cache.chapters[chapterKey] ??= {}
    cache.chapters[chapterKey][verseNumber] = verse.text
  }

  await mkdir(resolve(SCRIPTURE_CACHE_ROOT, language), { recursive: true })
  await writeFile(getScriptureBookPath(book, language), `${JSON.stringify(cache, null, 2)}\n`)
}

async function fetchGetBibleVerses(language, range) {
  const [book] = range
  const parts = getRangeParts(range)
  const translation = GETBIBLE_TRANSLATIONS[language]
  const bookName = GETBIBLE_BOOK_NAMES[book]

  if (!translation || !bookName) {
    throw new Error(`Unsupported scripture source for ${language} ${book}.`)
  }

  const response = await fetch(`https://api.getbible.net/v2/${translation.key}.json`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`getBible ${translation.key} request failed with HTTP ${response.status}.`)
  }

  const data = await response.json()
  const sourceBook = data.books?.find((item) => item.name === bookName)
  const verses = []

  for (let chapter = parts.startChapter; chapter <= parts.endChapter; chapter += 1) {
    const sourceChapter = sourceBook?.chapters?.find((item) => Number(item.chapter) === chapter)

    if (!sourceChapter) {
      throw new Error(`Could not find ${bookName} ${chapter} in ${translation.key}.`)
    }

    const verseNumbers = sourceChapter.verses.map((verse) => Number(verse.verse)).filter(Number.isFinite)
    const from = chapter === parts.startChapter ? parts.startVerse : Math.min(...verseNumbers)
    const to = chapter === parts.endChapter ? parts.endVerse : Math.max(...verseNumbers)

    verses.push(...sourceChapter.verses
      .filter((verse) => Number(verse.verse) >= from && Number(verse.verse) <= to)
      .map((verse) => ({
        chapter,
        number: getVerseKey(chapter, Number(verse.verse), parts.startChapter, parts.endChapter),
        text: String(verse.text ?? '').replace(/\s+/g, ' ').trim(),
      })))
  }

  if (!verses.length) {
    throw new Error(`Expected non-empty ${language} verses, parsed ${verses.length}.`)
  }

  return verses
}

async function updateLanguageCache(language, range, getVerses, translation) {
  const [book] = range
  const cache = await readScriptureBook(book, language, translation)

  if (hasCachedVerses(cache, range)) {
    return false
  }

  const verses = await getVerses()
  await mergeScriptureCache(language, range, verses, translation)
  return true
}

async function resolveKoreanVersesForCandidate(range, candidate) {
  const bible = await fetchDurannoBible(candidate.isoDate)
  const verses = parseBibleVerses(bible.html, range)

  if (!verses.length || verses.some((verse) => !verse.text)) {
    throw new Error(`Duranno returned empty verses for ${candidate.isoDate}.`)
  }

  return {
    ...candidate,
    sourceUrl: bible.sourceUrl,
    verses,
  }
}

async function resolveTargetVerse(today, range) {
  const tomorrow = addDaysToKstDateKey(today.isoDate, 1)
  const candidates = process.env.UPDATE_DATE ? [today] : [today, tomorrow]
  const errors = []

  for (const candidate of candidates) {
    try {
      return await resolveKoreanVersesForCandidate(range, candidate)
    } catch (error) {
      errors.push(`${candidate.isoDate}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  throw new Error(`Could not resolve non-empty Duranno verses for current KST candidates. ${errors.join(' | ')}`)
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
  const requested = getKstDateKey(targetDate)
  const runKst = getKstDateKey(new Date())
  const html = await fetchDurannoHome()
  const range = parseTodayQt(html)
  const target = await resolveTargetVerse(requested, range)
  const { dayKey, isoDate, year } = target
  let koreanVerses = target.verses

  await updateLanguageCache('ko', range, async () => {
    return koreanVerses
  }, '개역개정')
  if (!koreanVerses.length) {
    const cache = await readScriptureBook(range[0], 'ko', '개역개정')
    const chapterVerses = cache.chapters?.[String(range[1])] ?? {}
    koreanVerses = Array.from({ length: range[3] - range[2] + 1 }, (_, index) => {
      const number = range[2] + index
      return { number, text: chapterVerses[String(number)] }
    }).filter((verse) => verse.text)
  }
  await updateLanguageCache('en', range, () => fetchGetBibleVerses('en', range), GETBIBLE_TRANSLATIONS.en.name)
  await updateLanguageCache('ja', range, () => fetchGetBibleVerses('ja', range), GETBIBLE_TRANSLATIONS.ja.name)

  const app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL,
  })

  try {
    const db = getDatabase()
    const payload = {
      date: isoDate,
      range,
      sourceUrl: target.sourceUrl,
      translation: '개역개정',
      verses: koreanVerses,
    }
    const verseRef = db.ref(`verse/${year}/${dayKey}`)
    const snapshot = await withTimeout(verseRef.get(), FIREBASE_WRITE_TIMEOUT_MS, 'Firebase verse read')
    const existing = snapshot.val()

    if (existing?.date && existing.date > isoDate) {
      throw new Error(`Refusing to write older verse ${isoDate}; existing date is ${existing.date}.`)
    }

    if (sameVersePayload(snapshot.val(), payload)) {
      console.log(`Skipped verse/${year}/${dayKey}; content already up to date at ${new Date().toISOString()}; runKst=${runKst.isoDate}; targetKst=${isoDate}`)
    } else {
      await withTimeout(verseRef.set(payload), FIREBASE_WRITE_TIMEOUT_MS, 'Firebase verse update')
      console.log(`Wrote verse/${year}/${dayKey} at ${new Date().toISOString()}; runKst=${runKst.isoDate}; targetKst=${isoDate}`)
    }
  } finally {
    await deleteApp(app)
  }

  console.log(`Checked verse/${year}/${dayKey}; cron may be delayed; actualRunUtc=${new Date().toISOString()}; runKst=${runKst.isoDate}; targetKst=${isoDate}; range=${JSON.stringify(range)}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
