var cacheName = 'weatherData';
var appShellData = 'appShellData';
var weatherAPIUrlBase = 'https://publicdata-weather.firebaseio.com/';

/** Files to be cached when the app loads*/
var _cacheData = [
  '/',
  '/index.html',
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

  /** Listen for the fetch event and intercept request save response to cache before returning it 
   * or for any other request search for the response in cache and return it,
   * or make a fetch request
  */
  self.addEventListener('fetch', function(e){
    if(e.request.url.startsWith(weatherAPIUrlBase)) {
      e.respondWith(
        fetch(e.request).then(function(response) {
          return caches.open(cacheName).then(function(cache) {
            cache.put(e.request.url, response.clone());
            return response;
          })
        })
      );
    } else {
      e.respondWith(
        caches.match(e.request).then(function(response){
          return response || fetch(e.request);
        })
      )
    }

  })