export type SanctuaryMember = { uid: string; displayName: string }
export type SanctuaryLight = 'dawn' | 'day' | 'evening'
export type SanctuaryRecord = { version: 1; seat: number; light: SanctuaryLight; candleDay: string; candles: number; note: string; sessions: number }
export const sanctuaryKey = (uid: string) => 'moa.faith.sanctuary.v1:' + encodeURIComponent(uid)
export function sanctuaryDay(now = new Date()) {
 return new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit' }).format(now)
}
export function normalizeSanctuaryRecord(raw: unknown): SanctuaryRecord {
 const value = raw && typeof raw === 'object' ? raw as Record<string,unknown> : {}
 const count = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? Math.min(99999,Math.max(0,Math.floor(n))) : 0
 return { version:1,seat:typeof value.seat === 'number' && Number.isInteger(value.seat) && value.seat>=0 && value.seat<4 ? value.seat : 0,
  light:value.light==='day'||value.light==='evening'?value.light:'dawn',candleDay:typeof value.candleDay==='string'?value.candleDay:'',
  candles:count(value.candles),note:typeof value.note==='string'?value.note.slice(0,4000):'',sessions:count(value.sessions) }
}
