import {
  Component,
  Prop,
  State,
  h,
  Watch,
  Event,
  EventEmitter,
} from '@stencil/core'
import registerVolumeMeter from '../../module/volume-meter'
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
  @Prop() isPlayAudioStream: boolean = false
  @Prop() isMute: boolean = false
  @State() isNameEdit: boolean = false
  @State() audioVolume: number = 0
  @Event() userNameChange: EventEmitter
  audioElm!: HTMLAudioElement
  audioContext: AudioContext
  meter: any

  onEditUserName = () => {
    if (!this.isNameEditable) return
    this.isNameEdit = true
  }

  onInputBlur = () => {
    this.isNameEdit = false
  }

  onInputChange = (evt: InputEvent) => {
    this.userName = (evt.target as HTMLInputElement).value
    this.userNameChange.emit(this.userName)
  }

  onInputKeyPress = (evt: KeyboardEvent) => {
    if (evt.key === 'Enter') {
      this.isNameEdit = false
    }
  }

  componentDidLoad() {
    this.handleStreamChange()
  }

  @Watch('isPlayAudioStream')
  @Watch('stream')
  handleStreamChange() {
    if (this.stream && this.audioElm) {
      this.audioElm.srcObject = this.stream
    }

    if (this.stream) {
      this.audioContext?.close()
      this.meter?.stop()
      this.audioContext = new AudioContext()
      this.meter = registerVolumeMeter(
        this.audioContext,
        { tweenIn: 1, tweenOut: 6 },
        (volume: number) => {
          if (volume >= 1) {
            this.audioVolume = Math.min(Math.floor(volume * 3), 6)
          } else {
            this.audioVolume = 0
          }
        }
      )
      this.audioContext
        .createMediaStreamSource(this.stream)
        .connect(this.meter.analyser)
    }
  }

  componentDidUnload = () => {
    this.audioContext?.close()
    this.meter?.stop()
  }

  render() {
    const rippleStyle = {
      // borderWidth: `${this.audioVolume * 3}px`,
    }

    return (
      <div class="bubble">
        <div class="icon-wrapper">
          <div
            class={this.audioVolume > 2 ? 'icon-ripple' : ''}
            style={rippleStyle}
          >
            <div class="icon-user" innerHTML={IconUser}></div>
          </div>
        </div>
        <div
          class={this.isMute ? 'icon-mic-off' : 'icon-mic-on'}
          innerHTML={this.isMute ? IconMicOff : IconMicOn}
        ></div>
        <input
          class="user-name-input"
          readonly={!this.isNameEdit}
          data-editable={this.isNameEditable}
          maxlength="12"
          value={this.userName}
          onClick={this.onEditUserName}
          onBlur={this.onInputBlur}
          onKeyPress={this.onInputKeyPress}
          onChange={this.onInputChange}
        />
        {this.isPlayAudioStream && (
          <audio ref={(elm) => (this.audioElm = elm)} autoPlay />
        )}
      </div>
    )
  }
}
