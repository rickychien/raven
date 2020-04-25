import { Config } from '@stencil/core'
import { inlineSvg } from 'stencil-inline-svg'
import replace from '@rollup/plugin-replace'

const { SIGNAL_SERVER_URL = 'ws://localhost:5001' } = process.env

export const config: Config = {
  globalStyle: 'src/global/app.css',
  globalScript: 'src/global/app.ts',
  taskQueue: 'async',
  buildEs5: false,
  outputTargets: [
    {
      type: 'www',
      serviceWorker: null,
    },
  ],
  devServer: {
    port: 5000,
    // Disable HMR since it will send extra signaling data
    reloadStrategy: 'pageReload',
    openBrowser: false,
  },
  plugins: [
    replace({ _SIGNAL_SERVER_URL_: `"${SIGNAL_SERVER_URL}"` }),
    inlineSvg(),
  ],
  extras: {
    cssVarsShim: false,
    dynamicImportShim: false,
    safari10: false,
    scriptDataOpts: false,
    shadowDomShim: false,
  },
}
