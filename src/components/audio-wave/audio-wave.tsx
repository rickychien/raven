import { Component, h, Prop, State } from '@stencil/core'
import registerVolumeMeter from '../../module/volume-meter'

@Component({
  tag: 'audio-wave',
  styleUrl: 'audio-wave.css',
  shadow: true,
})
export class AudioWave {
  @Prop() stream: MediaStream
  @State() audioVolume: number
  audioContext: AudioContext
  meter: any

  componentDidLoad = () => {
    this.attachVolumeMeter(this.stream)
  }

  componentDidUnload = () => {
    this.audioContext?.close()
    this.audioContext = null
    this.meter?.stop()
    this.meter = null
  }

  attachVolumeMeter = (stream: MediaStream) => {
    if (!stream) return

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
          this.audioVolume = 2
        }
      }
    )
    this.audioContext
      .createMediaStreamSource(stream)
      .connect(this.meter.analyser)
  }

  render() {
    return (
      <div class="wave-wrapper" style={{ height: `${this.audioVolume}px` }}>
        <div class="wave rectangle-1"></div>
        <div class="wave rectangle-2"></div>
        <div class="wave rectangle-3"></div>
        <div class="wave rectangle-4"></div>
        <div class="wave rectangle-3"></div>
        <div class="wave rectangle-2"></div>
        <div class="wave rectangle-1"></div>
      </div>
    )
  }
}
