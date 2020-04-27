import { Component, Prop, State, h } from '@stencil/core'
import { MatchResults } from '@stencil/router'
import { state, setUser, deleteUser } from '../../store'
import Connector from '../../module/connector'
import { SIGNAL_SERVER_URL, ICE_SERVER_URLS } from '../../helpers/constants'

@Component({
  tag: 'app-room',
  styleUrl: 'app-room.css',
})
export class AppRoom {
  @Prop() match: MatchResults
  @State() elapsed: string = '0:00'
  @State() isConnected: boolean = false
  @State() startTime: number = 0
  uid: string
  roomName: string = this.match.params.roomName
  userName: string = localStorage.getItem(this.roomName) || 'Guest'
  connector: Connector

  componentWillLoad = () => {
    this.setupConnector()
  }

  setupConnector = () => {
    this.connector = new Connector({
      wsServerUrl: SIGNAL_SERVER_URL,
      iceServerUrls: ICE_SERVER_URLS,
      retryTimeout: 3000,
    })

    this.connector.on('signaling-server-connected', async () => {
      this.isConnected = true
      this.connector.joinRoom({
        userName: this.userName,
        roomName: this.roomName,
        stream: await navigator.mediaDevices.getUserMedia({ audio: true }),
      })
    })

    this.connector.on('signaling-server-failed', () => {
      this.isConnected = false
      deleteUser(this.uid)
    })

    this.connector.on('user-joined', (user: User) => {
      this.uid = user.uid
      this.startTime = new Date(user.roomCreatedTime).getTime()
      setUser(user.uid, user)
    })

    this.connector.on('peer-joined', (peer: User) => {
      setUser(peer.uid, peer)
    })

    this.connector.on('peer-info-updated', (peer: User) => {
      setUser(peer.uid, peer)
    })

    this.connector.on('peer-left', (peer: User) => {
      peer.peerConn?.close()
      deleteUser(peer.uid)
    })

    this.connector.on('peer-connection-failed', (peer: User) => {
      peer.peerConn?.close()
      deleteUser(peer.uid)
    })
  }

  onUserNameChange = ({ detail: userName }: CustomEvent) => {
    // Store user info for next time visit
    localStorage.setItem(this.roomName, userName)
    setUser(this.uid, { userName })
    this.connector.sendUserUpdate({ userName })
  }

  onVolumeOnChange = ({ detail: on }: CustomEvent) => {
    state.users.forEach(({ uid, stream }) => {
      if (uid === this.uid) return
      stream.getAudioTracks()[0].enabled = on
    })
  }

  onMicOnChange = ({ detail: on }: CustomEvent) => {
    state.users.get(this.uid).stream.getAudioTracks()[0].enabled = on
    setUser(this.uid, { mute: !on })
    this.connector.sendUserUpdate({ mute: !on })
  }

  render() {
    const userBubbles = Array.from(state.users.values())

    return (
      <div class="main">
        <div class="header">
          <h2 class="room-name">
            {this.roomName} ({userBubbles.length})
          </h2>
          <room-timer startTime={this.startTime} />
        </div>
        <div class="room">
          <div class="room-loading">
            <div class="loading-animate"></div>
          </div>
          {userBubbles.map((user, idx) => (
            <user-bubble
              userName={user.userName}
              stream={user.stream}
              isNameEditable={idx === 0}
              isPlayAudioStream={idx !== 0}
              isMute={user.mute}
              onUserNameChange={this.onUserNameChange}
            />
          ))}
        </div>
        <div class={'control' + (this.isConnected ? '' : ' disabled')}>
          <control-volume onSwitchChange={this.onVolumeOnChange} />
          <control-mic onSwitchChange={this.onMicOnChange} />
        </div>
      </div>
    )
  }
}
