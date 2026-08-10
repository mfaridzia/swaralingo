// Custom Service Worker script for Web Push Notifications
self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    // Fallback if data is not JSON
    payload = {
      title: 'Time to practice! ⚡',
      body: event.data.text()
    };
  }

  const title = payload.title || 'Time to practice! ⚡';
  const options = {
    body: payload.body || 'Keep your daily streak alive. Open SwaraLingo to practice speaking English now.',
    icon: payload.icon || '/icon.svg',
    badge: payload.badge || '/icon.svg',
    data: payload.data || { url: '/dashboard' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const urlToOpen = (event.notification.data && event.notification.data.url) 
    ? new URL(event.notification.data.url, self.location.origin).href
    : self.location.origin + '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // If a tab is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
