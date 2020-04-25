import { Component, h, Prop, Event, EventEmitter } from '@stencil/core'
import IconVolumeOn from '../../assets/volume-on.svg'
import IconVolumeOff from '../../assets/volume-off.svg'

@Component({
  tag: 'control-volume',
  styleUrl: 'control-volume.css',
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
      <button class="button" onClick={this.onClick}>
        <div innerHTML={this.on ? IconVolumeOn : IconVolumeOff}></div>
      </button>
    )
  }
}
