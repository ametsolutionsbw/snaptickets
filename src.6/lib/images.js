import { supabase } from '../supabaseClient'

const BUCKET = 'event-covers'

export function coverUrl(path) {
  if (!path) return ''
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("We couldn't read that image. Please use a JPG, PNG or WebP file."))
    }
    img.src = url
  })
}

// Shrinks a photo in the browser so uploads stay small and fast (max 1600px wide, JPEG).
export async function prepareCover(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error('Please choose a JPG, PNG or WebP image.')
  }
  const img = await loadImage(file)
  const scale = Math.min(1, 1600 / img.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  for (const quality of [0.85, 0.7, 0.55]) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (blob && blob.size <= 2 * 1024 * 1024) return blob
  }
  throw new Error('That image is still too large after shrinking. Please choose a smaller one.')
}

export async function uploadCover(userId, blob) {
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (error) throw error
  return path
}

export async function removeCover(path) {
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}
