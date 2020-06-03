import { Component, h, Prop, State, Watch } from '@stencil/core'
import onVolumeChange from '../../module/volume-meter'

@Component({
  tag: 'audio-wave',
  styleUrl: 'audio-wave.css',
  shadow: true,
})
export class AudioWave {
  @Prop() stream: MediaStream
  @State() audioVolume: number
  stop: () => void

  componentWillLoad = () => {
    this.attachVolumeMeter()
  }

  componentDidUnload = () => {
    this.stop()
  }

  @Watch('stream')
  attachVolumeMeter() {
    if (!this.stream) {
      this.stop?.()
      this.stop = null
      return
    }

    this.stop = onVolumeChange(this.stream, (volume) => {
      this.audioVolume = volume >= 2 ? Math.min(volume, 6) : 2
    })
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
