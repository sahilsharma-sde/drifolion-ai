import { useEffect, useState } from "react";
import { LogoMark } from "../branding/Logo";

/**
 * Desktop: sidebar sits beside the chat.
 * Phones/tablets (<= 768px): the sidebar becomes a slide-in drawer opened
 * from a top bar, so the chat gets the full screen width.
 */
export default function MainLayout({ sidebar, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Escape closes the drawer; lock page scroll behind it while open.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Picking a chat or starting a new one should reveal the conversation.
  const closeOnNavigate = (e) => {
    if (e.target.closest(".conversation-item, .new-chat-btn, .guest-footer a")) {
      setDrawerOpen(false);
    }
  };

  return (
    <div className="app-layout">
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 7H20M4 12H20M4 17H14"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <span className="mobile-topbar-brand">
          <LogoMark size={22} />
          <span className="font-display">Nexus AI</span>
        </span>
      </header>

      <div
        className={`drawer-backdrop ${drawerOpen ? "open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`sidebar-slot ${drawerOpen ? "open" : ""}`}
        onClick={closeOnNavigate}
      >
        <button
          type="button"
          className="drawer-close"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
        >
          ×
        </button>
        {sidebar}
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
