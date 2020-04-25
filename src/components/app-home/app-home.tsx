import { Component, State, h } from '@stencil/core'
import IconRaven from '../../assets/raven.svg'

const DEFAULT_ROOM = 'ballroom'
const DOMAIN_URL = window.location.href

@Component({
  tag: 'app-home',
  styleUrl: 'app-home.css',
})
export class AppHome {
  @State() exampleRoomName: string
  roomName: string

  joinRoom = () => {
    window.location.pathname = this.roomName || DEFAULT_ROOM
  }

  onInputChange = ({ detail: roomName }: CustomEvent) => {
    this.roomName = roomName
  }

  onInputEnterKeyPress = ({ detail: roomName }: CustomEvent) => {
    this.roomName = roomName
    this.joinRoom()
  }

  render() {
    return [
      <div class="main">
        <div class="logo" innerHTML={IconRaven}></div>
        <p class="sub-title">
          Truly lightweight and anonymous P2P WebRTC voice call
        </p>
        <div class="start-chat-form">
          <div class="create-room-input">
            <span class="domain">{DOMAIN_URL}</span>
            <input-typewriter
              placeholder={DEFAULT_ROOM}
              onInputChange={this.onInputChange}
              onInputEnterKeyPress={this.onInputEnterKeyPress}
            />
          </div>
          <button class="join-button" onClick={this.joinRoom}>
            Go
          </button>
        </div>
      </div>,
    ]
  }
}
