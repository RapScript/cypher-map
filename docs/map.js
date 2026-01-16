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

class FreestyleRapCypherMap {
    constructor(mapElementId, options = {}) {
        this.isLocal = location.hostname == 'localhost' || location.hostname == '192.168.2.169'
        this.mapManager = undefined
        this.repositoryBaseUrl = 'https://cdn.jsdelivr.net/gh/rapscript/cypher-map@master/'

        const resourceVersionTag = '202006120'
        const dataFolder = (this.isLocal ? '../' : this.repositoryBaseUrl) + 'data/'
        const dataUrl = dataFolder + 'italy.geojson?v=' + resourceVersionTag
        const cssUrl = (this.isLocal ? '' : this.repositoryBaseUrl + 'docs/') + 'map-style.css?v=' + resourceVersionTag

        CypherMapDOMHelper.loadCss(cssUrl)
        CypherMapDOMHelper.loadCss('https://use.fontawesome.com/releases/v5.8.1/css/all.css')
        CypherMapDOMHelper.loadCss('https://unpkg.com/leaflet@1.6.0/dist/leaflet.css')
        CypherMapDOMHelper.loadScript('https://unpkg.com/leaflet@1.6.0/dist/leaflet.js', () => {
            CypherMapDOMHelper.loadScript('includes/MapManager.js', () => {
                this.mapManager = new MapManager( mapElementId, options, dataFolder )
                CypherMapDOMHelper.loadUrl( dataUrl, (data) => this.mapManager.applyGeoData(data) );
            })
        })
        // Add cluster css when clustering is enabled.
        if (this.clusterZoom !== undefined && typeof (this.clusterZoom) == 'number') {
            CypherMapDOMHelper.loadCss('https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css')
            CypherMapDOMHelper.loadCss('https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css')
        }
        if (this.showLocateButton) {
            CypherMapDOMHelper.loadCss('https://cdn.jsdelivr.net/npm/leaflet.locatecontrol@0.71.1/dist/L.Control.Locate.min.css')
        }
    }
}

class CypherMapDOMHelper {

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
