interface Option {
  type?: 'Websocket' | 'Signaling' | 'WebRTC'
}

export function log(msg: string, { type = 'Signaling' }: Option) {
  let bg = '#737373'
  switch (type) {
    case 'Websocket':
      bg = '#4e8c43'
      break
    case 'Signaling':
      bg = '#d66523'
      break
    case 'WebRTC':
      bg = '#1395b8'
      break
  }
  console.log(
    '%c%s',
    `color: white; background: ${bg}; border-radius: 3px; padding: 1px 5px;`,
    type,
    msg
  )
}
