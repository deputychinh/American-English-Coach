/**
 * The arithmetic around the phoneme model, shared by the browser engine and its tests. Mirrors
 * the iOS plugin (PhonemeEngine.swift) and `backend/app/ml/onnx_recognizer.py`: zero-mean
 * unit-variance input, log-softmax over each output frame.
 */

const NORMALISE_EPSILON = 1e-7;

/** Zero mean, unit variance: what wav2vec2 was trained on. */
export const normaliseSamples = (samples: Float32Array): Float32Array => {
  if (samples.length === 0) return samples;
  let sum = 0;
  for (const value of samples) sum += value;
  const mean = sum / samples.length;
  let squares = 0;
  for (const value of samples) squares += (value - mean) ** 2;
  const scale = 1 / Math.sqrt(squares / samples.length + NORMALISE_EPSILON);
  return samples.map((value) => (value - mean) * scale);
};

/** In place: each row of `rows × columns` logits becomes log-probabilities. */
export const logSoftmaxRows = (values: Float32Array, rows: number, columns: number): void => {
  for (let row = 0; row < rows; row += 1) {
    const start = row * columns;
    let peak = -Infinity;
    for (let index = start; index < start + columns; index += 1) {
      peak = Math.max(peak, values[index] ?? -Infinity);
    }
    let sum = 0;
    for (let index = start; index < start + columns; index += 1) {
      sum += Math.exp((values[index] ?? 0) - peak);
    }
    const logSum = Math.log(sum) + peak;
    for (let index = start; index < start + columns; index += 1) {
      values[index] = (values[index] ?? 0) - logSum;
    }
  }
};

/** Hex SHA-256 of some bytes (Web Crypto; also available in workers). */
export const sha256Hex = async (bytes: BufferSource): Promise<string> => {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
};
