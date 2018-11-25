
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
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };

  var cacheName = 'weatherData';
  var _cacheData = [];
  
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
    app.toggleAddDialog(false);
  });

  /* Event listener for cancel button in add city dialog */
  document.getElementById('butAddCancel').addEventListener('click', function() {
    app.toggleAddDialog(false);
  });

  /**
   * 
   */
  document.addEventListener('DOMContentLoaded', function() {
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
  app.saveData = function (key, label) {
    if('caches' in window) {
      caches.open(key).then(function(cache) {
        cache.put(new Request(key), new Response(label));
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
    if(keys.length === 0) {
      app.updateForecastCard(injectedForecast)
    } else {
      for(var i = 0; i < keys.length; i ++){
        app.getForecast(keys[i], keys[i])
      }
    }
  }

  /**
   * Save data in indexedDb
   */
  app.saveToIndexedDB = function(key, value) {
    localforage.setItem(key, value).then(function(data){
      console.log(data);
    }).catch(function(err){
      console.log(err);
    })
  }

  /**
   * Get keys from IndexedDB
   */
  app.getDataFromIndexedDb = function() {
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
        await localforage.getItem(_city).then(function(_label) {
          app.getForecast(_city, _label)
        });
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
    // Make the XHR to get the data, then update the card
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          response.key = key;
          response.label = label;
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
      navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
        console.log('service worker registered: ' + registration);
      })
    }
  }

  /** Listen for the install event of the service worker and add cache data */
  self.addEventListener('install', function(e){
    e.waitUntil(
      caches.open(cacheName).then(function(cache){
        cache.addAll(_cacheData);
      })
    );
  });

  /** Listen for the active event of the service worker */
  self.addEventListener('activate').then(function(){

  });

  /** Listen for the fetch event of the service worker */
  self.addEventListener('fetch').then(function(){

  })
})();

