import { sourceRegistry } from './registry'
import { PanIndexAdapter } from './implementations/pan-index.adapter'
import { MagnetIndexAdapter } from './implementations/magnet-index.adapter'
import { TgChannelAdapter } from './implementations/tg-channel.adapter'

export function initializeSources() {
  if (sourceRegistry.getAll().length === 0) {
    sourceRegistry.register(new PanIndexAdapter())
    sourceRegistry.register(new MagnetIndexAdapter())
    sourceRegistry.register(new TgChannelAdapter())
  }
  return sourceRegistry
}

export { sourceRegistry }
