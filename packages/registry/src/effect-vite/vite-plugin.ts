/**
 * Vite Plugin for Effect HttpApi
 *
 * Mounts Effect HttpApi routes as Vite middleware during development.
 * This allows your Effect services to run directly in the Vite dev server
 * with hot module replacement.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite'
 * import { effectVite } from './lib/effect-vite/vite-plugin'
 * import { TodosApi } from './server/api'
 * import { AppLayer } from './server/layer'
 *
 * export default defineConfig({
 *   plugins: [
 *     effectVite({
 *       api: TodosApi,
 *       layer: AppLayer
 *     })
 *   ]
 * })
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import type { Plugin } from 'vite'
import type { HttpApi } from '@effect/platform'
import type { Layer } from 'effect'

export interface EffectViteOptions {
  /** The HttpApi to mount */
  api: HttpApi.HttpApi<any, any>
  /** The Layer to provide to all routes */
  layer: Layer.Layer<any, any, any>
  /** Base path for API routes (default: "/api") */
  basePath?: string
}

export function effectVite(options: EffectViteOptions): Plugin {
  const { api, layer, basePath = '/api' } = options

  return {
    name: 'effect-vite',

    configureServer(server) {
      // Mount HttpApi as Vite middleware
      server.middlewares.use(basePath, async (req, res, next) => {
        // TODO: Implement HttpApi request handling
        // This is a placeholder showing the integration point

        // 1. Convert Node request to HttpApi request
        // 2. Run HttpApi with provided Layer
        // 3. Convert HttpApi response to Node response
        // 4. Handle errors appropriately

        next()
      })
    },

    // Enable HMR for Effect services
    handleHotUpdate({ file, server }) {
      if (file.includes('/server/') || file.includes('/services/')) {
        console.log('[effect-vite] Hot reloading Effect services...')
        // Invalidate module and trigger reload
        server.ws.send({
          type: 'full-reload',
          path: '*'
        })
      }
    }
  }
}
