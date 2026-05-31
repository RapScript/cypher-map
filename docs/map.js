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

const _mapScriptSrc = document.currentScript?.src ?? ''

class FreestyleRapCypherMap {
    constructor(mapElementId, options = {}) {
        this.mapManager = undefined

        const isLocal = location.hostname == 'localhost' || location.hostname == '192.168.2.169'
        const cacheBuster = isLocal ? '?cb=' + Date.now() : '';
        const versionTag = (_mapScriptSrc.match(/@([^/]+)\//) ?? [])[1]
        const repositoryBaseUrl = 'https://cdn.jsdelivr.net/gh/rapscript/cypher-map' + (versionTag ? '@' + versionTag : '') + '/'
        const dataFolder = (isLocal ? '../' : repositoryBaseUrl) + 'data/'
        const webRootFolder = isLocal ? '' : repositoryBaseUrl + 'docs/'
        const cssUrl = webRootFolder + 'map-style.css'

        console.log('Loading Cypher Map version ' + versionTag + ' from ' + repositoryBaseUrl)

        CypherMapDOMHelper.loadCss('https://use.fontawesome.com/releases/v5.8.1/css/all.css')
        CypherMapDOMHelper.loadCss('https://unpkg.com/leaflet@1.6.0/dist/leaflet.css')
        CypherMapDOMHelper.loadCss(cssUrl)
        this._init(mapElementId, options, dataFolder, webRootFolder, cacheBuster)
        // Add cluster css when clustering is enabled.
        if (this.clusterZoom !== undefined && typeof (this.clusterZoom) == 'number') {
            CypherMapDOMHelper.loadCss('https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css')
            CypherMapDOMHelper.loadCss('https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css')
        }
        if (this.showLocateButton) {
            CypherMapDOMHelper.loadCss('https://cdn.jsdelivr.net/npm/leaflet.locatecontrol@0.71.1/dist/L.Control.Locate.min.css')
        }
    }

    async _init(mapElementId, options, dataFolder, webRootFolder, cacheBuster) {
        await CypherMapDOMHelper.loadScript('https://unpkg.com/leaflet@1.6.0/dist/leaflet.js')
        await CypherMapDOMHelper.loadScript(webRootFolder + 'includes/MapManager.js' + cacheBuster)
        this.mapManager = new MapManager(mapElementId, options, dataFolder)
        await CypherMapDOMHelper.loadScript(webRootFolder + 'includes/LocationInfo.js' + cacheBuster)
        const response = await fetch(dataFolder + 'italy.geojson' + cacheBuster)
        this.mapManager.applyGeoData(await response.text())
    }
}

class CypherMapDOMHelper {

    static loadScript(url) {
        return new Promise((resolve, reject) => {
            const scriptNode = document.createElement('script')
            scriptNode.type = 'text/javascript'
            scriptNode.src = url
            scriptNode.onload = resolve
            scriptNode.onerror = reject
            document.head.appendChild(scriptNode)
        })
    }

    static loadCss(url) {
        const cssNode = document.createElement("link");
        cssNode.rel = 'stylesheet';
        cssNode.href = url

        document.head.appendChild(cssNode);
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
