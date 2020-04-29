import EventEmitter from 'event-emitter-es6'

export default class RTC extends EventEmitter {
  peerConn: RTCPeerConnection = null
  caller: boolean = false

  constructor({
    caller,
    iceServerUrls,
  }: {
    caller: boolean
    iceServerUrls: string[]
  }) {
    super()
    this.caller = caller
    const peerConn = (this.peerConn = new RTCPeerConnection({
      iceServers: [
        {
          urls: iceServerUrls,
        },
      ],
    }))

    /**
     * Handle |icecandidate| events by forwarding the specified
     * ICE candidate (created by our local ICE agent) to the other
     * peer through the signaling server.
     */
    peerConn.addEventListener('icecandidate', ({ candidate }) => {
      if (candidate) {
        this.emit('signal-icecandidate', candidate)
      }
    })

    /**
     * Called by the WebRTC layer to let us know when it's time to
     * begin, resume, or restart ICE negotiation.
     */
    peerConn.addEventListener('negotiationneeded', () => {
      this.emit('negotiationneeded')
      this.negotiateICECandidate({ iceRestart: false })
    })

    /**
     * Handle |iceconnectionstatechange| events.
     * We will restart ICE candidate connection if it's failed.
     */
    peerConn.addEventListener('iceconnectionstatechange', () => {
      const state = peerConn.iceConnectionState
      this.emit(`iceconnectionstatechange`, state)
      switch (state) {
        case 'disconnected':
        case 'failed':
          this.negotiateICECandidate({ iceRestart: true })
          break
      }
    })

    /**
     * Called by the WebRTC layer when events occur on the media tracks
     * on our WebRTC call. This includes when streams are added to and
     * removed from the call.
     */
    peerConn.addEventListener('track', ({ streams }) => {
      this.emit('stream-received', streams[0])
    })
  }

  negotiateICECandidate = async ({ iceRestart }) => {
    const offer = await this.peerConn.createOffer({ iceRestart })

    if (this.peerConn.signalingState !== 'stable') return

    await this.peerConn.setLocalDescription(offer)

    this.emit('signal-offer', offer)
  }

  addTrackToPeer(track: MediaStreamTrack, stream: MediaStream) {
    this.peerConn.addTrack(track, stream)
  }

  handleRemoteSDP = async (SDP: RTCSessionDescription) => {
    if (SDP.type === 'offer' && this.peerConn.signalingState !== 'stable') {
      await Promise.all([
        this.peerConn.setLocalDescription({ type: 'rollback' }),
        this.peerConn.setRemoteDescription(SDP),
      ])
    } else {
      await this.peerConn.setRemoteDescription(SDP)
    }

    if (SDP.type === 'offer') {
      const answer = await this.peerConn.createAnswer()
      await this.peerConn.setLocalDescription(answer)
      this.emit('signal-answer', answer)
    }
  }

  handleRemoteCandidate = (candidate: RTCIceCandidate) => {
    this.peerConn.addIceCandidate(new RTCIceCandidate(candidate))
  }

  close = () => {
    this.peerConn?.close()
    this.peerConn = null
  }
}
