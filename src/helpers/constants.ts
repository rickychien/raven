export const WS_HOST = location.href
  .replace(/^http/, 'ws')
  .replace(/\:(\d)+/, ':5001')
export const ICE_SERVER_URLS = ['stun:s1.voipstation.jp']
