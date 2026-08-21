import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function PwaInstall() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Already installed?
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) return;

    // Detect iPhone / iPad
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    // Android / Chrome
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS → show popup after short delay
    if (ios) {
      const timer = setTimeout(() => setShow(true), 1000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      // iOS cannot install programmatically.
      // We still show a clear button + short steps.
      alert(
        "On iPhone:\n\n1. Tap the Share button in Safari\n2. Tap “Add to Home Screen”\n3. Tap Add"
      );
      setShow(false);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center">
            <Download size={24} className="text-white" />
          </div>
        </div>

        <h3 className="text-center text-sm font-black text-white uppercase tracking-widest mb-2">
          Install App
        </h3>

        <p className="text-center text-xs text-slate-400 leading-relaxed mb-5">
          For a better app experience, you should install this web app on your
          phone.
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => setShow(false)}
            className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:text-white transition rounded-xl"
          >
            Cancel
          </button>

          <button
            onClick={handleInstall}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition active:scale-95 shadow-lg shadow-indigo-600/20"
          >
            {isIOS ? "Add to Home Screen" : "Install"}
          </button>
        </div>
      </div>
    </div>
  );
}
