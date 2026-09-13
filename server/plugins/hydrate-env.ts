import { hydrateEnv } from '../utils/env'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    hydrateEnv(event)
  })
})
