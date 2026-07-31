import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const myIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 14);
  }, [center]);
  return null;
}

// Relative time with IST fix (+5.5 hours)
const timeAgo = (ts) => {
  if (!ts) return 'Unknown';
  try {
    const date = new Date(ts);
    const localDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    const now = new Date();
    const seconds = Math.floor(Math.max(0, (now - localDate) / 1000));

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  } catch {
    return 'Unknown';
  }
};
async function getLocationName(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
      {
        headers: {
          'User-Agent': 'StudentsHarate/1.0 (studentsharate.me)',
        }
      }
    );
    const data = await res.json();
    const a = data.address;
    // Priority: village → hamlet → suburb → town → city
    const area = a.village || a.hamlet || a.suburb || a.neighbourhood || 
                 a.town || a.city_district || a.city || a.county || '';
    const state = a.state || '';
    return [area, state].filter(Boolean).join(', ') || 'Unknown location';
  } catch (err) {
    console.error('Nominatim error:', err);
    return 'Location unavailable';
  }
}


export default function BatchMap() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [showPermissionPopup, setShowPermissionPopup] = useState(false);
  const [locationNames, setLocationNames] = useState({});
  const intervalRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const selectedBatch = JSON.parse(localStorage.getItem('selectedBatch') || '{}');
  const myBatchId = selectedBatch?.batchId || currentUser?.batchId;

  // Check location permission
  useEffect(() => {
    if (!navigator.geolocation) {
      setShowPermissionPopup(true);
      return;
    }

    navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted') {
        setLocationEnabled(true);
        updateMyLocation(false);
      } else {
        setShowPermissionPopup(true);
      }
    }).catch(() => setShowPermissionPopup(true));

    fetchLocations();
  }, []);

  // Auto update every 3 minutes
  useEffect(() => {
    if (locationEnabled) {
      intervalRef.current = setInterval(() => {
        updateMyLocation(false);
      }, 3 * 60 * 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [locationEnabled]);

  const fetchLocations = async () => {
    if (!myBatchId) return;
    setLoading(true);

    const { data } = await supabase
      .from('students')
      .select('id, full_name, latitude, longitude, location_updated_at')
      .eq('batch_id', myBatchId)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    setStudents(data || []);
    setLoading(false);

    if (data) {
      data.forEach(async (s) => {
        if (s.latitude && s.longitude) {
          const name = await getLocationName(s.latitude, s.longitude);
          setLocationNames(prev => ({ ...prev, [s.id]: name }));
        }
      });
    }
  };

  const updateMyLocation = (showAlert = true) => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMyLocation({ lat: latitude, lng: longitude });
        setLocationEnabled(true);
        setShowPermissionPopup(false);

        await supabase
          .from('students')
          .update({
            latitude,
            longitude,
            location_updated_at: new Date().toISOString()
          })
          .eq('id', currentUser.id);

        fetchLocations();
      },
      () => {
        if (showAlert) setShowPermissionPopup(true);
      },
      { enableHighAccuracy: true }
    );
  };

  const toggleLocation = () => {
    if (locationEnabled) {
      setLocationEnabled(false);
      setMyLocation(null);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      updateMyLocation(true);
    }
  };

  const defaultCenter = myLocation || { lat: 20.5937, lng: 78.9629 };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 safe-area-top">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-800">
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-lg font-bold tracking-wide">Kuchikus MAP</h1>

        <button
          onClick={toggleLocation}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${
            locationEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          <MapPin size={16} />
          {locationEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Permission Popup */}
      {showPermissionPopup && (
        <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full text-center">
            <MapPin size={48} className="mx-auto text-cyan-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">Turn on Location</h2>
            <p className="text-slate-400 text-sm mb-6">
              To see your batchmates and share your location, please allow location access.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPermissionPopup(false)}
                className="flex-1 py-3 bg-slate-800 rounded-2xl font-medium"
              >
                Not now
              </button>
              <button
                onClick={() => {updateMyLocation(true); setShowPermissionPopup(false);}}
                className="flex-1 py-3 bg-cyan-600 rounded-2xl font-bold"
              >
                Turn On
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Area */}
      <div className="flex-1 relative mt-16 mb-14">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10">
            <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <MapContainer
            center={[defaultCenter.lat, defaultCenter.lng]}
            zoom={myLocation ? 14 : 5}
            style={{ height: '100%', width: '100%' }}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Street">
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satellite">
                <TileLayer
                  attribution='Tiles &copy; Esri'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            {myLocation && <RecenterMap center={[myLocation.lat, myLocation.lng]} />}

            {/* My marker */}
            {myLocation && (
              <Marker position={[myLocation.lat, myLocation.lng]} icon={myIcon}>
                <Popup>
                  <div className="text-sm min-w-[160px]">
                    <p className="font-bold text-blue-600">You</p>
                    <p>{currentUser?.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {locationNames[currentUser?.id] || 'Your location'}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Batchmates markers */}
            {students.map((student) => {
              if (student.id === currentUser?.id) return null;
              return (
                <Marker key={student.id} position={[student.latitude, student.longitude]}>
                  <Popup>
                    <div className="text-sm min-w-[180px]">
                      <p className="font-bold text-base">{student.full_name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {locationNames[student.id] || 'Loading location...'}
                      </p>
                      <p className="text-xs text-cyan-600 mt-1 font-medium">
                        Updated {timeAgo(student.location_updated_at)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-slate-900 border-t border-slate-800 text-center text-sm text-slate-400 safe-area-bottom">
        {students.length} batchmates sharing location
        {locationEnabled && <span className="text-emerald-400 ml-2">• Auto-updating</span>}
      </div>
    </div>
  );
}
