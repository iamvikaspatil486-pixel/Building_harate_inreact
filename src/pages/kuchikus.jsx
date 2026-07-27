import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import { ArrowLeft, LocateFixed, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Blue icon for current user
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

export default function Kuchikus() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState(null);
  const [error, setError] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const selectedBatch = JSON.parse(localStorage.getItem('selectedBatch') || '{}');
  const myBatchId = selectedBatch?.batchId || currentUser?.batchId;

  const fetchLocations = async () => {
    if (!myBatchId) {
      setError('No batch selected');
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, roll_no, latitude, longitude, location_updated_at')
      .eq('batch_id', myBatchId)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) {
      setError(error.message);
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  };

  const updateMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMyLocation({ lat: latitude, lng: longitude });

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
      (err) => {
        alert('Unable to get your location. Please allow location access.');
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const defaultCenter = myLocation || { lat: 20.5937, lng: 78.9629 };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-800">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Batchmates Map</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchLocations}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={updateMyLocation}
            className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500"
          >
            <LocateFixed size={18} />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
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
            {/* Layer Control (Street / Satellite) */}
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Street">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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

            {/* My location (blue) */}
            {myLocation && (
              <Marker position={[myLocation.lat, myLocation.lng]} icon={myIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold text-blue-600">You</p>
                    <p>{currentUser?.name}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Batchmates */}
            {students.map((student) => {
              if (student.id === currentUser?.id) return null;
              return (
                <Marker
                  key={student.id}
                  position={[student.latitude, student.longitude]}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold">{student.full_name}</p>
                      <p className="text-gray-500">Roll: {student.roll_no}</p>
                      {student.location_updated_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          Updated: {new Date(student.location_updated_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Bottom bar */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 text-center text-sm text-slate-400">
        {students.length} batchmates with location • 
        <button onClick={updateMyLocation} className="text-cyan-400 ml-1 underline">
          Share my location
        </button>
      </div>
    </div>
  );
}
