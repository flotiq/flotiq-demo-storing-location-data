document.querySelectorAll('[data-map]').forEach(function (mapContainer) {
    /**
     * Create:
     * - Map and its view layer
     * - geocoder control (to search cities)
     * - create variable globalGroup for cluster group which will be created on first load (see onMarkersLoaded)
     */
    let map = L.map(mapContainer).setView({
      lat: 51.509768,
      lng: -0.12
    }, 11);
    
    let globalGroup;
    
    let googleMaps = L.gridLayer.googleMutant({
      type: 'roadmap'	// valid values are 'roadmap', 'satellite', 'terrain' and 'hybrid'
    }).addTo(map);
  
    let osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
       attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
  
    L.control.layers({"Google Maps": googleMaps, "Open Street Map": osm}, null, {position: "bottomleft"}).addTo(map);
});  