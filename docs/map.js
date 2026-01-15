// MIT License

// Copyright (c) 2020 Roman Gille

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

class RapScriptMap {

    constructor(mapElementId, options = {}) {
        this.mainCategories = new Array();
        this.categories = new Object();
        this.currentCategory = 'all'
        this.map = undefined
        this.isLocal = location.hostname == 'localhost' || location.hostname == '192.168.2.169'
        this.repositoryBaseUrl = 'https://cdn.jsdelivr.net/gh/rapscript/cypher-map@master/'
        this.clusterZoom = options.clusterBelowZoom
        this.markerLayer = undefined
        this.useClustering = (this.clusterZoom !== undefined && typeof (this.clusterZoom) == 'number')
        this.showLocateButton = (options.showLocateButton === true)
        this.showCategorySelection = options.showCategorySelection
        this.onDataReady = options.onDataReady
        this.useCustomMarkers = (options.useCustomMarkers === true)
        this.geoJson = undefined

        // Add loading layer DOM.
        let mapContainer = document.getElementById(mapElementId)
        mapContainer.classList.add('lh-mp-ctnr')
        mapContainer.innerHTML = '<div id="loading"><svg height="100" width="100" class="spinner"><circle cx="50" cy="50" r="20" class="inner-circle" /></svg></div>'

        const resourceVersionTag = '20200619'
        const dataUrl = (this.isLocal ? '../' : this.repositoryBaseUrl) + 'data/germany.geojson?v=' + resourceVersionTag
        const cssUrl = (this.isLocal ? '' : this.repositoryBaseUrl + 'docs/') + 'map-style.css?v=' + resourceVersionTag

        RapScriptHelper.loadCss(cssUrl)
        RapScriptHelper.loadCss('https://use.fontawesome.com/releases/v5.8.1/css/all.css')
        RapScriptHelper.loadCss('https://unpkg.com/leaflet@1.6.0/dist/leaflet.css')
        RapScriptHelper.loadScript('https://unpkg.com/leaflet@1.6.0/dist/leaflet.js', () => {
            this.map = this.createMap(mapElementId, options);
            RapScriptHelper.loadUrl(dataUrl, (data) => this.applyGeoData(data));
        })
        // Add cluster css when clustering is enabled.
        if (this.clusterZoom !== undefined && typeof (this.clusterZoom) == 'number') {
            RapScriptHelper.loadCss('https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css')
            RapScriptHelper.loadCss('https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css')
        }
        if (this.showLocateButton) {
            RapScriptHelper.loadCss('https://cdn.jsdelivr.net/npm/leaflet.locatecontrol@0.71.1/dist/L.Control.Locate.min.css')
        }
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
            RapScriptHelper.loadScript('https://cdn.jsdelivr.net/npm/leaflet.locatecontrol@0.71.1/dist/L.Control.Locate.min.js', () => {
                L.control.locate({ position: 'bottomleft', showCompass: false }).addTo(map);
            })
        }

        return map
    }

    onEachMapFeature(feature, layer) {
        const coord = feature.geometry.coordinates
        const address = '<a onclick="RapScriptHelper.navigate(' + coord[1] + ',' + coord[0] + ')" class="directions-link" title="Route anzeigen">' +
            '<i class="fa fa-directions"></i></a>'/* +
            feature.properties.address.split(', ').join('<br>') */
        // does this feature have a property named popupContent?
        if (feature.properties && feature.properties.name && feature.properties.description) {
            layer.bindPopup(
                '<h3>' + feature.properties.name + '</h3><p>' + feature.properties.description + '</p><p>' + address + '</p>');
        }
    }

    renderMapMarker(geoJsonPoint, coordinatate) {
        const markerFilename = (this.useCustomMarkers ? geoJsonPoint.properties.image : 'marker_default.svg')
        const icon = L.icon({
            iconUrl: (this.isLocal ? '../' : this.repositoryBaseUrl) + 'data/images/' + markerFilename,
            iconSize: [38, 38],
            shadowUrl: (this.isLocal ? '' : this.repositoryBaseUrl + 'docs/') + 'shadow.svg',
            shadowSize: (this.useCustomMarkers ? [50, 50] : [7, 7]),
            shadowAnchor: (this.useCustomMarkers ? [25, 22] : [3.5, -15])
        });
        return L.marker(coordinatate, { icon: icon })
            .bindTooltip(geoJsonPoint.properties.name, { offset: [0, 16] })
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
                RapScriptHelper.loadScript('https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js', () => {
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
            onEachFeature: this.onEachMapFeature,
            pointToLayer: (point, coord) => this.renderMapMarker(point, coord),
            filter: function (feature, layer) {
                const featureCategory = feature.properties.category
                return (featureCategory == filterCategory || filterCategory == 'all')
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
        for (const feature in features) {
            const properties = features[feature]['properties']
            const category = properties['category']

            if (!this.categories.hasOwnProperty(category)) {
                this.categories[category] = true
            }
        }
        this.mainCategories = Object.keys(this.categories).sort()
        console.log(this.categories);

        if (this.showCategorySelection !== false) {
            // Create category selection control.
            const control = L.control({ position: 'topright' });
            control.onAdd = (map) => {
                const div = L.DomUtil.create('div', 'command');

                let categorySelection = '<form><div class="select-wrapper fa fa-angle-down"><select id="category-selection" name="category">'
                categorySelection += '<option value="all">Alle</option>'
                for (const catId in this.mainCategories) {
                    let category = this.mainCategories[catId]
                    categorySelection += '<option value="' + category + '">' + category + '</option>'
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

        this.applyFilter('all');

        // Remove loading overlay.
        document.getElementById('loading').remove()

        // Call handler.
        if (this.onDataReady !== undefined && typeof (this.onDataReady) == 'function') {
            this.onDataReady(this.mainCategories)
        }
    }
}

class RapScriptHelper {

    static loadScript(url, callback = () => { }) {
        const scriptNode = document.createElement("script");
        scriptNode.type = 'text/javascript';
        scriptNode.src = url;
        scriptNode.onreadystatechange = callback
        scriptNode.onload = callback

        document.head.appendChild(scriptNode);
    }

    static loadCss(url) {
        const cssNode = document.createElement("link");
        cssNode.rel = 'stylesheet';
        cssNode.href = url

        document.head.appendChild(cssNode);
    }

    static loadUrl(url, handler) {
        const request = new XMLHttpRequest();
        request.open("GET", url);
        request.send();

        request.onreadystatechange = (e) => {
            if (request.readyState == 4 && request.status == 200) {
                handler(request.responseText)
            }
        }
    }

    static navigate(lat, lon, address) {
        // If it's an iPhone..
        if (address !== undefined && typeof(address) == 'string' &&
            ((navigator.platform.indexOf("iPhone") != -1)
                || (navigator.platform.indexOf("iPod") != -1)
                || (navigator.platform.indexOf("iPad") != -1))
        )
            window.open('https://maps.apple.com/?daddr=' + address);
        else
            window.open('https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lon);
    }
}
