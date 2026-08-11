import { precacheAndRoute } from 'workbox-precaching';



// Precache assets built by Vite
precacheAndRoute(self.__WB_MANIFEST);

// Listen for push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: '/iconpwa.png',
        badge: '/iconpwa.png',
        data: data.url
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title || 'ออเดอร์ใหม่!', options)
      );
    } catch (e) {
      const options = {
        body: event.data.text(),
        icon: '/iconpwa.png'
      };
      event.waitUntil(
        self.registration.showNotification('ออเดอร์ใหม่!', options)
      );
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === event.notification.data && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(event.notification.data);
        }
      })
    );
  }
});
