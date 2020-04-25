import { Component, h } from '@stencil/core'

@Component({
  tag: 'app-root',
})
export class AppRoot {
  render() {
    return (
      <stencil-router>
        <stencil-route-switch scrollTopOffset={0}>
          <stencil-route url="/" component="app-home" exact={true} />
          <stencil-route url="/:roomName" component="app-room" />
        </stencil-route-switch>
      </stencil-router>
    )
  }
}
