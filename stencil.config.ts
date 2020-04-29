import { Config } from '@stencil/core'
import { inlineSvg } from 'stencil-inline-svg'
import replace from '@rollup/plugin-replace'

const {
  // SIGNAL_SERVER_HOST = '192.168.1.12÷:5001',
  SIGNAL_SERVER_HOST = 'localhost:5001',
  ICE_SERVER_URL_1 = 'stun:stun.l.google.com:19302',
  ICE_SERVER_URL_2 = 'stun:s1.taraba.net',
  ICE_SERVER_URL_3 = '',
} = process.env
const replaceVars = {
  _SIGNAL_SERVER_HOST_: `"${SIGNAL_SERVER_HOST}"`,
  _ICE_SERVER_URL_1_: `"${ICE_SERVER_URL_1}"`,
  _ICE_SERVER_URL_2_: `"${ICE_SERVER_URL_2}"`,
  _ICE_SERVER_URL_3_: `"${ICE_SERVER_URL_3}"`,
}

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
    // Disable HMR since it will send extra signaling data
    reloadStrategy: 'pageReload',
    openBrowser: false,
  },
  plugins: [replace(replaceVars), inlineSvg()],
  extras: {
    cssVarsShim: false,
    dynamicImportShim: false,
    safari10: false,
    scriptDataOpts: false,
    shadowDomShim: false,
  },
}
