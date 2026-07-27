import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, MapPin, MapPinOff, Loader2, Navigation } from 'lucide-react';

// Fix default leaflet marker icons broken by Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom avatar marker
const makeAvatarIcon = (letter, color = '#3b82f6', isMe = false) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        width:${isMe ? 42 : 36}px; height:${isMe ? 42 : 36}px;
        border-radius:50%;
        background:${isMe ? 'linear-gradient(135deg,#10b981,#06b6d4)' : color};
        border:${isMe ? '3px' : '2px'} solid white;
        display:flex; align-items:center; justify-content:center;
        font-size:${isMe ? 15 : 13}px; font-weight:800; color:white;
        box-shadow:0 2px ${isMe ? 12 : 6}px rgba(0,0,0,0.35);
        font-family:sans-serif;
      ">${letter}</div>
    `,
    iconSize: [isMe ? 42 : 36, isMe ? 42 : 36],
    iconAnchor: [isMe ? 21 : 18, isMe ? 21 : 18],
    popupAnchor: [0, isMe ? -24 : -20],
  });

const AVATAR_COLORS = [
  'linear-gradient(135deg,#8b5cf6,#6d28d9)',
  'linear-gradient(135deg,#ef4444,#dc2626)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#ec4899,#db2777)',
  'linear-gradient(135deg,#06b6d4,#0891b2)',
];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// Fly to location helper component
function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 15, { animate: true, duration: 1.2 });
  }, [position, map]);
  return null;
}

const INTERVAL = 30000;

export default function Kuchikus() {
  const navigate = useNavigate();
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);

  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [batchmates, setBatchmates] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [error, setError] = useState('');
  const [mapCenter] = useState([14.4426, 76.9558]); // Karnataka default

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const batch = JSON.parse(localStorage.getItem('selectedBatch') || 'null');
  const batchId = batch?.batchId;

  useEffect(() => {
    if (!currentUser?.id) return;
    initData();

    const ch = supabase.channel(`kuchikus-${batchId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'students' }, (payload) => {
        const s = payload.new;
        if (s.id === currentUser.id) return;
        if (!s.location_sharing || !s.latitude) {
          setBatchmates((prev) => prev.filter((m) => m.id !== s.id));
        } else {
          setBatchmates((prev) => {
            const exists = prev.find((m) => m.id === s.id);
            if (exists) return prev.map((m) => m.id === s.id ? { ...m, ...s } : m);
            return [...prev, s];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      clearWatch();
    };
  }, [currentUser?.id, batchId]);

  const initData = async () => {
    setLoading(true);
    const { data: me } = await supabase
      .from('students').select('location_sharing, latitude, longitude')
      .eq('id', currentUser.id).single();

    if (me?.location_sharing) {
      setSharing(true);
      if (me.latitude && me.longitude) {
        setMyLocation([me.latitude, me.longitude]);
      }
      startWatch();
    }

    await fetchBatchmates();
    setLoading(false);
  };

  const fetchBatchmates = async () => {
    if (!batchId) return;
    const { data } = await supabase
      .from('students')
      .select('id, full_name, latitude, longitude, location_sharing')
      .eq('batch_id', batchId)
      .eq('location_sharing', true)
      .neq('id', currentUser.id)
      .not('latitude', 'is', null);
    setBatchmates(data || []);
  };

  const pushLocation = useCallback(async (lat, lng) => {
    await supabase.from('students').update({
      latitude: lat, longitude: lng,
      location_sharing: true,
      location_updated_at: new Date().toISOString(),
    }).eq('id', currentUser.id);
  }, [currentUser?.id]);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported on this device.');
      return;
    }

    const onPos = (pos) => {
      const { latitude, longitude } = pos.coords;
      setMyLocation([latitude, longitude]);
      pushLocation(latitude, longitude);
    };

    const onErr = () => setError('Could not get location. Check permissions.');

    watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true, maximumAge: 10000, timeout: 15000,
    });

    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(onPos, () => {}, { enableHighAccuracy: true });
    }, INTERVAL);
  }, [pushLocation]);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const stopSharing = useCallback(async () => {
    clearWatch();
    setMyLocation(null);
    await supabase.from('students').update({
      location_sharing: false, latitude: null, longitude: null,
    }).eq('id', currentUser.id);
  }, [clearWatch, currentUser?.id]);

  const toggleSharing = async () => {
    setToggling(true);
    setError('');
    try {
      if (sharing) {
        await stopSharing();
        setSharing(false);
      } else {
        startWatch();
        setSharing(true);
        await fetchBatchmates();
      }
    } catch (err) {
      setError('Failed to toggle location.');
    } finally {
      setToggling(false);
    }
  };

  const centerOnMe = () => {
    if (myLocation) setFlyTo([...myLocation]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      <style>{`
        .leaflet-container { background: #1a1a2e; }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
          padding: 0 !important;
        }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-popup-tip { display: none; }
      `}</style>

      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-14 border-b border-white/10 flex-shrink-0 bg-gray-950 z-[1000]">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/10 text-white active:scale-90 transition">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="font-black text-white text-sm">Kuchikus 📍</p>
          <p className="text-[11px] text-white/40">
            {batchmates.length > 0
              ? `${batchmates.length} batchmate${batchmates.length > 1 ? 's' : ''} on map`
              : sharing ? 'Looking for batchmates…' : 'Share location to see others'}
          </p>
        </div>
        {sharing && myLocation && (
          <button onClick={centerOnMe}
            className="p-2 rounded-xl bg-white/10 text-emerald-400 active:scale-90 transition">
            <Navigation size={18} />
          </button>
        )}
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 bg-gray-950 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-blue-400" />
          </div>
        ) : (
          <MapContainer
            center={myLocation || mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {flyTo && <FlyTo position={flyTo} />}

            {/* My marker */}
            {myLocation && (
              <Marker
                position={myLocation}
                icon={makeAvatarIcon((currentUser?.name || 'Me')[0].toUpperCase(), '', true)}
              >
                <Popup>
                  <div style={{ padding: '8px 12px', fontFamily: 'sans-serif', minWidth: 100 }}>
                    <p style={{ fontWeight: 800, fontSize: 13, margin: '0 0 2px' }}>
                      {currentUser?.name || 'You'}
                    </p>
                    <p style={{ fontSize: 10, color: '#10b981', margin: 0 }}>📍 You're here</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Batchmate markers */}
            {batchmates.map((s) => (
              <Marker
                key={s.id}
                position={[s.latitude, s.longitude]}
                icon={makeAvatarIcon(
                  (s.full_name || '?')[0].toUpperCase(),
                  avatarColor(s.full_name)
                )}
              >
                <Popup>
                  <div style={{ padding: '8px 12px', fontFamily: 'sans-serif', minWidth: 120 }}>
                    <p style={{ fontWeight: 800, fontSize: 13, margin: '0 0 2px' }}>{s.full_name || 'Student'}</p>
                    <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>📍 Sharing location</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        {/* Error */}
        {error && (
          <div className="absolute top-3 left-3 right-3 z-[1000] bg-red-500/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        {/* Toggle pill */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-[1000] px-4">
          <button
            onClick={toggleSharing}
            disabled={toggling}
            className={`flex items-center gap-3 px-6 py-3.5 rounded-full font-black text-sm shadow-2xl transition-all active:scale-95 disabled:opacity-60 ${
              sharing
                ? 'bg-emerald-500 text-white'
                : 'bg-white text-gray-900'
            }`}
          >
            {toggling
              ? <Loader2 size={18} className="animate-spin" />
              : sharing ? <MapPin size={18} /> : <MapPinOff size={18} />
            }
            {toggling
              ? 'Please wait…'
              : sharing
                ? 'Sharing — tap to stop'
                : 'Share location to see batchmates'}
          </button>
        </div>
      </div>
    </div>
  );
}

