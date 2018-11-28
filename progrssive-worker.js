var cacheName = 'weatherData';
var appShellData = 'appShellData';
  
/** Files to be cached when the app loads*/
var _cacheData = [
  '/',
  '/index.html',
  '/images/cloudy.png',
  '/images/fog.png',
  '/images/clear.png',
  '/images/cloudy_s_sunny.png',
  '/images/cloudy.png',
  '/images/cloudy-scattered-showers.png',
  '/images/partly-cloudy.png',
  '/images/rain.png',
  '/images/scattered-showers.png',
  '/images/sleet.png',
  '/images/snow.png',
  '/images/thunderstorm.png',
  '/images/wind.png'
];



  /** Listen for the install event of the service worker and add cache data */
  self.addEventListener('install', function(e){
    e.waitUntil(
      caches.open(appShellData).then(function(cache){
        cache.addAll(_cacheData);
      })
    );
  });

  /** Listen for the active event of the service worker 
   * That's the right place to do cache cleanup
  */
  self.addEventListener('activate' , function(e){
    e.waitUntil(
      caches.keys().then(function(keys){
        return Promise.all(keys.map(function(key){
          if(key !== appShellData ) {
            caches.delete(key);
          }
        }))
      })
    )
  });

  /** Listen for the fetch event and intercept request
   * Get cache data for slow network or no network we can run our app
   * Intercept all network by handling fetch request and respond either with cached data or fetch from network
  */
  self.addEventListener('fetch', function(e){
    e.respondWith(
      caches.match(e.request).then(function(response){
        return response || fetch(e.request);
      })
    )
  })