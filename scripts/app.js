
(function() {
  'use strict';

  var weatherAPIUrlBase = 'https://publicdata-weather.firebaseio.com/';

  /* Init app data */
  var injectedForecast = {
    key: 'newyork',
    label: 'New York, NY',
    currently: {
      time: 1453489481,
      summary: 'Clear',
      icon: 'partly-cloudy-day',
      temperature: 52.74,
      apparentTemperature: 74.34,
      precipProbability: 0.20,
      humidity: 0.77,
      windBearing: 125,
      windSpeed: 1.52
    },
    daily: {
      data: [
        {icon: 'clear-day', temperatureMax: 55, temperatureMin: 34},
        {icon: 'rain', temperatureMax: 55, temperatureMin: 34},
        {icon: 'snow', temperatureMax: 55, temperatureMin: 34},
        {icon: 'sleet', temperatureMax: 55, temperatureMin: 34},
        {icon: 'fog', temperatureMax: 55, temperatureMin: 34},
        {icon: 'wind', temperatureMax: 55, temperatureMin: 34},
        {icon: 'partly-cloudy-day', temperatureMax: 55, temperatureMin: 34}
      ]
    }
  };

  var app = {
    isLoading: true,
    visibleCards: {},
    selectedCities: [],
    savedCities: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };

  var _citieCacheName = 'cities';
  
  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  /* Event listener for refresh button */
  document.getElementById('butRefresh').addEventListener('click', function() {
    app.updateForecasts();
  });

  /* Event listener for add new city button */
  document.getElementById('butAdd').addEventListener('click', function() {
    // Open/show the add new city dialog
    app.toggleAddDialog(true);
  });

  /* Event listener for add city button in add city dialog */
  document.getElementById('butAddCity').addEventListener('click', function() {
    var select = document.getElementById('selectCityToAdd');
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    var label = selected.textContent;
    app.getForecast(key, label);

    /**
     * Call function that saves data to IndexedDb using localForage
     */
    app.saveToIndexedDB(key, label);

    app.selectedCities.push({key: key, label: label});

    /**
     * Save to cache
     */
    app.saveData('test', app.selectedCities)
    app.toggleAddDialog(false);
  });

  /* Event listener for cancel button in add city dialog */
  document.getElementById('butAddCancel').addEventListener('click', function() {
    app.toggleAddDialog(false);
  });

  /**
   * Wait for DOM content to be loaded before checking for data
   */
  document.addEventListener('DOMContentLoaded', function() {
    app.registerServiceWorker() //register service worker
    //app.readCache();   // Check for user selected data in the cache
    app.getDataFromIndexedDb(); //Check for user selected data from IndexedDb 
  })


  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/
  
  /**
   * Save data to cache
   */
  app.saveCacheData = function (request, response) {
    if('caches' in window) {
      caches.open(_citieCacheName).then(function(cache) {
        cache.put(request.responseURL, new Response(response));
      }).catch(function(err){
        console.log(err);
      })
    }
  }

  /**
   * Get keys from cache
   */
  app.readCache = function() {
    caches.keys().then(function(data) {
      app.updateData(data);
    }).catch(function(err){
      console.log(err)
    });
  }

  /**
   * Check if there is cache data and update the Forecastcard or use default data
   * @param {*} keys City name saved as a request parameter in the cache
   */
  app.updateData = function(keys) {
    
    //TODO: Get cached data from cache

    // caches.open(_citieCacheName).then(function(cache){
    //   cache.match('test').then(function(response) {
    //     console.log(response)
    //   })
      
    // })
  }

  /**
   * Save data in indexedDb
   */
  app.saveToIndexedDB = function(key, value) {
    localforage.setItem(key, value).then(function(data){
    }).catch(function(err){
      console.log(err);
    })
  }

  /**
   * Get keys from IndexedDB
   */
  app.getDataFromIndexedDb = function() {
    //First try and get AppShell data from indexedDB
    localforage.getItem('appShellData').then(function(data) {
      if(data !== null) {
        data.forEach(function(forecast) {
          app.updateForecastCard(forecast);
        })
      }
    })
              
    localforage.keys().then(function(keys) {
      app.updateAppData(keys);
    }).catch(function(err) {
      console.log(err);
    })
  }

  /**
   * Get data from IndexedDb and if there is data
   * Iterate the keys array and get the value use the data to udate forecast cards
   * If there is no saved data use default data
   * @param {*} keys City names saved in IndexedDb
   */
  app.updateAppData = async function(keys){
    if(keys.length === 0) {
      app.updateForecastCard(injectedForecast)
    } else {
      for(var j = 0; j < keys.length; j ++) {
        var _city = keys[j];
        if(_city !== 'appShellData') {
          await localforage.getItem(_city).then(function(_label) {
            app.getForecast(_city, _label)
          });
        }
      }
    }
  }

  // Toggles the visibility of the add new city dialog.
  app.toggleAddDialog = function(visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };

  //Update forecast card with supplied data values
  app.updateForecastCard = function(data) {
    var card = app.visibleCards[data.key];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.label;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.key] = card;
    }
    card.querySelector('.description').textContent = data.currently.summary;
    card.querySelector('.date').textContent =
      new Date(data.currently.time * 1000);
    card.querySelector('.current .icon').classList.add(data.currently.icon);
    card.querySelector('.current .temperature .value').textContent =
      Math.round(data.currently.temperature);
    card.querySelector('.current .feels-like .value').textContent =
      Math.round(data.currently.apparentTemperature);
    card.querySelector('.current .precip').textContent =
      Math.round(data.currently.precipProbability * 100) + '%';
    card.querySelector('.current .humidity').textContent =
      Math.round(data.currently.humidity * 100) + '%';
    card.querySelector('.current .wind .value').textContent =
      Math.round(data.currently.windSpeed);
    card.querySelector('.current .wind .direction').textContent =
      data.currently.windBearing;
    var nextDays = card.querySelectorAll('.future .oneday');
    var today = new Date();
    today = today.getDay();
    for (var i = 0; i < 7; i++) {
      var nextDay = nextDays[i];
      var daily = data.daily.data[i];
      if (daily && nextDay) {
        nextDay.querySelector('.date').textContent =
          app.daysOfWeek[(i + today) % 7];
        nextDay.querySelector('.icon').classList.add(daily.icon);
        nextDay.querySelector('.temp-high .value').textContent =
          Math.round(daily.temperatureMax);
        nextDay.querySelector('.temp-low .value').textContent =
          Math.round(daily.temperatureMin);
      }
    }
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };


  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  // Gets a forecast for a specific city and update the card with the data
  app.getForecast = function(key, label) {
    var url = weatherAPIUrlBase + key + '.json';
    
    //TODO: Use the Cache then N/W strategy, put safety net if n/w runs faster than cache and up date cache one n/w response

    // Make the XHR to get the data, then update the card
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          response.key = key;
          response.label = label;
          app.savedCities.push(response);
          // Update latest AppSell data in IndexedDB
          app.saveToIndexedDB('appShellData', app.savedCities);
          //TODO: Save data to cache and update cache
          app.saveCacheData(request,request.response);
          app.updateForecastCard(response);
        }
      }
    };
    request.open('GET', url);
    request.send();
  };

  // Iterate all of the cards and attempt to get the latest forecast data
  app.updateForecasts = function() {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function(key) {
      app.getForecast(key);
    });
  };

  /***********************************************************************************
   * 
   * Methods for dealing with service workers
   * 
   ***********************************************************************************/
  

  /** Register a serice worker if the browser supports the functionality */
  app.registerServiceWorker = function() {
    if('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/progrssive-worker.js').then(function(registration) {
      })
    }
  }
})();

