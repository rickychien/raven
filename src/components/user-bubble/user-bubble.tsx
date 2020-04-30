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
import IconMicOff from '../../assets/mic-off.svg'

@Component({
  tag: 'user-bubble',
  styleUrl: 'user-bubble.css',
})
export class UserBubble {
  @Prop() userName: string
  @Prop() stream: MediaStream
  @Prop() playAudioStream: boolean = false
  @Prop() isNameEditable: boolean = false
  @Prop() isMute: boolean = false
  @State() audioVolume: number = 0
  @Event() userNameChange: EventEmitter
  audioElm!: HTMLAudioElement
  inputElm!: HTMLInputElement

  componentDidLoad() {
    this.handleStreamChange()
  }

  onInputChange = (evt: InputEvent) => {
    this.userName = (evt.target as HTMLInputElement).value
    this.userNameChange.emit(this.userName)
  }

  onInputKeyPress = (evt: KeyboardEvent) => {
    if (evt.key === 'Enter') {
      this.inputElm.blur()
    }
  }

  onStreamPlaying = () => {
    // Workaround for iOS to enable loudspeaker by default
    // Re-trigger the audio track can enable iOS loudspeaker
    // See https://bugs.webkit.org/show_bug.cgi?id=196539
    const audioTrack = this.stream.getAudioTracks()[0]
    audioTrack.enabled = !audioTrack.enabled
    setTimeout(() => {
      audioTrack.enabled = !audioTrack.enabled
    }, 2000)
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
        <div class="icon-user" innerHTML={IconUser}></div>
        {this.isMute ? (
          <div class="icon-mic-off" innerHTML={IconMicOff}></div>
        ) : (
          <audio-wave stream={this.stream} />
        )}
        <input
          ref={(elm) => (this.inputElm = elm)}
          class="user-name-input"
          readOnly={!this.isNameEditable}
          maxlength="12"
          value={this.userName}
          onChange={this.onInputChange}
          onKeyPress={this.onInputKeyPress}
        />
        <audio
          ref={(elm) => (this.audioElm = elm)}
          autoPlay={this.playAudioStream}
          onPlaying={this.onStreamPlaying}
        />
      </div>
    )
  }
}
