import EventEmitter from 'event-emitter-es6'
import { log } from '../helpers/utils'
import RTC from './rtc'

interface SignalingPayload {
  uid?: string
  userName?: string
  roomName?: string
  roomCreatedTime?: string
  mute?: boolean
  offer?: RTCSessionDescription
  answer?: RTCSessionDescription
  candidate?: RTCIceCandidate
}

/**
 * Send heart-beat ping message to signaling server to keep it alive
 * Note: Heroku dyno server will close any open connection after 1 minute.
 **/
const HEARTBEAT_DURATION = 50 * 1000 // 50s

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
  reconnectTimeoutId: number = 0
  heartbeatIntervalId: number = 0
  iceServerUrls: string[] = []
  retryTimeout: number = 1000
  localStream: MediaStream
  peersInfo: {
    [uid: string]: SignalingPayload & {
      rtc?: RTC
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
    this.reconnectTimeoutId = 0

    this.ws = new WebSocket(this.wsServerUrl)

    this.ws.addEventListener(
      'open',
      function onopen() {
        log('Signaling server connection is succeeded.', { type: 'Websocket' })
        this.emit('signaler-opened')
        this.ws.removeEventListener('open', onopen)
        window.clearInterval(this.heartbeatIntervalId)
        this.heartbeatIntervalId = window.setInterval(() => {
          this.sendToSignalingServer({ type: 'heartbeat', payload: {} })
        }, HEARTBEAT_DURATION)
      }.bind(this)
    )

    this.ws.addEventListener(
      'close',
      function onclose() {
        log('Signaling server connection is closed, reconnect...', {
          type: 'Websocket',
        })
        this.emit('signaler-closed')
        this.ws.removeEventListener('close', onclose)
        if (!this.reconnectTimeoutId) {
          this.reconnectTimeoutId = window.setTimeout(
            this.connect,
            this.retryTimeout
          )
        }
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

  createRTC({ uid, userName, roomName, mute }: SignalingPayload) {
    if (this.peersInfo[uid]?.rtc) {
      return this.peersInfo[uid].rtc
    }

    const rtc = new RTC({ iceServerUrls: this.iceServerUrls })

    rtc.on('signal-icecandidate', (candidate) => {
      this.sendToSignalingServer({
        type: 'candidate',
        payload: {
          uid,
          candidate,
        },
      })
    })

    rtc.on('signal-offer', (offer) => {
      // Send the offer to the remote peer.
      this.sendToSignalingServer({
        type: 'offer',
        payload: {
          uid,
          offer,
        },
      })
    })

    rtc.on('signal-answer', (answer) => {
      this.sendToSignalingServer({
        type: 'answer',
        payload: {
          uid,
          answer,
        },
      })
    })

    rtc.on('negotiationneeded', () => {
      log(`|negotiationneeded| start with '${userName}' (${uid}).`, {
        type: 'WebRTC',
      })
    })

    rtc.on('iceconnectionstatechange', (state) => {
      log(
        `|iceconnectionstatechange| detects iceConnectionState is "${state}" with '${userName}' (${uid}).`,
        { type: 'WebRTC' }
      )

      this.emit(`rtc-ice-${state}`, this.peersInfo[uid])
    })

    rtc.on('stream-received', (stream) => {
      log(`|track| stream has received from '${userName}' (${uid}).`, {
        type: 'WebRTC',
      })

      this.emit('peer-stream-received', { uid, userName, stream })
    })

    this.localStream
      .getTracks()
      .forEach((track) => rtc.addTrackToPeer(track, this.localStream))

    this.emit('peer-info-updated', { uid, userName, roomName, rtc, mute })

    return rtc
  }

  joinRoom({
    uid,
    userName,
    roomName,
    stream,
  }: {
    uid: string
    userName: string
    roomName: string
    stream: MediaStream
  }) {
    this.localStream = stream
    this.sendToSignalingServer({
      type: 'join',
      payload: {
        uid,
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

  sendToSignalingServer = (data: any) => {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      this.ws.addEventListener(
        'open',
        function sendData() {
          this.ws.send(JSON.stringify(data))
          this.ws.removeEventListener('open', sendData)
        }.bind(this)
      )
    }
  }

  handleUserJoined = ({ uid, userName, ...data }: SignalingPayload) => {
    log(`User '${userName}' (${uid}) joined.`, { type: 'Signaling' })

    this.emit('user-joined', {
      uid,
      userName,
      ...data,
      stream: this.localStream,
    })
  }

  handlePeerJoined = ({ uid, userName, roomName, mute }: SignalingPayload) => {
    log(`Peer '${userName}' (${uid}) joined. `, { type: 'Signaling' })

    const rtc = this.createRTC({ uid, userName, roomName, mute })
    this.peersInfo[uid] = { uid, userName, roomName, rtc, mute }
  }

  handlePeerUpdated({ uid, userName, ...data }: SignalingPayload) {
    log(`Peer '${userName}' (${uid}) updated.`, { type: 'Signaling' })

    this.emit('peer-info-updated', {
      uid,
      userName,
      ...data,
    })
  }

  handlePeerLeft({ uid, userName }: SignalingPayload) {
    log(`Peer '${userName}' (${uid}) left.`, { type: 'Signaling' })

    if (this.peersInfo[uid]) {
      this.peersInfo[uid].rtc.close()
      this.peersInfo[uid].rtc = null
      this.emit('peer-left', this.peersInfo[uid])
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
    log(`Received offer from ${userName}' (${uid})`, { type: 'Signaling' })

    const rtc = this.createRTC({ uid, userName, roomName, mute })
    this.peersInfo[uid] = { uid, userName, roomName, rtc, mute }
    this.peersInfo[uid].rtc.handleRemoteSDP(offer)
  }

  /**
   * As caller, accepting an answer from caller.
   */
  handleAnswer = async ({ uid, userName, answer }: SignalingPayload) => {
    log(`Received answer from '${userName}' (${uid})`, { type: 'Signaling' })

    this.peersInfo[uid].rtc.handleRemoteSDP(answer)
  }

  /**
   * Both caller and callee will receive icecandidate event to exchange the ICE,
   * and set up ICE candidate to peer connection.
   */
  handleCandidate = async ({ uid, userName, candidate }: SignalingPayload) => {
    log(`Received candidate from ${userName}' (${uid})`, { type: 'Signaling' })

    this.peersInfo[uid].rtc.handleRemoteCandidate(candidate)
  }
}
