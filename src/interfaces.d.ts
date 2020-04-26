interface User {
  uid: string
  userName: string
  roomName?: string
  roomCreatedTime?: string
  stream?: MediaStream
  peerConn?: RTCPeerConnection
  mute: boolean
}

interface Store {
  users: Map<string, User>
}

/**
 * Global variables are used by build-time replace string plugin
 */
declare const _SIGNAL_SERVER_HOST_: string
declare const _ICE_SERVER_URLS_: string[]
