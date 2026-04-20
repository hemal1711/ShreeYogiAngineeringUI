import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message: string;
  action?: ToastAction;
}

export interface ToastAction {
  label: string;
  callback: () => void;
}

export interface ToastOptions {
  duration?: number;
  action?: ToastAction;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private nextId = 1;
  readonly messages = signal<ToastMessage[]>([]);

  success(message: string, title = 'Success', options?: ToastOptions): void {
    this.show('success', title, message, options);
  }

  error(message: string, title = 'Something went wrong', options?: ToastOptions): void {
    this.show('error', title, message, { duration: 6500, ...options });
  }

  warning(message: string, title = 'Please check', options?: ToastOptions): void {
    this.show('warning', title, message, { duration: 6000, ...options });
  }

  info(message: string, title = 'Information', options?: ToastOptions): void {
    this.show('info', title, message, options);
  }

  fromError(error: unknown, fallbackMessage: string, title = 'Something went wrong', options?: ToastOptions): void {
    this.error(this.resolveErrorMessage(error, fallbackMessage), title, options);
  }

  dismiss(id: number): void {
    this.messages.update((messages) => messages.filter((message) => message.id !== id));
  }

  runAction(message: ToastMessage): void {
    this.dismiss(message.id);
    message.action?.callback();
  }

  private show(type: ToastType, title: string, message: string, options?: ToastOptions): void {
    const id = this.nextId++;
    const duration = options?.duration ?? 4500;

    this.messages.update((messages) => [...messages, { id, type, title, message, action: options?.action }]);

    window.setTimeout(() => {
      this.dismiss(id);
    }, duration);
  }

  private resolveErrorMessage(error: unknown, fallbackMessage: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const httpError = error as { error?: { message?: string } | string };

      if (typeof httpError.error === 'string' && httpError.error.trim()) {
        return httpError.error;
      }

      if (typeof httpError.error === 'object' && httpError.error?.message?.trim()) {
        return httpError.error.message;
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallbackMessage;
  }
}
