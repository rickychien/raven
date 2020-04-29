import { Component, Prop, State, h, Event, EventEmitter } from '@stencil/core'

@Component({
  tag: 'input-typewriter',
  styleUrl: 'input-typewriter.css',
  shadow: true,
})
export class InputTypewriter {
  @Prop() placeholder: string
  @State() typewriter: string
  @Event() inputChange: EventEmitter
  @Event() inputEnterKeyPress: EventEmitter

  componentDidLoad = () => {
    const refresh = () => {
      let i = 1
      let id = setInterval(() => {
        if (i > this.placeholder.length) {
          clearInterval(id)
          setTimeout(refresh, 2000)
        }
        this.typewriter = this.placeholder.slice(0, i++)
      }, 150)
    }
    refresh()
  }

  onInputChange = (evt: InputEvent) => {
    this.inputChange.emit((evt.target as HTMLInputElement).value)
  }

  onInputEnterKeyPress = (evt: KeyboardEvent) => {
    if (evt.key === 'Enter') {
      this.inputEnterKeyPress.emit((evt.target as HTMLInputElement).value)
    }
  }

  render() {
    return (
      <input
        autoFocus
        placeholder={this.typewriter}
        onChange={this.onInputChange}
        onKeyPress={this.onInputEnterKeyPress}
      />
    )
  }
}
