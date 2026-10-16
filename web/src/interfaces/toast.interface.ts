export interface ToastItem {
  id: number;
  message: string;
  tone: 'info' | 'success';
}

export interface ToastApi {
  show: (message: string, tone?: ToastItem['tone']) => void;
}
