export type Place = { id: string; lat: number; lng: number; title: string; body: string; color: string; icon: string }
export type Task = { id: string; title: string; done: boolean }
export type Expense = { id: string; title: string; amount: number }
export type Note = { id: string; title: string; body: string }
export type WeddingData = { date: string; names: string; places: Place[]; tasks: Task[]; expenses: Expense[]; notes: Note[] }
export const emptyData: WeddingData = { date: '', names: '', places: [], tasks: [], expenses: [], notes: [] }
export function readWedding(key: string): WeddingData {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null')
    if (!v || typeof v !== 'object') return emptyData
    return {
      date: typeof v.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.date) ? v.date : '', names: typeof v.names === 'string' ? v.names : '',
      places: Array.isArray(v.places) ? v.places.filter((p: Place) => p && typeof p.id === 'string' && typeof p.title === 'string' && typeof p.body === 'string' && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 85 && Math.abs(p.lng) <= 180 && /^#[0-9a-f]{6}$/i.test(p.color) && typeof p.icon === 'string') : [],
      tasks: Array.isArray(v.tasks) ? v.tasks.filter((t: Task) => t && typeof t.id === 'string' && typeof t.title === 'string' && typeof t.done === 'boolean') : [],
      expenses: Array.isArray(v.expenses) ? v.expenses.filter((e: Expense) => e && typeof e.id === 'string' && typeof e.title === 'string' && Number.isFinite(e.amount) && e.amount >= 0) : [],
      notes: Array.isArray(v.notes) ? v.notes.filter((n: Note) => n && typeof n.id === 'string' && typeof n.title === 'string' && typeof n.body === 'string') : [],
    }
  } catch { return emptyData }
}
