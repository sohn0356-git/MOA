export const MAX_DEVOTION_IMAGE_LENGTH = 200 * 1024
export function isDevotionImage(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_DEVOTION_IMAGE_LENGTH && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)
}
export async function prepareDevotionImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('JPG, PNG, WebP 그림을 선택해주세요.')
  if (file.size > 8 * 1024 * 1024) throw new Error('8MB 이하의 그림을 선택해주세요.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('그림을 읽지 못했습니다. 다른 파일을 선택해주세요.'))
      image.src = url
    })
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('그림의 크기를 확인하지 못했습니다.')
    let scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight))
    for (let attempt = 0; attempt < 10; attempt++) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('이 브라우저에서는 그림을 처리할 수 없습니다.')
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const data = canvas.toDataURL('image/webp', 0.82)
      if (isDevotionImage(data)) return data
      scale *= 0.75
    }
    throw new Error('그림 용량을 줄이지 못했습니다. 더 작은 그림을 선택해주세요.')
  } finally { URL.revokeObjectURL(url) }
}
