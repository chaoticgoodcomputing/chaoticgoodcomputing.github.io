import { TweenNode } from "./renderTypes"

/**
 * Central registry for managing all active tween animations.
 * Provides lifecycle management (stop/cleanup) for different tween groups.
 */
export class TweenManager {
  private tweens: Map<string, TweenNode> = new Map()

  set(key: string, tween: TweenNode): void {
    this.tweens.get(key)?.stop()
    this.tweens.set(key, tween)
  }

  get(key: string): TweenNode | undefined {
    return this.tweens.get(key)
  }

  clear(): void {
    this.tweens.forEach((tween) => tween.stop())
    this.tweens.clear()
  }

  updateAll(time: number): void {
    this.tweens.forEach((tween) => tween.update(time))
  }
}
