import { Component, h, Prop, Event, EventEmitter } from '@stencil/core'
import IconMicOn from '../../assets/mic-on.svg'
import IconMicOff from '../../assets/mic-off.svg'

@Component({
  tag: 'control-mic',
  styleUrl: 'control-mic.css',
  shadow: true,
})
export class ControlMic {
  @Prop({ mutable: true }) on: boolean = true
  @Event() switchChange: EventEmitter

  onClick = () => {
    this.on = !this.on
    this.switchChange.emit(this.on)
  }

  render() {
    return (
      <button class={this.on ? '' : ' off'} onClick={this.onClick}>
        <div innerHTML={this.on ? IconMicOn : IconMicOff}></div>
      </button>
    )
  }
}
