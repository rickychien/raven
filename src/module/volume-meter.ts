export default function registerVolumeMeter(
  context: AudioContext,
  opts: {
    fftSize?: number
    tweenIn?: number
    tweenOut?: number
  },
  onEnterFrame: (volume: number) => void
): {
  analyser: AnalyserNode
  stop: () => void
} {
  opts.fftSize = opts.fftSize || 32
  opts.tweenIn = opts.tweenIn || 1.618
  opts.tweenOut = opts.tweenOut || opts.tweenIn * 3

  let analyser: AnalyserNode = context.createAnalyser()
  let buffer: Uint8Array = new Uint8Array(opts.fftSize)
  let range: number
  let next: number
  let tween: number
  let raf: number
  let last: number = 0
  let loop: boolean = true

  function stop() {
    loop = false
    cancelAnimationFrame(raf)
  }

  // The fftSize property governs the sample size even
  // when we are not requesting frequency domain data
  analyser.fftSize = opts.fftSize

  function render() {
    if (!loop) return
    analyser.getByteTimeDomainData(buffer)
    range = getDynamicRange(buffer) * (Math.E - 1)
    next = Math.floor(Math.log1p(range) * 100)
    tween = next > last ? opts.tweenIn : opts.tweenOut
    next = last = last + (next - last) / tween

    onEnterFrame(next)
    raf = requestAnimationFrame(render)
  }

  render()

  return {
    analyser,
    stop,
  }
}

function getDynamicRange(buffer: Uint8Array) {
  let len = buffer.length
  let min = 128
  let max = 128

  for (let i = 0; i < len; i++) {
    let sample = buffer[i]
    if (sample < min) min = sample
    else if (sample > max) max = sample
  }

  return (max - min) / 255
}
