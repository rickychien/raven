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
