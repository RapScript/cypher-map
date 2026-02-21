/**
 * MapManager handles the creation and management of an interactive map displaying
 * location data from GeoJSON files. It integrates with Leaflet for map rendering,
 * supports clustering, custom markers, and category filtering.
 */
class MapManager {

    /**
     * Creates a new MapManager instance and initializes the interactive map.
     * 
     * @param {string} mapElementId - The ID of the HTML element where the map will be rendered
     * @param {Object} options - Configuration options for the map
     * @param {boolean} [options.showLocateButton=false] - Show user location button
     * @param {boolean} [options.showCategorySelection=true] - Show category dropdown
     * @param {number} [options.clusterBelowZoom] - Zoom level threshold for marker clustering
     * @param {Function} [options.onDataReady] - Callback function called after data loads with categories array
     * @param {boolean} [options.useCustomMarkers=false] - Use custom marker images from properties
     * @param {boolean} [options.isFullScreen=false] - Enable full-screen map mode
     * @param {string} [options.mapBoxKey] - API key for Mapbox (enables Mapbox tiles)
     * @param {string} [options.mapBoxStyle] - Mapbox style ID for custom map styling
     * @param {string} [dataFolder='../data/'] - Path to data folder containing images and GeoJSON files
     * 
     * @throws {Error} If the map element does not exist in the DOM
     */
    constructor(mapElementId, options = {}, dataFolder = '../data/') {
        // Apply options.
        this.clusterZoom = options.clusterBelowZoom
        this.showLocateButton = (options.showLocateButton === true)
        this.showCategorySelection = options.showCategorySelection
        this.onDataReady = options.onDataReady
        this.useCustomMarkers = (options.useCustomMarkers === true)

        // Initialize members.
        this.categories = new Array();
        this.currentCategory = 'all'
        this.map = undefined
        this.isLocal = location.hostname == 'localhost' || location.hostname == '192.168.2.169'
        this.repositoryBaseUrl = 'https://cdn.jsdelivr.net/gh/rapscript/cypher-map@master/'
        this.markerLayer = undefined
        this.useClustering = (this.clusterZoom !== undefined && typeof (this.clusterZoom) == 'number')
        // GeoJSON data parsed from .geojson file.
        this.geoJson = undefined
        this.dataFolder = dataFolder

        // Add loading layer DOM.
        let mapContainer = document.getElementById(mapElementId)
        mapContainer.classList.add('lh-mp-ctnr')
        mapContainer.innerHTML = '<div id="loading"><svg height="100" width="100" class="spinner"><circle cx="50" cy="50" r="20" class="inner-circle" /></svg></div>'

        this.map = this.createMap(mapElementId, options);
    }

    createMap(mapElementId, { mapBoxKey, mapBoxStyle, isFullScreen }) {

        const windowHeight = window.innerHeight
        const mapHeight = document.getElementById(mapElementId).clientHeight

        const map = L.map(mapElementId, {
            zoomControl: false,
            scrollWheelZoom: isFullScreen || (mapHeight / windowHeight) < 0.85,
            dragging: isFullScreen || !L.Browser.mobile,
            tap: isFullScreen || !L.Browser.mobile,
        }).setView([51.3396955, 12.3730747], 13);

        L.control.zoom({ position: 'bottomleft' }).addTo(map)

        if (mapBoxKey !== undefined && typeof (mapBoxKey) == 'string' && mapBoxKey.length > 0) {
            // Use Mapbox if key is provided.
            const mapboxAttribution = 'Data by <a href="http://rapscript.de/" target="_blank">rapscript.de</a> | ' +
                '<a href="https://github.com/RapScript/cypher-map" target="_blank">Code</a> on GitHub' +
                '<br>Map data &copy; <a href="https://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors, ' +
                '<a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank">CC-BY-SA</a>, ' +
                'Imagery © <a href="https://www.mapbox.com/" target="_blank">Mapbox</a>'
            const retinaPart = (window.devicePixelRatio > 1) ? '@2x' : ''
            const useCustomStyle = (mapBoxStyle !== undefined && typeof (mapBoxStyle) == 'string' && mapBoxStyle.length > 0)

            L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}' + retinaPart + '?access_token={accessToken}', {
                attribution: mapboxAttribution,
                maxZoom: 18,
                id: (useCustomStyle ? mapBoxStyle : 'mapbox/streets-v11'),
                tileSize: 512,
                zoomOffset: -1,
                accessToken: mapBoxKey,
            }).addTo(map);
        } else {
            // Use OpenStreetMap as fallback.
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?{foo}', {
                foo: 'bar',
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
            }).addTo(map);
        }

        if (this.showLocateButton) {
            CypherMapDOMHelper.loadScript('https://cdn.jsdelivr.net/npm/leaflet.locatecontrol@0.71.1/dist/L.Control.Locate.min.js', () => {
                L.control.locate({ position: 'bottomleft', showCompass: false }).addTo(map);
            })
        }

        return map
    }

    formatWeekdays(weekdays) {
        const weekdayMap = {
            mo: 'Lunedì',
            tue: 'Martedì',
            wed: 'Mercoledì',
            thu: 'Giovedì',
            fri: 'Venerdì',
            sa: 'Sabato',
            so: 'Domenica'
        };
        return weekdays.map(d => weekdayMap[d] || d).join(', ');
    }

    formatSocialLink(url) {
        try {
            const parsed = new URL(url);
            const hostname = parsed.hostname.replace('www.', '');
            const account = parsed.pathname.split('/').filter(s => s.length > 0)[0];

            let service = hostname;
            if (hostname === 'instagram.com') service = 'Insta';

            return account ?
                service + ': <a href="' + url + '" target="_blank">@' + account + '</a>' :
                '<a href="' + url + '" target="_blank">' + service + '</a>';
        } catch (e) {
            return '<a href="' + url + '" target="_blank">' + url + '</a>';
        }
    }

    formatAddress(address) {
        return address.replace(', ', '<br>')
    }

    onEachMapFeature(feature, layer) {
        if (!feature.properties || !feature.properties.name) return;

        const p = feature.properties;
        let html = '<h3>' + p.name + '</h3>';

        if (p.weekdays && p.weekdays.length > 0) {
            html += '<p class="weekdays">' + this.formatWeekdays(p.weekdays) + '</p>';
        }

        if (p.address) html += '<p class="address">' + this.formatAddress(p.address) + '</p>';
        else if (p.city) html += '<p class="address">' + p.city + '</p>';

        if (p.url) html += '<p class="link">' + this.formatSocialLink(p.url) + '</p>';

        layer.bindPopup(html, { offset: [0, -30] });
    }

    renderMapMarker(geoJsonPoint, coordinatate) {
        const markerFilename = (this.useCustomMarkers ? geoJsonPoint.properties.image : 'marker_mic.svg')
        const icon = L.icon({
            iconUrl: this.dataFolder + 'images/' + markerFilename,
            iconSize: [38, 38],
            iconAnchor: [19, 38],
            shadowUrl: this.dataFolder + 'images/shadow.svg',
            shadowSize: (this.useCustomMarkers ? [50, 50] : [7, 7]),
            shadowAnchor: (this.useCustomMarkers ? [25, 22] : [3.5, 5])
        });
        return L.marker(coordinatate, { icon: icon })
            .bindTooltip(geoJsonPoint.properties.name, { offset: [0, 0] })
    }

    setMarkerLayer(layer, map, zoomToSelection = false) {

        if (this.markerLayer !== undefined) {
            map.removeLayer(this.markerLayer)
        }

        if (this.useClustering) {

            const addClusterLayer = (layer, map) => {
                const markers = L.markerClusterGroup({
                    disableClusteringAtZoom: this.clusterZoom
                });
                markers.addLayer(layer)
                this.markerLayer = markers
                map.addLayer(markers)
            }

            if (L.markerClusterGroup === undefined) {
                CypherMapDOMHelper.loadScript('https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js', () => {
                    addClusterLayer(layer, map)
                })
            } else {
                addClusterLayer(layer, map)
            }
        } else {
            layer.addTo(map)
            this.markerLayer = layer
        }

        if (zoomToSelection) {
            map.fitBounds(L.featureGroup([this.markerLayer]).getBounds())
        }
    }

    applyFilter(filterCategory, zoomToSelection = false) {

        const geoLayer = L.geoJSON(this.geoJson, {
            onEachFeature: (feature, layer) => this.onEachMapFeature(feature, layer),
            pointToLayer: (point, coord) => this.renderMapMarker(point, coord),
            filter: function (feature, layer) {
                return (feature.info.categories.includes(filterCategory) || filterCategory == 'all')
            }
        })

        this.setMarkerLayer(geoLayer, this.map, zoomToSelection)
    }

    selectCategory(selectedCategory) {
        this.applyFilter(selectedCategory, true)
        this.currentCategory = selectedCategory
    }

    applyGeoData(data) {

        this.geoJson = JSON.parse(data);
        const features = this.geoJson['features'];

        // Collect categories.
        for (const featIndex in features) {
            const info = new LocationInfo(features[featIndex]['properties'])
            features[featIndex]['info'] = info

            for (const catIndex in info.categories) {
                const category = info.categories[catIndex]
                if (!this.categories.includes(category)) {
                    this.categories.push(category)
                }
            }
        }
        console.log(this.categories);

        if (this.showCategorySelection !== false && this.categories.length > 0) {
            // Create category selection control.
            const control = L.control({ position: 'topright' });
            control.onAdd = (map) => {
                const div = L.DomUtil.create('div', 'command');

                let categorySelection = '<form><div class="select-wrapper fa fa-angle-down"><select id="category-selection" name="category">'
                categorySelection += '<option value="all">tutti</option>'
                for (const catId in this.categories) {
                    let category = this.categories[catId]
                    categorySelection += '<option value="' + category + '">' + this.formatWeekdays([category]) + '</option>'
                }
                categorySelection += '</select></div></form>'

                div.innerHTML = categorySelection;
                return div;
            };
            control.addTo(this.map);
            document
                .getElementById('category-selection')
                .addEventListener('change', (event) => this.selectCategory(event.target.value), false);
        }

        this.applyFilter('all', true);

        // Remove loading overlay.
        document.getElementById('loading').remove()

        // Call handler.
        if (this.onDataReady !== undefined && typeof (this.onDataReady) == 'function') {
            this.onDataReady(this.categories)
        }
    }
}
