export interface CanvasApp {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  dpr: number
  destroy: () => void
}

export function createCanvasApp(width: number, height: number): CanvasApp {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!
  const dpr = window.devicePixelRatio || 1

  // Set display size
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  // Set actual canvas size for HiDPI
  canvas.width = width * dpr
  canvas.height = height * dpr

  // Scale context to match
  ctx.scale(dpr, dpr)

  return {
    canvas,
    ctx,
    width,
    height,
    dpr,
    destroy: () => {
      canvas.remove()
    },
  }
}

export interface IconImageCache {
  [iconId: string]: HTMLImageElement | null
}

const iconCache: IconImageCache = {}

export async function loadIconImage(dataUri: string, iconId: string): Promise<HTMLImageElement | null> {
  if (iconCache[iconId] !== undefined) {
    return iconCache[iconId]
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      iconCache[iconId] = img
      resolve(img)
    }
    img.onerror = (error) => {
      console.warn("Failed to load icon image:", error)
      iconCache[iconId] = null
      resolve(null)
    }
    img.src = dataUri
  })
}
