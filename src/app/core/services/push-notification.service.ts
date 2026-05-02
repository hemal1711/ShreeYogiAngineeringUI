import { Injectable, inject } from '@angular/core';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { environment } from '../../../environments/environment';
import { AccessControlService } from './access-control.service';
import { ToastService } from '../../shared/components/toast';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private readonly accessControlService = inject(AccessControlService);
  private readonly toastService = inject(ToastService);
  private initialized = false;

  async initializeForLoggedInUser(): Promise<void> {
    if (this.initialized || !environment.notificationsEnabled) {
      return;
    }

    this.initialized = true;

    if (!window.isSecureContext) {
      this.toastService.warning('Push notifications need HTTPS or localhost.', 'Notifications blocked');
      return;
    }

    if (!environment.firebase.vapidKey || !(await isSupported()) || !('Notification' in window) || !('serviceWorker' in navigator)) {
      this.toastService.warning('This browser does not support push notifications.', 'Notifications unavailable');
      return;
    }

    if (Notification.permission === 'denied') {
      this.toastService.warning('Notifications are blocked in browser settings. Please allow notifications for this site.', 'Notifications blocked');
      return;
    }

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

    if (permission !== 'granted') {
      this.toastService.warning('Notification permission was not allowed.', 'Notifications disabled');
      return;
    }

    const app = getApps().length ? getApps()[0] : initializeApp(environment.firebase);
    const messaging = getMessaging(app);
    const serviceWorkerRegistration = await this.getServiceWorkerRegistration();
    const token = await getToken(messaging, {
      vapidKey: environment.firebase.vapidKey,
      serviceWorkerRegistration
    });

    if (!token) {
      return;
    }

    this.accessControlService.registerDeviceToken({
      token,
      platform: this.getPlatform(),
      browser: this.getBrowser(),
      deviceName: navigator.userAgent
    }).subscribe({
      error: () => {
        this.initialized = false;
      }
    });

    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || 'Production entry pending';
      const body = payload.notification?.body || 'Please add pending hourly production entry.';
      this.toastService.warning(body, title);
    });
  }

  private getPlatform(): string {
    return /android/i.test(navigator.userAgent)
      ? 'Android'
      : /iphone|ipad|ipod/i.test(navigator.userAgent)
        ? 'iOS'
        : 'Web';
  }

  private getBrowser(): string {
    const userAgent = navigator.userAgent;
    if (/edg/i.test(userAgent)) return 'Edge';
    if (/chrome|crios/i.test(userAgent)) return 'Chrome';
    if (/firefox|fxios/i.test(userAgent)) return 'Firefox';
    if (/safari/i.test(userAgent)) return 'Safari';
    return 'Browser';
  }

  private async getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const firebaseRegistration = registrations.find((registration) =>
      registration.active?.scriptURL.includes('firebase-messaging-sw.js') ||
      registration.installing?.scriptURL.includes('firebase-messaging-sw.js') ||
      registration.waiting?.scriptURL.includes('firebase-messaging-sw.js')
    );

    if (firebaseRegistration) {
      return firebaseRegistration;
    }

    return navigator.serviceWorker.register('/firebase-messaging-sw.js');
  }
}
