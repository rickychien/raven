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
  let audioContext = new AudioContext() || new window.webkitAudioContext()
  let analyser: AnalyserNode = audioContext.createAnalyser()
  analyser.smoothingTimeConstant = 0.3
  analyser.fftSize = 1024

  let frequencyData = new Uint8Array(analyser.frequencyBinCount)
  let volume: number
  let raf: number

  function getAverageVolume(array: Uint8Array) {
    const length = array.length
    let values = 0

    // Get all the frequency amplitudes
    for (let i = 0; i < length; i++) {
      values += array[i]
    }

    return values / length
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
