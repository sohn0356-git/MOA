export function project(lat: number, lng: number, zoom: number) {
  const size = 256 * 2 ** zoom
  const sin = Math.sin(Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180)
  return { x: (lng + 180) / 360 * size, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size }
}

export function unproject(x: number, y: number, zoom: number) {
  const size = 256 * 2 ** zoom
  return { lng: x / size * 360 - 180, lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / size))) * 180 / Math.PI }
}
