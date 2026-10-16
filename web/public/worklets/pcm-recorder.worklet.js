// AudioWorklet: forwards mono Float32 PCM chunks to the main thread (128 frames per call).
class PcmRecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel && channel.length > 0) {
      this.port.postMessage(new Float32Array(channel));
    }
    return true;
  }
}

registerProcessor('pcm-recorder', PcmRecorderProcessor);
