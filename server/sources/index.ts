import { sourceRegistry } from './registry'
import { PanIndexAdapter } from './implementations/pan-index.adapter'
import { MagnetIndexAdapter } from './implementations/magnet-index.adapter'
import { TgChannelAdapter } from './implementations/tg-channel.adapter'
import { AlistAdapter } from './implementations/alist.adapter'
import { QuarkShareAdapter } from './implementations/quark-share.adapter'
import { AliyunHubAdapter } from './implementations/aliyun-hub.adapter'
import { Pan115ArchiveAdapter } from './implementations/pan115-archive.adapter'
import { DmhyAdapter } from './implementations/dmhy.adapter'
import { NyaaAdapter } from './implementations/nyaa.adapter'
import { EbookAdapter } from './implementations/ebook.adapter'
import { SoftwareAdapter } from './implementations/software.adapter'
import { TorznabAdapter } from './implementations/torznab.adapter'
import { TelegramGenericAdapter, COMMUNITY_TG_CHANNELS } from './implementations/tg-generic.adapter'
import { PanSearchAdapter } from './implementations/pansearch.adapter'
import { AcademicTorrentsAdapter } from './implementations/academic-torrents.adapter'
import { QuPanSouAdapter } from './implementations/qupansou.adapter'

export function initializeSources() {
  if (sourceRegistry.getAll().length === 0) {
    sourceRegistry.register(new MagnetIndexAdapter())
    sourceRegistry.register(new TorznabAdapter())
    sourceRegistry.register(new AcademicTorrentsAdapter())
    sourceRegistry.register(new PanSearchAdapter())
    sourceRegistry.register(new QuPanSouAdapter())
    sourceRegistry.register(new PanIndexAdapter())
    sourceRegistry.register(new AlistAdapter())
    sourceRegistry.register(new QuarkShareAdapter())
    sourceRegistry.register(new Pan115ArchiveAdapter())
    sourceRegistry.register(new AliyunHubAdapter())
    sourceRegistry.register(new DmhyAdapter())
    sourceRegistry.register(new NyaaAdapter())
    sourceRegistry.register(new EbookAdapter())
    sourceRegistry.register(new SoftwareAdapter())
    sourceRegistry.register(new TgChannelAdapter())

    // Register all high-reputation Telegram channel matrix nodes
    for (const channel of COMMUNITY_TG_CHANNELS) {
      sourceRegistry.register(new TelegramGenericAdapter(channel))
    }
  }
  return sourceRegistry
}

export { sourceRegistry }

