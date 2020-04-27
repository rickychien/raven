import {
  Component,
  Prop,
  State,
  h,
  Watch,
  Event,
  EventEmitter,
} from '@stencil/core'
import IconUser from '../../assets/user.svg'
import IconMicOn from '../../assets/mic-on.svg'
import IconMicOff from '../../assets/mic-off.svg'

@Component({
  tag: 'user-bubble',
  styleUrl: 'user-bubble.css',
})
export class UserBubble {
  @Prop() userName: string
  @Prop() stream: MediaStream
  @Prop() isNameEditable: boolean = false
  @Prop() isMute: boolean = false
  @State() audioVolume: number = 0
  @Event() userNameChange: EventEmitter
  audioElm!: HTMLAudioElement

  onInputChange = (evt: InputEvent) => {
    this.userName = (evt.target as HTMLInputElement).value
    this.userNameChange.emit(this.userName)
  }

  componentDidLoad() {
    this.handleStreamChange()
  }

  @Watch('stream')
  handleStreamChange() {
    if (this.audioElm) {
      this.audioElm.srcObject = this.stream
    }
  }

  render() {
    return (
      <div class="bubble">
        <div class="icon-wrapper">
          <div class="icon-user" innerHTML={IconUser}></div>
        </div>
        <div
          class={this.isMute ? 'icon-mic-off' : 'icon-mic-on'}
          innerHTML={this.isMute ? IconMicOff : IconMicOn}
        ></div>
        <input
          class="user-name-input"
          readOnly={!this.isNameEditable}
          maxlength="12"
          value={this.userName}
          onChange={this.onInputChange}
        />
        {this.stream && <audio ref={(elm) => (this.audioElm = elm)} autoPlay />}
      </div>
    )
  }
}
