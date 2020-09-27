const TOKEN = 'f5a228c78c288fa207960e823a980a14';
const API_URL = 'https://api.flotiq.com';
const CONTENT_TYPE = 'Store';
const LOCATION_FIELD = 'Location';
const LIMIT = 1000;
const CLEAN_MAP_AT_ZOOM = 9;

let localMarkers = {};
let lastLoad = 0;
let currentPoint = {
  lat: 51.509768,
  lng: -0.12
};

let placeCollection = {};
let doNotUpdate = false;

/**
 * Load store markers to the visible map area
 * @param {L.Map} map 
 * @param {function([Array])} onLoad 
 */
function loadMarkers(map, onLoad) {
  const center = map.getCenter();
  const radius = map.getCenter().distanceTo(map.getBounds().getNorthEast());
    
  
  if (map.getZoom() <= CLEAN_MAP_AT_ZOOM)
    return;
  if (Date.now() - lastLoad < 500)
    return;

  lastLoad = Date.now();

  const url = API_URL
    + '/api/v1/search?'
    + [
      'q=*',
      'geo_filters[' + LOCATION_FIELD + ']=geo_distance,' + radius + 'm,' + center.lat + ',' + center.lng,
      'content_type[]=' + CONTENT_TYPE,
      'limit=' + LIMIT,
      'auth_token=' + TOKEN
    ].join('&');

  fetch(url)
    .then(function (res) { return res.json() })
    .then(onLoad)
}

document.querySelectorAll('[data-map]').forEach(function (mapContainer) {
    /**
     * Create:
     * - Map and its view layer
     * - geocoder control (to search cities)
     * - create variable globalGroup for cluster group which will be created on first load (see onMarkersLoaded)
     */
    let map = L.map(mapContainer).setView(currentPoint, 11);
    
    let globalGroup;
    
    let googleMaps = L.gridLayer.googleMutant({
      type: 'roadmap'	// valid values are 'roadmap', 'satellite', 'terrain' and 'hybrid'
    }).addTo(map);
  
    let osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
       attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
  
    L.control.layers({"Google Maps": googleMaps, "Open Street Map": osm}, null, {position: "bottomleft"}).addTo(map);
  
    const searcher = new L.Control.Geocoder.Nominatim({
      geocodingQueryParams: {
        countrycodes: ['PL','GB']
      }
    });
  
    const geoCoder = L.Control.geocoder({
      defaultMarkGeocode: false,
      collapsed: false,
      showResultIcons: true,
      geocoder: searcher
    }).on('markgeocode', function (e) {
        var bbox = e.geocode.bbox;
        map.fitBounds(bbox);
      })
      .addTo(map);

/**
   * Register mmarkers for display within the map using clustering group
   * @param {Array} collection 
   */
  function onMarkersLoaded(collection) {
    
    placeCollection = collection;

    for (let i = 0; i < collection.data.length; i++) {
      let store = collection.data[i].item;

      if (!globalGroup) {
        /**
         * if the global clustering group for markers doesn't exist, then create it
         */
        globalGroup = L.markerClusterGroup();
        map.addLayer(globalGroup)
      }

      if (localMarkers[store.id])
        continue;


        storePopupHtml = `
        <div class="store-name">
          ${store.StoreName}
        </div>
        <div class="store-street">
          ${store.Street}
        </div>
        <div class="store-directions">
          <a class="store-directions__anchor" style="color:white;" 
          href="https://www.google.com/maps/dir/?api=1&amp;origin=Current+Location&amp;destination=${store.Location.lat},${store.Location.lon}">
          <span style="margin-right: 5px;" class="material-icons">location_on</span>Get Directions</a>
        </div>`;
        
      localMarkers[store.id] = L.marker([store.Location.lat, store.Location.lon])
                                .bindPopup(storePopupHtml);

      globalGroup.addLayer(localMarkers[store.id]);
      
    }
    if(!doNotUpdate) {
      renderList(collection);
    }
    
  }


  loadMarkers(map, onMarkersLoaded);

  
  /**
   * Load data and Handle markers:
   * - after initial loading
   * - after panning
   * - after zoom changed
   */

  map.on('move', function (e) {
    loadMarkers(map, onMarkersLoaded);
    doNotUpdate = true;
  });

  map.on('moveend', function (e) {
    doNotUpdate = false;
    renderList(placeCollection);
  })

  map.on('zoomend', function () {
    if (!globalGroup){
      return;
    }
    if (map.getZoom() <= CLEAN_MAP_AT_ZOOM && map.hasLayer(globalGroup)) {
      map.removeLayer(globalGroup);
    }
    if (map.getZoom() > CLEAN_MAP_AT_ZOOM && map.hasLayer(globalGroup) == false) {
      map.addLayer(globalGroup);
      loadMarkers(map, onMarkersLoaded);
    }
  });

  function getCurrentLocation() {
    map.locate({
      setView: true,
      enableHighAccuracy: true,
      maxZoom: 14
    }).on('locationfound', function(data) {
      currentPoint = {
        lat: data.latlng.lat,
        lng: data.latlng.lng
      }
    }).on('locationerror', function() {
      console.log("Could not find location");
    })
  }

  document.getElementById('currentLocation').addEventListener('click', getCurrentLocation);
  document.getElementById('hide-button').addEventListener('click', function() {
    document.getElementById('search-container').classList.toggle('hide');
  });
  
  const form = document.getElementById('storeSearch');

  form.addEventListener('submit', function(event) {
    event.preventDefault();
    //resetList();

    const formData = new FormData(form);
    const address = formData.get('searchAddress');

    searcher.geocode(address, function(response) {
      
      if(response.length){
        currentPoint = {
          lat: response[0].center.lat,
          lng: response[0].center.lng
        };
        geoCoder.markGeocode(response[0]);
      }
    });

  });

  function renderList(collection = placeCollection) {
    if(!collection) {
      return;
    }
    resetList();
    for (let i = 0; i < collection.data.length; i++) {
      store = collection.data[i].item;
      store.distance = (map.distance({ lat: store.Location.lat, lng: store.Location.lon}, currentPoint)/1000).toFixed(2);
    }

    /* sort by distance */
    collection.data.sort((a, b) => {
      return parseFloat(a.item.distance) - parseFloat(b.item.distance);
    });
    for (let i = 0; i < collection.data.length; i++) {
      store = collection.data[i].item;
      storeTableHtml = `
        <div class="row store-row">
          <div class="col-6">
              ${ store.StoreName }<br>${ store.Street }
          </div>
          <div class="col-3">
              ${ store.distance } km
          </div>
          <div class="col-3" style="text-align: center;">
            <a style="text-decoration:none; color:black;" 
            href="https://www.google.com/maps/dir/?api=1&amp;origin=Current+Location&amp;destination=${store.Location.lat},${store.Location.lon}">
            <span style="font-size: 36px" class="material-icons">location_on</span></a>
          </div>
        </div>
      `;

      document.getElementById('storeTable').insertAdjacentHTML('beforeend', storeTableHtml);
    }
  }

  function resetList() {
    
    const storeTable = document.getElementById('storeTable');
    let lastElement = storeTable.lastElementChild;
    while(lastElement && storeTable.childElementCount > 1) {
        storeTable.removeChild(lastElement);
        lastElement = storeTable.lastElementChild;
    }
  }

});  