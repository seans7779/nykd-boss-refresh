// Service Worker for NYKD BOSS Refresh PWA
const CACHE_NAME = 'nykd-boss-refresh-v1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 安装事件 - 缓存资源
self.addEventListener('install', event => {
  console.log('Service Worker: 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: 缓存文件');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: 安装完成');
        return self.skipWaiting();
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  console.log('Service Worker: 激活中...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 删除旧缓存', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: 激活完成');
      return self.clients.claim();
    })
  );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
  // 只处理GET请求
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果缓存中有，直接返回
        if (response) {
          console.log('Service Worker: 从缓存返回', event.request.url);
          return response;
        }

        // 否则从网络获取
        console.log('Service Worker: 从网络获取', event.request.url);
        return fetch(event.request).then(response => {
          // 检查是否是有效响应
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // 克隆响应，因为响应流只能使用一次
          const responseToCache = response.clone();

          // 将新资源添加到缓存
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // 网络失败时的后备方案
        console.log('Service Worker: 网络请求失败，返回离线页面');
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});

// 后台同步事件（可选）
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: 后台同步');
    event.waitUntil(doBackgroundSync());
  }
});

// 推送通知事件（可选）
self.addEventListener('push', event => {
  console.log('Service Worker: 收到推送消息');
  
  const options = {
    body: event.data ? event.data.text() : 'BOSS即将刷新！',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看详情',
        icon: './icon-192.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: './icon-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('NYKD BOSS刷新提醒', options)
  );
});

// 通知点击事件
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: 通知被点击');
  event.notification.close();

  if (event.action === 'explore') {
    // 打开应用
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// 后台同步函数
async function doBackgroundSync() {
  try {
    // 这里可以添加后台数据同步逻辑
    console.log('Service Worker: 执行后台同步任务');
  } catch (error) {
    console.error('Service Worker: 后台同步失败', error);
  }
}