import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PhoneOff, SkipForward } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function MiniOmegle() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle, searching, connected
  const [partnerName, setPartnerName] = useState('');

  const myVideoRef = useRef(null);
  const partnerVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const queueIdRef = useRef(null);
  const channelRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const myName = currentUser?.name || 'Student';

  const startChat = async () => {
    setStatus('searching');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      myVideoRef.current.srcObject = stream;

      const { data: queue } = await supabase
        .from('video_queue')
        .insert({ student_id: currentUser.id, student_name: myName, status: 'waiting' })
        .select().single();

      queueIdRef.current = queue.id;

      // Listen for match
      const channel = supabase.channel(`video-${queue.id}`);
      channel.on('broadcast', { event: 'match' }, handleMatchFound).subscribe();
      channelRef.current = channel;

    } catch (err) {
      alert("Camera or microphone permission denied");
      setStatus('idle');
    }
  };

  const handleMatchFound = async (payload) => {
    setPartnerName(payload.partnerName);
    setStatus('connected');

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peerConnectionRef.current = pc;

    localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));

    pc.ontrack = (e) => {
      partnerVideoRef.current.srcObject = e.streams[0];
    };

    // Simple signaling (can be expanded)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    // In production, send offer via Supabase broadcast
  };

  const nextPartner = () => {
    endCurrentCall();
    startChat();
  };

  const endChat = () => {
    endCurrentCall();
    navigate('/home');
  };

  const endCurrentCall = () => {
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    if (peerConnectionRef.current) peerConnectionRef.current.close();
    if (queueIdRef.current) {
      supabase.from('video_queue').update({ status: 'ended' }).eq('id', queueIdRef.current);
    }
    setStatus('idle');
    setPartnerName('');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="p-4 flex items-center justify-between bg-zinc-900">
        <button onClick={() => navigate('/home')}><ArrowLeft size={24} /></button>
        <h1 className="text-xl font-bold">Mini Omegle</h1>
      </div>

      <div className="flex-1 relative">
        <video ref={partnerVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

        <div className="absolute bottom-4 right-4 w-40 aspect-video bg-zinc-900 rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg">
          <video ref={myVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>

        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/70 text-white px-6 py-2 rounded-full text-sm">
          {status === 'searching' && "Finding a student..."}
          {status === 'connected' && `Chatting with ${partnerName}`}
        </div>
      </div>

      {status === 'connected' && (
        <div className="p-6 flex justify-center gap-10 bg-zinc-900">
          <button onClick={nextPartner} className="flex flex-col items-center text-white">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
              <SkipForward size={32} />
            </div>
            <span className="text-xs mt-1">Next</span>
          </button>

          <button onClick={endChat} className="flex flex-col items-center text-red-500">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
              <PhoneOff size={32} />
            </div>
            <span className="text-xs mt-1">End Chat</span>
          </button>
        </div>
      )}

      {status === 'idle' && (
        <div className="p-8 flex flex-col items-center justify-center flex-1">
          <button 
            onClick={startChat}
            className="bg-green-600 hover:bg-green-500 px-12 py-5 rounded-3xl text-xl font-bold active:scale-95 transition"
          >
            Start Random Video Chat
          </button>
          <p className="text-zinc-500 mt-4 text-sm">Talk to random college students</p>
        </div>
      )}
    </div>
  );
}
