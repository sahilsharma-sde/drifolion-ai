import { useLayoutEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

// Google only accepts a pixel width between 200 and 400 (not "100%").
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function GoogleAuthButton({ onSuccess, onError }) {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(MAX_WIDTH);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w) setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [googleClientId]);

  if (!googleClientId) {
    // Visitors of a deployed site see nothing (no broken button), but while
    // developing, say why the button is missing instead of hiding silently.
    if (import.meta.env.DEV) {
      return (
        <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Google sign-in is hidden: VITE_GOOGLE_CLIENT_ID isn't set in
          frontend/.env. Add it, then restart <code>npm run dev</code>.
        </p>
      );
    }
    return null;
  }

  return (
    <div ref={wrapRef} className="flex justify-center w-full">
      <GoogleLogin
        key={width}
        onSuccess={(credentialResponse) => {
          onSuccess(credentialResponse.credential);
        }}
        onError={() => onError("Google sign-in failed. Please try again.")}
        theme="filled_black"
        shape="pill"
        width={width}
      />
    </div>
  );
}
