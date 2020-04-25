import { Config } from '@stencil/core'
import { inlineSvg } from 'stencil-inline-svg'

export const config: Config = {
  globalStyle: 'src/global/app.css',
  globalScript: 'src/global/app.ts',
  taskQueue: 'async',
  outputTargets: [
    {
      type: 'www',
      serviceWorker: null,
      // baseUrl: 'https://myapp.local/',
    },
  ],
  devServer: {
    port: 5000,
    openBrowser: false,
  },
  plugins: [inlineSvg()],
}
