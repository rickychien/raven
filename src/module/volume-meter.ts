declare global {
  interface Window {
    AudioContext: typeof AudioContext
    webkitAudioContext: typeof AudioContext
  }
}

export default function onVolumeChange(
  stream: MediaStream,
  onEnterFrame: (volume: number) => void
): () => void {
  const ShimAudioContext = window.AudioContext || window.webkitAudioContext
  let audioContext = new ShimAudioContext()
  let analyser: AnalyserNode = audioContext.createAnalyser()
  analyser.smoothingTimeConstant = 0.5
  analyser.fftSize = 2048

  let frequencyData = new Uint8Array(analyser.frequencyBinCount)
  let volume: number
  let raf: number

  function getAverageVolume(array: Uint8Array) {
    let values = 0

    // Get all the frequency amplitudes
    for (let i = 0; i < array.length; i++) {
      values += array[i]
    }

    return values / array.length
  }

  ;(function render() {
    analyser.getByteFrequencyData(frequencyData)
    const newVolume = Math.round(getAverageVolume(frequencyData))

    if (volume !== newVolume) {
      volume = newVolume
      onEnterFrame(volume)
    }

    raf = requestAnimationFrame(render)
  })()

  audioContext.createMediaStreamSource(stream).connect(analyser)

  return function stop() {
    cancelAnimationFrame(raf)
    audioContext.close()
    audioContext = null
    analyser = null
  }
}
