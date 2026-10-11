import { useState } from "react";

// Put your samurai image in /public and point to it here (e.g. "/samurai.jpg").
// If it fails to load, the red-sun gradient fallback shows instead.
const HERO_IMAGE = "/samurai.jpg";

const css = `
  .lc-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #14100f;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .lc-card {
    width: 100%;
    max-width: 400px;
    background: #fbf9f7;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
  }
  .lc-hero {
    position: relative;
    height: 240px;
    background:
      radial-gradient(circle at 70% 40%, #f0553f 0 28%, transparent 29%),
      linear-gradient(180deg, #b8645a, #3a1c1a);
    background-size: cover;
    background-position: center;
  }
  .lc-hero img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .lc-blur {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 65%;
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
    background: linear-gradient(to top, rgba(20, 8, 6, 0.75), rgba(20, 8, 6, 0));
    -webkit-mask-image: linear-gradient(to top, #000 45%, transparent);
    mask-image: linear-gradient(to top, #000 45%, transparent);
  }
  .lc-caption {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 0 26px 18px;
    color: #fff;
  }
  .lc-caption h2 {
    margin: 0 0 2px;
    font-size: 26px;
    font-weight: 700;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  }
  .lc-caption p {
    margin: 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.85);
  }
  .lc-body { padding: 24px 26px 28px; }
  .lc-title { margin: 0 0 4px; font-size: 24px; font-weight: 700; color: #1b1412; }
  .lc-sub { margin: 0 0 20px; font-size: 14px; color: #6b5f5a; }
  .lc-field { margin-bottom: 14px; }
  .lc-label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #3a2f2b; }
  .lc-input {
    width: 100%;
    box-sizing: border-box;
    padding: 11px 12px;
    font-size: 15px;
    color: #1b1412;
    background: #fff;
    border: 1.5px solid #d9d0cb;
    border-radius: 8px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .lc-input:focus { border-color: #d6432d; box-shadow: 0 0 0 3px rgba(214, 67, 45, 0.18); }
  .lc-input.lc-bad { border-color: #b3261e; }
  .lc-error { margin-top: 5px; font-size: 12.5px; color: #b3261e; }
  .lc-btn {
    width: 100%;
    margin-top: 8px;
    padding: 12px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    background: #d6432d;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .lc-btn:hover { background: #bb3722; }
  .lc-btn:focus-visible { outline: 3px solid #1b1412; outline-offset: 2px; }
  .lc-btn:disabled { opacity: 0.6; cursor: default; }
  .lc-done { text-align: center; padding: 28px 0 8px; color: #1b1412; }
  .lc-done p { color: #6b5f5a; font-size: 14px; }
`;

const initial = { name: "", email: "", password: "" };

function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = "Enter your name.";
  if (!/^\S+@\S+\.\S+$/.test(v.email)) e.email = "Enter a valid email address.";
  if (v.password.length < 6) e.password = "Use at least 6 characters.";
  return e;
}

export default function LoginCard() {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [imgOk, setImgOk] = useState(true);

  const onChange = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const handleSubmit = async () => {
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      // TODO: replace with your real API call
      // await fetch("/api/signup", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(values) });
      await new Promise((r) => setTimeout(r, 800));
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  const field = (key, label, type, placeholder, autoComplete) => (
    <div className="lc-field">
      <label className="lc-label" htmlFor={`lc-${key}`}>{label}</label>
      <input
        id={`lc-${key}`}
        className={`lc-input${errors[key] ? " lc-bad" : ""}`}
        type={type}
        value={values[key]}
        onChange={onChange(key)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!errors[key]}
      />
      {errors[key] && <div className="lc-error">{errors[key]}</div>}
    </div>
  );

  return (
    <div className="lc-page">
      <style>{css}</style>
      <div className="lc-card">
        <div className="lc-hero">
          {imgOk && (
            <img src={HERO_IMAGE} alt="" onError={() => setImgOk(false)} />
          )}
          <div className="lc-blur" />
          <div className="lc-caption">
            <h2>Welcome</h2>
            <p>Join us and start your journey.</p>
          </div>
        </div>

        <div className="lc-body">
          {done ? (
            <div className="lc-done">
              <h2 className="lc-title">Welcome, {values.name.split(" ")[0]}</h2>
              <p>Your account is ready.</p>
            </div>
          ) : (
            <>
              <h1 className="lc-title">Create your account</h1>
              <p className="lc-sub">Tell us a bit about you to get started.</p>

              {field("name", "Name", "text", "Your full name", "name")}
              {field("email", "Email", "email", "you@example.com", "email")}
              {field("password", "Password", "password", "At least 6 characters", "new-password")}

              <button className="lc-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

