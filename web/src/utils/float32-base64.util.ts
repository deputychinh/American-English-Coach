/** Float32 samples ↔ base64, the format the native phoneme engine takes and returns. */
export const float32ToBase64 = (values: Float32Array): string => {
  const bytes = new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
  let binary = '';
  const step = 0x8000;
  for (let start = 0; start < bytes.length; start += step) {
    binary += String.fromCharCode(...bytes.subarray(start, start + step));
  }
  return btoa(binary);
};

export const base64ToFloat32 = (encoded: string): Float32Array => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Float32Array(bytes.buffer);
};
