import { Application, Container, Graphics, Text, Texture } from "pixi.js"

export async function createPixiApp(width: number, height: number): Promise<Application> {
  const app = new Application()
  await app.init({
    height,
    width,
    antialias: true,
    backgroundAlpha: 0,
    resolution: window.devicePixelRatio,
    autoDensity: true,
  })
  return app
}

export function setupPixiContainers(stage: Container) {
  const labelsContainer = new Container<Text>({ zIndex: 3, isRenderGroup: true })
  const nodesContainer = new Container<Graphics>({ zIndex: 2, isRenderGroup: true })
  const linkContainer = new Container<Graphics>({ zIndex: 1, isRenderGroup: true })
  stage.addChild(nodesContainer, labelsContainer, linkContainer)
  return { labelsContainer, nodesContainer, linkContainer }
}

export async function createIconTexture(dataUri: string): Promise<Texture | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const texture = Texture.from(img)
        resolve(texture)
      } catch (error) {
        console.warn("Failed to create texture from icon:", error)
        resolve(null)
      }
    }
    img.onerror = (error) => {
      console.warn("Failed to load icon image:", error)
      resolve(null)
    }
    img.src = dataUri
  })
}
