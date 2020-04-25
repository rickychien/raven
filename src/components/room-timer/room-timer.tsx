import { Component, h, Prop, State } from '@stencil/core'

const INITIAL_TIME = '0:00'
const REFREASH_INTERVAL = 1000

@Component({
  tag: 'room-timer',
  styleUrl: 'room-timer.css',
  shadow: true,
})
export class RoomTimer {
  @Prop() startTime: number = 0
  @State() elapsed: string = INITIAL_TIME

  componentDidLoad = () => {
    setInterval(() => {
      const diff = Date.now() - this.startTime
      if (diff <= 0 || this.startTime <= 0) {
        this.elapsed = INITIAL_TIME
      } else {
        const time = Math.round((Date.now() - this.startTime) / 1000)
        const mm = `${Math.floor(time / 60)}`.padStart(1, '0')
        const ss = `${time % 60}`.padStart(2, '0')
        this.elapsed = `${mm}:${ss}`
      }
    }, REFREASH_INTERVAL)
  }

  render() {
    return <span>{this.elapsed}</span>
  }
}
