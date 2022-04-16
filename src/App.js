import './App.css';
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import {useCallback, useEffect, useRef, useState} from "react";
import L from "leaflet";
import "leaflet-draw";
import "leaflet-routing-machine";
import {randomMailboxPoints} from "./randomMailboxPoints";

/**
 * @typedef {Object} MapRef
 * @property {L.Map} current
 */


const mailboxesPoints = randomMailboxPoints;
// custom marker Icons
const startIcon = L.icon({
    iconUrl: 'images/map/start-flag.png',
    iconSize: [30, 30], // size of the icon
    iconAnchor: [15, 30], // point of the icon which will correspond to marker's location
    popupAnchor: [-3, -30] // point from which the popup should open relative to the iconAnchor
});
const stopIcon = L.icon({
    iconUrl: 'images/map/stop-point.png',
    iconSize: [30, 30], // size of the icon
    iconAnchor: [15, 30], // point of the icon which will correspond to marker's location
    popupAnchor: [-3, -30] // point from which the popup should open relative to the iconAnchor
});
const endIcon = L.icon({
    iconUrl: 'images/map/end-flag.png',
    iconSize: [30, 30], // size of the icon
    iconAnchor: [15, 30], // point of the icon which will correspond to marker's location
    popupAnchor: [-3, -30] // point from which the popup should open relative to the iconAnchor
});
const mailboxIcon = L.icon({
    iconUrl: 'images/map/mailbox.png',
    iconSize: [30, 30], // size of the icon
    iconAnchor: [15, 30], // point of the icon which will correspond to marker's location
    popupAnchor: [-3, -30] // point from which the popup should open relative to the iconAnchor
});


function App() {
    /**
     * Map reference
     * @type {MapRef}
     */
    const map = useRef();

    const [distance, setDistance] = useState(100);
    const [nearestMailboxes, setNearestMailboxes] = useState([]);
    const [markers, _setMarkers] = useState([]);
    const routing = useRef(null);
    const mailboxesMarkers = useRef([]);
    const coverageMarkers = useRef([]);

    /**
     * making refs to markers to keep it updated in the event listeners
     * and to avoid useEffect to be called on every marker's update
     */
    const markersRef = useRef(markers);
    const setMarkers = (markers) => {
        markersRef.current = markers;
        _setMarkers(markers);
    };

    const initMap = () => {
        map.current = L.map('map').setView([33.3152, 44.3661], 13);
        L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            maxZoom: 18,
            id: 'mapbox/streets-v11',
            tileSize: 512,
            zoomOffset: -1,
            accessToken: 'pk.eyJ1IjoiaXNtYWhtb29kIiwiYSI6ImNsMXZjcHV5ZjAyaXUza3BsdWZsaG5heXoifQ.JpCyc1hAFZ8DxvxLDcMU0w'
        }).addTo(map.current);
        if(mailboxesMarkers.current.length < 1) {
            mailboxesPoints.forEach((point, idx) => {
                const marker = L.marker(point, {icon: mailboxIcon}).addTo(map.current);
                marker.bindPopup(`Mailbox ${idx + 1}`);
                mailboxesMarkers.current.push(marker);
            });
        }
    }

    const initDrawer = () => {
        const drawControl = new L.Control.Draw({
            draw: {
                polyline: false,
                polygon: false,
                circle: false,
                marker: {
                    icon: stopIcon,
                    repeatMode: true
                },
                circlemarker: false,
                rectangle: false,
            },
            marker: {
                icon: stopIcon //Here assign your custom marker
            },
            edit: {
                featureGroup: new L.FeatureGroup(),
                edit: false,
                remove: false
            },
        });
        map.current.addControl(drawControl);
    }

    const updateIcons = () => {
        if (markersRef.current.length < 2) return;
        markersRef.current[0].setIcon(startIcon);
        markersRef.current[markersRef.current.length - 1].setIcon(endIcon);
        for (let i = 1; i < markersRef.current.length - 1; i++) {
            markersRef.current[i].setIcon(stopIcon);
        }
    }


    const initDrawerListeners = useCallback(() => {
        map.current.on(L.Draw.Event.CREATED, function (e) {
            if (e.layerType === 'marker') {
                e.layer.options.icon = markersRef.current.length > 0 ? stopIcon : startIcon;
                setMarkers([...markersRef.current, e.layer]);
                updateIcons()
                e.layer.on('click', function (e) {
                    e.target.remove();
                    const coverage = coverageMarkers.current.find(cvMarker => cvMarker._latlng === e.target._latlng);
                    if(coverage) coverage.remove();
                    setMarkers(markersRef.current.filter(m => m !== e.target));
                    updateIcons()
                })
            }
            map.current.addLayer(e.layer)
        });
    }, [])


    const initRoutingPath = (nMarkers) => {
        if (nMarkers.length < 1) return;
        if (!routing.current) {
            routing.current = L.Routing.control({
                waypoints: nMarkers.map(m => m._latlng),
                routeWhileDragging: false,
                show: false,
                autoRoute: true,
                lineOptions: {
                    color: 'blue'
                },
                createMarker: () => false,
                router: L.Routing.mapbox('pk.eyJ1IjoiaXNtYWhtb29kIiwiYSI6ImNsMXZjcHV5ZjAyaXUza3BsdWZsaG5heXoifQ.JpCyc1hAFZ8DxvxLDcMU0w')
            }).addTo(map.current);
        } else {
            routing.current.setWaypoints(nMarkers.map(m => m._latlng));
        }

    }

    function getNearestPoints(point, points) {
        const nearest = [];
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const d = L.latLng(p[0], p[1]).distanceTo(point);
            if (d <= distance) {
                nearest.push({
                    name: `Mailbox ${i + 1}`,
                    point: p,
                    distance: d
                })
            }
        }
        return nearest;
    }

    const highlightMailbox = (mailbox) => {
        const mailboxMarker = mailboxesMarkers.current.find((m) => m._latlng.lat === mailbox.point[0] && m._latlng.lng === mailbox.point[1]);
        mailboxMarker.openPopup();
        map.current.fitBounds(mailboxMarker.getLatLng().toBounds(100));

    }


    const calculateMailboxes = () => {
        let _tempMailboxes = [];
        coverageMarkers.current.forEach(cvMarker => cvMarker.remove());
        markers.forEach(marker => {
            const nearest = getNearestPoints(marker._latlng, mailboxesPoints);
            const cvMarker = L.circle(marker._latlng, {radius: distance}).addTo(map.current);
            coverageMarkers.current.push(cvMarker)
            _tempMailboxes = [..._tempMailboxes, ...nearest];
        });
        // remove duplicates to avoid duplicates in the list
        const uniqueMailboxes = _tempMailboxes.reduce((acc, curr) => {
            if (!acc.find(m => m.point[0] === curr.point[0] && m.point[1] === curr.point[1])) {
                acc.push(curr);
            }
            return acc;
        }, []);
        setNearestMailboxes(uniqueMailboxes);

    };


    const resetMap = useCallback(() => {
        setMarkers([]);
        setNearestMailboxes([]);
        coverageMarkers.current = [];
        routing.current.setWaypoints([]);
        routing.current = null;
        mailboxesMarkers.current = [];
        map.current.off();
        map.current.remove();
        initMap();
        initDrawer()
        initDrawerListeners();
    }, [initDrawerListeners])

    // init map and drawer
    useEffect(() => {
        if(!map.current) {
            initMap();
            initDrawer();
        }
    }, [])
    // init drawer listeners
    useEffect(() => {
        initDrawerListeners()
    }, [initDrawerListeners])
    // init routing on markers change
    useEffect(() => {
        if (markers.length > 1) {
            initRoutingPath(markers);
        }
    }, [markers])


    return (
        <div className="App">
            {markers.length > 1 && <div className={'overlay-sidebar'}>
                <div className={'overlay-sidebar__body'}>
                    <div className={'overlay-sidebar__input'}>
                        <label>
                            Buffer Distance in meters
                            <input type="number" value={distance} onChange={(e) => setDistance(e.target.value)}/>
                        </label>
                    </div>
                    <button className={'btn btn--block'} onClick={calculateMailboxes}>
                        Calculate Mailboxes
                    </button>
                    <button className={'btn btn--danger btn--block'} onClick={resetMap}>
                        Reset Map
                    </button>
                    <p>Mailboxes You can collect in your way: {nearestMailboxes.length}</p>

                    <ul className={'overlay-sidebar__list'}>
                        {nearestMailboxes.map(mailbox => {
                            return <li key={mailbox.name} onClick={() => highlightMailbox(mailbox)}>{mailbox.name}</li>
                        })}
                    </ul>
                </div>
            </div>}
            <div id="map"/>
        </div>
    );
}

export default App;
