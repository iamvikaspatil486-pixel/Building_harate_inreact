import React, { useEffect } from "react";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load script " + src));
    document.body.appendChild(s);
  });
}

export default function CameraFeed({ videoRef, onResults, onError, phase }) {
  useEffect(() => {
    if (phase !== "loading") return;

    let cameraInstance = null;
    let handsInstance = null;
    let localStream = null;

    async function initCameraAndTracking() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        localStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");

        const HandsCtor = window.Hands;
        const CameraCtor = window.Camera;
        if (!HandsCtor || !CameraCtor) {
          throw new Error("MediaPipe libraries failed to initialize.");
        }

        const hands = new HandsCtor({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        hands.onResults(onResults);
        handsInstance = hands;

        const camera = new CameraCtor(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 1280,
          height: 720,
        });
        camera.start();
        cameraInstance = camera;
      } catch (err) {
        onError(err.message || "Failed initializing camera feed.");
      }
    }

    initCameraAndTracking();

    return () => {
      if (cameraInstance) cameraInstance.stop();
      if (handsInstance) handsInstance.close();
      if (localStream) localStream.getTracks().forEach((t) => t.stop());
    };
  }, [phase, videoRef, onResults, onError]);

  return <video ref={videoRef} playsInline autoPlay muted style={videoStyle} />;
}

const videoStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transform: "scaleX(-1)",
  filter: "brightness(0.75)",
};

