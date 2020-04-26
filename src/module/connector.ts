import EventEmitter from 'event-emitter-es6'
import { log } from '../helpers/utils'

interface SignalingPayload {
  uid?: string
  userName?: string
  roomName?: string
  roomCreatedTime?: string
  mute?: boolean
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidate
}

/**
 * This module handles all peer's connections from signaling server and establishing
 * P2P RTC connections to the end clients.
 * Multiple clients are able to be handled.
 *
 * Signaling server: Websocket
 * Peer: WebRTC
 */

export default class Connector extends EventEmitter {
  ws: WebSocket = null
  wsServerUrl: string
  iceServerUrls: string[] = []
  retryTimeout: number = 1000
  localStream: MediaStream
  peersInfo: {
    [uid: string]: SignalingPayload & {
      peerConn?: RTCPeerConnection
      stream?: MediaStream
    }
  } = {}

  constructor({
    wsServerUrl,
    iceServerUrls,
    retryTimeout,
  }: {
    wsServerUrl: string
    iceServerUrls: string[]
    retryTimeout?: number
  }) {
    super()
    this.wsServerUrl = wsServerUrl
    this.iceServerUrls = iceServerUrls
    this.retryTimeout = retryTimeout
    this.connect()
  }

  connect = () => {
    this.ws = new WebSocket(this.wsServerUrl)

    this.ws.addEventListener(
      'open',
      function onopen() {
        log('Signaling server connection is succeeded.', { type: 'Websocket' })
        this.emit('signaling-server-connected')
        this.ws.removeEventListener('open', onopen)
      }.bind(this)
    )

    this.ws.addEventListener(
      'close',
      function onclose() {
        log('Signaling server connection is closed, try reconnecting...', {
          type: 'Websocket',
        })
        setTimeout(this.connect, this.retryTimeout)
        this.emit('signaling-server-failed')
        this.ws.removeEventListener('close', onclose)
      }.bind(this)
    )

    this.ws.addEventListener(
      'error',
      function onerror() {
        log('Signaling server connection is failed', { type: 'Websocket' })
        this.ws.close()
        this.ws.removeEventListener('error', onerror)
      }.bind(this)
    )

    this.ws.addEventListener('message', ({ data }) => {
      const { type, payload } = JSON.parse(data)

      switch (type) {
        case 'user-joined': {
          this.handleUserJoined(payload)
          break
        }
        case 'peer-joined': {
          this.handlePeerJoined(payload)
          break
        }
        case 'peer-updated': {
          this.handlePeerUpdated(payload)
          break
        }
        case 'peer-left': {
          this.handlePeerLeft(payload)
          break
        }
        case 'offer': {
          this.handleOffer(payload)
          break
        }
        case 'answer': {
          this.handleAnswer(payload)
          break
        }
        case 'candidate': {
          this.handleCandidate(payload)
          break
        }
        default: {
          break
        }
      }
    })
  }

  joinRoom({
    userName,
    roomName,
    stream,
  }: {
    userName: string
    roomName: string
    stream: MediaStream
  }) {
    this.localStream = stream
    this.sendToSignalingServer({
      type: 'join',
      payload: {
        userName,
        roomName,
        mute: !stream.getAudioTracks()[0].enabled,
      },
    })
  }

  sendUserUpdate(payload: SignalingPayload) {
    this.sendToSignalingServer({
      type: 'update',
      payload,
    })
  }

  sendToSignalingServer = (data) => {
    this.ws.send(JSON.stringify(data))
  }

  createPeerConnection = ({
    uid,
    userName,
    roomName,
    mute,
  }: {
    uid: string
    userName: string
    roomName: string
    mute?: boolean
  }) => {
    if (this.peersInfo[uid]?.peerConn) {
      return this.peersInfo[uid].peerConn
    }

    const peerConn = new RTCPeerConnection({
      iceServers: [
        {
          urls: this.iceServerUrls,
        },
      ],
    })

    this.peersInfo[uid] = { uid, userName, roomName, peerConn, mute }

    /**
     * Handle |icecandidate| events by forwarding the specified
     * ICE candidate (created by our local ICE agent) to the other
     * peer through the signaling server.
     */
    peerConn.addEventListener('icecandidate', ({ candidate }) => {
      if (candidate) {
        this.sendToSignalingServer({
          type: 'candidate',
          payload: {
            uid,
            candidate,
          },
        })
      }
    })

    /**
     * Called by the WebRTC layer to let us know when it's time to
     * begin, resume, or restart ICE negotiation.
     */
    peerConn.addEventListener('negotiationneeded', async () => {
      log(`|negotiationneeded| start with peer '${userName}' (${uid}).`, {
        type: 'WebRTC',
      })

      const offer = await peerConn.createOffer()

      // If the connection hasn't yet achieved the "stable" state,
      // return to the caller. Another negotiationneeded event
      // will be fired when the state stabilizes.

      if (peerConn.signalingState !== 'stable') {
        log(
          `|negotiationneeded| signalingState is (${peerConn.signalingState}) with peer '${userName}' (${uid}).`,
          { type: 'WebRTC' }
        )
        return
      }

      // Establish the offer as the local peer's current description.
      await peerConn.setLocalDescription(offer)

      // Send the offer to the remote peer.
      this.sendToSignalingServer({
        type: 'offer',
        payload: {
          uid,
          offer,
        },
      })
    })

    /**
     * Handle |iceconnectionstatechange| events. This will detect
     * when the ICE connection is closed, failed, or disconnected.
     * This is called when the state of the ICE agent changes.
     */
    peerConn.addEventListener('iceconnectionstatechange', () => {
      switch (peerConn.iceConnectionState) {
        case 'closed':
        case 'failed':
        case 'disconnected':
          log(
            `|iceconnectionstatechange| detects iceConnectionState is (${peerConn.iceConnectionState}) with peer '${userName}' (${uid}).`,
            { type: 'WebRTC' }
          )
          if (this.peersInfo[uid]) {
            this.peersInfo[uid].peerConn.close()
            this.emit('peer-connection-failed', this.peersInfo[uid])
            delete this.peersInfo[uid]
          }
          break
      }
    })

    /**
     * Set up a |signalingstatechange| event handler. This will detect when
     * the signaling connection is closed.
     */
    peerConn.addEventListener('signalingstatechange', () => {
      switch (peerConn.iceConnectionState) {
        case 'closed':
          log(
            `|signalingstatechange| detects iceConnectionState is (${peerConn.iceConnectionState}) with peer '${userName}' (${uid}).`,
            { type: 'WebRTC' }
          )
          if (this.peersInfo[uid]) {
            this.peersInfo[uid].peerConn.close()
            this.emit('peer-connection-failed', this.peersInfo[uid])
            delete this.peersInfo[uid]
          }
          break
      }
    })

    /**
     * Called by the WebRTC layer when events occur on the media tracks
     * on our WebRTC call. This includes when streams are added to and
     * removed from the call.
     */
    peerConn.addEventListener('track', ({ streams }) => {
      log(`|track| has added by peer '${userName}' (${uid}).`, {
        type: 'WebRTC',
      })
      // Update peer's stream when receiving remote stream
      this.peersInfo[uid].stream = streams[0]

      this.emit('peer-joined', this.peersInfo[uid])
    })

    return peerConn
  }

  handleUserJoined(user: SignalingPayload) {
    log(`User '${user.userName}' (${user.uid}) has joined.`, {
      type: 'Signaling',
    })

    this.emit('user-joined', { ...user, stream: this.localStream })
  }

  handlePeerJoined = ({ uid, userName, roomName, mute }: SignalingPayload) => {
    log(`Peer '${userName}' (${uid}) has joined. `, { type: 'Signaling' })

    const peerConn = this.createPeerConnection({
      uid,
      userName,
      roomName,
      mute,
    })

    this.localStream
      .getTracks()
      .forEach((track) => peerConn.addTrack(track, this.localStream))
  }

  handlePeerUpdated(user: SignalingPayload) {
    log(`Peer '${user.userName}' (${user.uid}) has updated.`, {
      type: 'Signaling',
    })
    this.emit('peer-info-updated', user)
  }

  handlePeerLeft({ uid, userName }: SignalingPayload) {
    log(`Peer '${userName}' (${uid}) has left.`, { type: 'Signaling' })
    if (this.peersInfo[uid]) {
      this.peersInfo[uid].peerConn.close()
      this.emit('peer-left', this.peersInfo[uid])
      delete this.peersInfo[uid]
    }
  }

  /**
   * As callee, accepting an offer from caller. Configures local settings,
   * create our RTCPeerConnection, get and attach our local stream,
   * then create and send an answer to the caller.
   */
  handleOffer = async ({
    uid,
    userName,
    roomName,
    offer,
    mute,
  }: SignalingPayload) => {
    log(`Received offer from peer ${userName}' (${uid})`, { type: 'Signaling' })

    const peerConn = this.createPeerConnection({
      uid,
      userName,
      roomName,
      mute,
    })

    if (peerConn.signalingState !== 'stable') {
      log(
        `Connection's signaling state unstable with peer '${userName}' (${uid}).`,
        { type: 'WebRTC' }
      )
    }

    await peerConn.setRemoteDescription(offer)

    this.localStream
      .getTracks()
      .forEach((track) => peerConn.addTrack(track, this.localStream))

    const answer = await peerConn.createAnswer()

    await peerConn.setLocalDescription(answer)

    this.sendToSignalingServer({
      type: 'answer',
      payload: {
        uid,
        answer,
      },
    })
  }

  /**
   * As caller, accepting an answer from caller.
   */
  handleAnswer({ uid, userName, answer }: SignalingPayload) {
    log(`Received answer from peer '${userName}' (${uid})`, {
      type: 'Signaling',
    })
    this.peersInfo[uid].peerConn.setRemoteDescription(answer)
  }

  /**
   * Both caller and callee will receive icecandidate event to exchange the ICE,
   * and set up ICE candidate to peer connection.
   */
  handleCandidate({ uid, userName, candidate }: SignalingPayload) {
    log(`Received ICE candidate from peer ${userName}' (${uid})`, {
      type: 'Signaling',
    })

    this.peersInfo[uid].peerConn.addIceCandidate(new RTCIceCandidate(candidate))
  }
}
