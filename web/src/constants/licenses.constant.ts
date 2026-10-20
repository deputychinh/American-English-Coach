import type { ThirdPartyNotice } from '@/interfaces/licenses.interface';

/** Everything third-party inside the iOS app (Settings → About → Licences). */
export const THIRD_PARTY_NOTICES: ThirdPartyNotice[] = [
  {
    name: 'wav2vec2-xlsr-53-espeak-cv-ft',
    author: 'Meta AI',
    license: 'Apache License 2.0',
    url: 'https://huggingface.co/facebook/wav2vec2-xlsr-53-espeak-cv-ft',
    use: {
      vi: 'Mô hình nhận dạng âm vị. Đã chuyển sang ONNX và nén int8 (chỉ trọng số MatMul) để chạy trên iPhone.',
      en: 'Phoneme recognition model. Converted to ONNX and quantised to int8 (MatMul weights only) to run on the iPhone.',
    },
  },
  {
    name: 'ONNX Runtime',
    author: 'Microsoft',
    license: 'MIT License',
    url: 'https://github.com/microsoft/onnxruntime',
    use: { vi: 'Chạy mô hình chấm điểm trên máy.', en: 'Runs the scoring model on the device.' },
  },
  {
    name: 'MediaPipe Face Landmarker',
    author: 'Google',
    license: 'Apache License 2.0',
    url: 'https://github.com/google-ai-edge/mediapipe',
    use: {
      vi: 'Đo khẩu hình từ camera, ngay trên máy.',
      en: 'Measures the mouth from the camera, on the device.',
    },
  },
  {
    name: 'CMU Pronouncing Dictionary',
    author: 'Carnegie Mellon University',
    license: 'BSD 2-Clause License',
    url: 'https://github.com/cmusphinx/cmudict',
    use: { vi: 'Phiên âm chuẩn của từ.', en: 'Reference pronunciations of words.' },
  },
  {
    name: 'Capacitor',
    author: 'Ionic',
    license: 'MIT License',
    url: 'https://github.com/ionic-team/capacitor',
    use: { vi: 'Vỏ ứng dụng iOS.', en: 'The iOS app shell.' },
  },
  {
    name: 'Next.js, React',
    author: 'Vercel, Meta',
    license: 'MIT License',
    url: 'https://github.com/vercel/next.js',
    use: { vi: 'Giao diện ứng dụng.', en: 'The app interface.' },
  },
  {
    name: 'Inter, Noto Sans',
    author: 'Rasmus Andersson, Google',
    license: 'SIL Open Font License 1.1',
    url: 'https://openfontlicense.org',
    use: { vi: 'Phông chữ và ký hiệu IPA.', en: 'Typefaces, including IPA symbols.' },
  },
];

/** Apache-2.0 §4(d): the NOTICE that ships with the converted model (data/models/onnx/NOTICE.txt). */
export const MODEL_NOTICE =
  'w2v.mm8.onnx is derived from facebook/wav2vec2-xlsr-53-espeak-cv-ft, licensed under the ' +
  'Apache License, Version 2.0 (https://www.apache.org/licenses/LICENSE-2.0). Changes: exported ' +
  'to ONNX (opset 17) and quantized (per-channel int8 weights on MatMul operations only).';
