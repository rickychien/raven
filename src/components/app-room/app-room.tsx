import { Component, Prop, State, h } from '@stencil/core'
import { MatchResults } from '@stencil/router'
import { state, setUser, deleteUser } from '../../store'
import Connector from '../../module/connector'
import { SIGNAL_SERVER_URL, ICE_SERVER_URLS } from '../../helpers/constants'
import { getRoomPref, setRoomPref } from '../../helpers/utils'

@Component({
  tag: 'app-room',
  styleUrl: 'app-room.css',
})
export class AppRoom {
  @Prop() match: MatchResults
  @State() elapsed: string = '0:00'
  @State() isSignalerConnected: boolean = false
  @State() startTime: number = 0
  roomName: string = this.match.params.roomName
  uid: string = getRoomPref(this.roomName).uid
  userName: string = getRoomPref(this.roomName).userName
  stream: MediaStream
  connector: Connector

  componentWillLoad = () => {
    this.setupConnector()
  }

  setupConnector = async () => {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    this.connector = new Connector({
      wsServerUrl: SIGNAL_SERVER_URL,
      iceServerUrls: ICE_SERVER_URLS,
      retryTimeout: 3000,
    })

    this.connector.on('signaler-opened', () => {
      this.isSignalerConnected = true
      this.connector.joinRoom({
        uid: this.uid,
        userName: this.userName,
        roomName: this.roomName,
        stream: this.stream,
      })
    })

    this.connector.on('signaler-closed', () => {
      this.isSignalerConnected = false
    })

    this.connector.on('user-joined', (user: User) => {
      this.uid = user.uid
      this.startTime = new Date(user.roomCreatedTime).getTime()
      setUser(user.uid, user)
      setRoomPref(this.roomName, { uid: user.uid, userName: user.userName })
    })

    this.connector.on('peer-stream-received', (peer: User) => {
      setUser(peer.uid, peer)
    })

    this.connector.on('peer-info-updated', (peer: User) => {
      setUser(peer.uid, peer)
    })

    this.connector.on('peer-left', (peer: User) => {
      deleteUser(peer.uid)
    })

    this.connector.on('rtc-ice-state-change', (peer: User) => {
      // If peer has network issue or disconnected (offline), then remove user
      setUser(peer.uid, peer)
    })
  }

  onUserNameChange = ({ detail: userName }: CustomEvent) => {
    // Store user info for next time visit
    setRoomPref(this.roomName, { userName })
    setUser(this.uid, { userName })
    this.connector.sendUserUpdate({ userName })
  }

  onVolumeOnChange = ({ detail: on }: CustomEvent) => {
    state.users.forEach(({ uid, stream }) => {
      // We don't change local output stream but remote input stream
      if (uid === this.uid) return
      stream.getAudioTracks()[0].enabled = on
    })
  }

  onMicOnChange = ({ detail: on }: CustomEvent) => {
    // Change local output stream
    state.users.get(this.uid).stream.getAudioTracks()[0].enabled = on
    setUser(this.uid, { mute: !on })
    this.connector.sendUserUpdate({ mute: !on })
  }

  isPeerConnected = (user: User) => {
    if (this.uid === user.uid) return true

    return /^connected|completed$/.test(user.rtc?.peerConn?.iceConnectionState)
  }

  render() {
    const userBubbles = Array.from(state.users.values())

    return (
      <div class="main">
        <div class="header">
          <div class="room-title">
            <h2 class="room-name">{this.roomName}</h2>
            <h2 class="room-user-count">({userBubbles.length})</h2>
          </div>
          <room-timer startTime={this.startTime} />
        </div>
        <div class="room">
          <div class="room-loading">
            <div class="loading-animate"></div>
          </div>
          {userBubbles.map((user) => (
            <user-bubble
              class={this.isPeerConnected(user) ? '' : 'peer-disconnected'}
              userName={user.userName}
              stream={this.uid === user.uid ? null : user.stream}
              isNameEditable={this.uid === user.uid}
              isMute={user.mute}
              onUserNameChange={this.onUserNameChange}
            />
          ))}
        </div>
        <div class={'control' + (this.isSignalerConnected ? '' : ' disabled')}>
          <control-volume onSwitchChange={this.onVolumeOnChange} />
          <control-mic onSwitchChange={this.onMicOnChange} />
        </div>
      </div>
    )
  }
}
