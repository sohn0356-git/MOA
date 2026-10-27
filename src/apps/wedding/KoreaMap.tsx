import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { LocateFixed, Minus, Plus } from 'lucide-react'
import { project, unproject } from './mapGeometry'
import type { Place } from './weddingStorage'

const korea = { lat: 36.2, lng: 127.8, zoom: 7 }
export function KoreaMap({ places, onAdd, onSelect }: { places: Place[]; onAdd: (lat: number, lng: number) => void; onSelect: (place: Place) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 600, height: 540 })
  const [view, setView] = useState(korea)
  const [retry, setRetry] = useState(0)
  const [failed, setFailed] = useState(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean; pinched: boolean; distance: number } | null>(null)
  const center = project(view.lat, view.lng, view.zoom)
  const left = center.x - size.width / 2, top = center.y - size.height / 2
  useEffect(() => {
    if (!host.current) return
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [])
  function zoom(delta: number) { setView(v => ({ ...v, zoom: Math.max(6, Math.min(18, v.zoom + delta)) })) }
  function down(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button,a') || e.button !== 0) return
    host.current?.focus()
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    e.currentTarget.setPointerCapture(e.pointerId)
    if (pointers.current.size > 1) {
      const [a, b] = [...pointers.current.values()]
      if (drag.current) { drag.current.pinched = true; drag.current.distance = Math.hypot(a.x - b.x, a.y - b.y) }
    } else drag.current = { x: e.clientX, y: e.clientY, cx: center.x, cy: center.y, moved: false, pinched: false, distance: 0 }
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (!start || !pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size > 1) {
      const [a, b] = [...pointers.current.values()], distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (Math.abs(distance - start.distance) > 45) { zoom(distance > start.distance ? 1 : -1); start.distance = distance }
      return
    }
    if (start.pinched) return
    const dx = e.clientX - start.x, dy = e.clientY - start.y
    if (Math.hypot(dx, dy) > 5) start.moved = true
    if (start.moved) {
      const next = unproject(start.cx - dx, start.cy - dy, view.zoom)
      setView(v => ({ ...v, lat: Math.max(30, Math.min(44, next.lat)), lng: Math.max(120, Math.min(137, next.lng)) }))
    }
  }
  function up(e: PointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (start && !start.moved && !start.pinched && pointers.current.has(e.pointerId)) {
      const rect = e.currentTarget.getBoundingClientRect()
      const point = unproject(left + e.clientX - rect.left, top + e.clientY - rect.top, view.zoom)
      onAdd(point.lat, point.lng)
    }
    pointers.current.delete(e.pointerId)
    if (!pointers.current.size) drag.current = null
  }
  const tiles = [], count = 2 ** view.zoom
  for (let y = Math.floor(top / 256); y <= Math.floor((top + size.height) / 256); y++) {
    for (let x = Math.floor(left / 256); x <= Math.floor((left + size.width) / 256); x++) {
      if (y < 0 || y >= count) continue
      tiles.push(<img key={`${view.zoom}/${x}/${y}/${retry}`} alt="" draggable={false} src={`https://tile.openstreetmap.org/${view.zoom}/${(x % count + count) % count}/${y}.png`} style={{ left: x * 256 - left, top: y * 256 - top }} onError={() => setFailed(true)} />)
    }
  }
  return <div className="w-map" ref={host} role="region" aria-label="대한민국 지도" aria-describedby="w-map-help" tabIndex={0}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { pointers.current.clear(); drag.current = null }}
    onKeyDown={e => {
      if (e.target !== e.currentTarget) return
      if (['+', '=', '-'].includes(e.key)) { e.preventDefault(); zoom(e.key === '-' ? -1 : 1) }
      if (e.key === 'Enter') { e.preventDefault(); onAdd(view.lat, view.lng) }
      const delta = ({ ArrowLeft: [-100, 0], ArrowRight: [100, 0], ArrowUp: [0, -100], ArrowDown: [0, 100] } as Record<string, number[]>)[e.key]
      if (delta) { e.preventDefault(); setView(v => ({ ...v, ...unproject(center.x + delta[0], center.y + delta[1], v.zoom) })) }
    }}>
    <div className="w-tiles">{tiles}</div>
    {places.map(place => {
      const p = project(place.lat, place.lng, view.zoom)
      return <button key={place.id} type="button" className="w-pin" style={{ left: p.x - left, top: p.y - top, background: place.color }} aria-label={place.title + ' 수정'} onClick={() => onSelect(place)}><span>{place.icon}</span></button>
    })}
    <div className="w-map-hint">지도를 눌러 우리만의 장소를 남겨보세요</div>
    <div className="w-map-controls"><button type="button" aria-label="지도 확대" onClick={() => zoom(1)}><Plus size={18}/></button><button type="button" aria-label="지도 축소" onClick={() => zoom(-1)}><Minus size={18}/></button><button type="button" aria-label="한국 전체 보기" onClick={() => setView(korea)}><LocateFixed size={18}/></button></div>
    {failed && <p className="w-map-error" role="status">지도 연결을 확인해주세요. <button onClick={() => { setFailed(false); setRetry(r => r + 1) }}>다시 시도</button></p>}
    <div className="w-attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors</div>
  </div>
}
