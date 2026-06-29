/**
 * Upload image to Cloudinary
 * Requires VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET env vars
 */
export async function uploadImageToCloudinary(file, folder = 'inventory') {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary configuration missing. Check VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET')
  }

  // Validate file
  if (!file) {
    throw new Error('No file provided')
  }

  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds 5MB limit')
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF')
  }

  // Create FormData
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', `sari-sari-store/${folder}`)
  formData.append('quality', 'auto')
  formData.append('fetch_format', 'auto')

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Upload failed')
    }

    const data = await response.json()
    return data.secure_url
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw new Error(`Image upload failed: ${error.message}`)
  }
}

/**
 * Utility to optimize Cloudinary image URL for different use cases
 */
export function optimizeCloudinaryUrl(url, options = {}) {
  if (!url || !url.includes('cloudinary')) {
    return url
  }

  const {
    width = null,
    height = null,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
  } = options

  let transformations = []

  if (width || height) {
    const transform = []
    if (width) transform.push(`w_${width}`)
    if (height) transform.push(`h_${height}`)
    transform.push(`c_${crop}`)
    transformations.push(transform.join(','))
  }

  transformations.push(`q_${quality}`)
  transformations.push(`f_${format}`)

  if (transformations.length === 0) {
    return url
  }

  // Insert transformations before the filename
  const parts = url.split('/upload/')
  if (parts.length === 2) {
    return `${parts[0]}/upload/${transformations.join('/')}/${parts[1]}`
  }

  return url
}