import { useState, useEffect, useCallback } from "react";
import {
  Search, Home, Grid3x3, MessageCircle, User, Plus, X, Heart, MapPin,
  Wrench, Sofa, Smartphone, Shirt, BookOpen, Sparkles, Dumbbell, MoreHorizontal, ChevronLeft,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const CATEGORIES = [
  { key: "all", label: "All", icon: Grid3x3, kind: "all" },
  { key: "Furniture", label: "Furniture", icon: Sofa, kind: "goods" },
  { key: "Electronics", label: "Electronics", icon: Smartphone, kind: "goods" },
  { key: "Clothing", label: "Fashion", icon: Shirt, kind: "goods" },
  { key: "Books", label: "Books", icon: BookOpen, kind: "goods" },
  { key: "Sports", label: "Sports", icon: Dumbbell, kind: "goods" },
  { key: "Repair", label: "Repair", icon: Wrench, kind: "services" },
  { key: "Cleaning", label: "Cleaning", icon: Sparkles, kind: "services" },
  { key: "Other", label: "Other", icon: MoreHorizontal, kind: "all" },
];

const POST_CATEGORIES = {
  goods: ["Furniture", "Electronics", "Clothing", "Books", "Sports", "Other"],
  services: ["Repair", "Cleaning", "Tutoring", "Design", "Moving", "Other"],
};

const CARD_COLORS = ["#E7F6EC", "#FDF0E6", "#E9EEFB", "#FCEEEE", "#F1F0FB", "#EAF7F4"];

function colorFor(id) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return CARD_COLORS[sum % CARD_COLORS.length];
}

function catIcon(category) {
  const found = CATEGORIES.find((c) => c.key === category);
  return found ? found.icon : MoreHorizontal;
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function newId() {
  return `listing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getOwnerId() {
  let id = null;
  try {
    id = window.name && window.name.startsWith("owner:") ? window.name.slice(6) : null;
  } catch (e) {}
  if (!id) {
    id = `you_${Math.random().toString(36).slice(2, 10)}`;
    try {
      window.name = `owner:${id}`;
    } catch (e) {}
  }
  return id;
}

const GREEN = "#00A651";
const GREEN_DARK = "#00863F";
const INK = "#1A1D1A";
const GRAY = "#7C8079";
const BORDER = "#EBEEEC";
const BG = "#F4F6F5";

function rowToListing(row) {
  return {
    id: row.id, type: row.type, title: row.title, category: row.category,
    price: row.price, description: row.description, location: row.location,
    contact: row.contact, ownerId: row.owner_id, status: row.status, createdAt: row.created_at,
  };
}

function listingToRow(listing) {
  return {
    id: listing.id, type: listing.type, title: listing.title, category: listing.category,
    price: listing.price, description: listing.description, location: listing.location,
    contact: listing.contact, owner_id: listing.ownerId, status: listing.status, created_at: listing.createdAt,
  };
}

export default function MarketApp() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownerId] = useState(getOwnerId);
  const [activeCat, setActiveCat] = useState("all");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("home");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState({});
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    type: "goods", title: "", category: POST_CATEGORIES.goods[0],
    price: "", description: "", location: "", contact: "",
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setListings((data || []).map(rowToListing));
    } catch (e) {
      showToast("Couldn't load listings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadListings(); }, [loadListings]);

  const postListing = async () => {
    if (!form.title.trim() || !form.price.trim()) {
      showToast("Add a title and price");
      return;
    }
    const listing = {
      id: newId(), type: form.type, title: form.title.trim(), category: form.category,
      price: form.price.trim(), description: form.description.trim() || "No description provided.",
      location: form.location.trim() || "Location not set", contact: form.contact.trim() || "No contact given",
      ownerId, status: "open", createdAt: Date.now(),
    };
    try {
      const { error } = await supabase.from("listings").insert([listingToRow(listing)]);
      if (error) throw error;
      setListings((prev) => [listing, ...prev]);
      setForm({ type: "goods", title: "", category: POST_CATEGORIES.goods[0], price: "", description: "", location: "", contact: "" });
      setShowForm(false);
      showToast("Your ad is live");
      setTab("home");
    } catch (e) {
      showToast("Couldn't post — try again");
    }
  };

  const toggleSold = async (listing) => {
    const newStatus = listing.status === "sold" ? "open" : "sold";
    try {
      const { error } = await supabase.from("listings").update({ status: newStatus }).eq("id", listing.id);
      if (error) throw error;
      const updated = { ...listing, status: newStatus };
      setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setSelected(updated);
      showToast(newStatus === "sold" ? "Marked as sold" : "Marked as available");
    } catch (e) {
      showToast("Couldn't update — try again");
    }
  };

  const toggleSaved = (id) => {
    setSaved((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const visible = listings.filter((l) => {
    if (activeCat !== "all" && l.category !== activeCat) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return l.title.toLowerCase().includes(q) || l.category.toLowerCase().includes(q);
    }
    return true;
  });

  const savedListings = listings.filter((l) => saved[l.id]);
  const myListings = listings.filter((l) => l.ownerId === ownerId);

  return (
    <div style={{ minHeight: "100vh", background: "#DADEDB", display: "flex", justifyContent: "center", padding: "18px 0", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .phone::-webkit-scrollbar { display: none; }
        .phone { scrollbar-width: none; }
        .cat-chip { transition: background 0.15s ease, color 0.15s ease; }
        .card-tap { transition: transform 0.1s ease; cursor: pointer; }
        .card-tap:active { transform: scale(0.97); }
        button { font-family: inherit; }
        input:focus, textarea:focus, select:focus { outline: 2px solid ${GREEN}; outline-offset: 1px; }
        button:focus-visible { outline: 2px solid ${GREEN}; outline-offset: 2px; }
      `}</style>

      <div className="phone" style={{ width: 390, maxWidth: "100vw", height: 780, maxHeight: "94vh", background: "#fff", borderRadius: 28, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column", position: "relative" }}>
        {tab === "home" && (
          <>
            <div style={{ background: GREEN, padding: "16px 14px 14px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <MapPin size={15} color="#fff" />
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Your area</span>
                <span style={{ color: "#DFF5E8", fontSize: 12, marginLeft: "auto", fontWeight: 700 }}>MARKET</span>
              </div>
              <div style={{ position: "relative" }}>
                <Search size={17} color={GRAY} style={{ position: "absolute", left: 12, top: 11 }} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search goods and services"
                  style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 10, border: "none", background: "#fff", fontSize: 14, color: INK }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, padding: "12px 14px", overflowX: "auto", flexShrink: 0, borderBottom: `1px solid ${BORDER}` }}>
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = activeCat === c.key;
                return (
                  <button key={c.key} onClick={() => setActiveCat(c.key)} className="cat-chip"
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: "2px 2px", width: 56 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: active ? GREEN : "#F0F2F0" }}>
                      <Icon size={18} color={active ? "#fff" : GRAY} />
                    </div>
                    <span style={{ fontSize: 10.5, color: active ? GREEN_DARK : GRAY, fontWeight: active ? 700 : 500, textAlign: "center" }}>{c.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ flex: 1, overflowY: "auto", background: BG, padding: "12px 10px 90px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 4px 10px" }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{activeCat === "all" ? "Recent ads" : CATEGORIES.find((c) => c.key === activeCat)?.label}</span>
                <span style={{ fontSize: 11.5, color: GRAY }}>{visible.length} found</span>
              </div>

              {loading && <p style={{ fontSize: 13, color: GRAY, padding: "20px 6px" }}>Loading ads…</p>}

              {!loading && visible.length === 0 && (
                <div style={{ textAlign: "center", padding: "50px 20px", color: GRAY }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: INK, margin: "0 0 4px" }}>No ads yet</p>
                  <p style={{ fontSize: 12.5, margin: 0 }}>Tap Sell below to post the first one.</p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {visible.map((l) => {
                  const Icon = catIcon(l.category);
                  return (
                    <div key={l.id} className="card-tap" onClick={() => setSelected(l)} style={{ background: "#fff", borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                      <div style={{ height: 110, background: colorFor(l.id), display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        <Icon size={30} color="rgba(0,0,0,0.28)" />
                        <button onClick={(e) => { e.stopPropagation(); toggleSaved(l.id); }}
                          style={{ position: "absolute", top: 6, right: 6, background: "rgba(255,255,255,0.85)", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          <Heart size={13} color={saved[l.id] ? "#E0453C" : GRAY} fill={saved[l.id] ? "#E0453C" : "none"} />
                        </button>
                        {l.status === "sold" && (
                          <span style={{ position: "absolute", bottom: 6, left: 6, background: INK, color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>SOLD</span>
                        )}
                      </div>
                      <div style={{ padding: "8px 9px 10px" }}>
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: INK, marginBottom: 2 }}>{/^\$/.test(l.price) ? l.price : `$${l.price}`}</div>
                        <div style={{ fontSize: 12, color: "#3D403C", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10.5, color: GRAY }}>
                          <MapPin size={10} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.location}</span>
                        </div>
                        <div style={{ fontSize: 10, color: "#B0B4AC", marginTop: 2 }}>{timeAgo(l.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === "categories" && (
          <div style={{ flex: 1, overflowY: "auto", background: "#fff" }}>
            <div style={{ padding: "18px 16px 10px", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: INK }}>Categories</span>
            </div>
            {CATEGORIES.filter((c) => c.key !== "all").map((c) => {
              const Icon = c.icon;
              const count = listings.filter((l) => l.category === c.key).length;
              return (
                <button key={c.key} onClick={() => { setActiveCat(c.key); setTab("home"); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F0F2F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={18} color={GREEN_DARK} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: INK, flex: 1 }}>{c.label}</span>
                  <span style={{ fontSize: 12, color: GRAY }}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {tab === "saved" && (
          <div style={{ flex: 1, overflowY: "auto", background: BG }}>
            <div style={{ padding: "18px 16px 10px", background: "#fff", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: INK }}>Saved</span>
            </div>
            {savedListings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: GRAY }}>
                <Heart size={28} color="#C7CBC5" style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 13.5, margin: 0 }}>Ads you save will show up here.</p>
              </div>
            ) : (
              <div style={{ padding: "12px 10px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {savedListings.map((l) => (
                  <div key={l.id} className="card-tap" onClick={() => setSelected(l)} style={{ background: "#fff", borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                    <div style={{ height: 90, background: colorFor(l.id), display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {(() => { const Icon = catIcon(l.category); return <Icon size={26} color="rgba(0,0,0,0.28)" />; })()}
                    </div>
                    <div style={{ padding: "8px 9px" }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: INK }}>{/^\$/.test(l.price) ? l.price : `$${l.price}`}</div>
                      <div style={{ fontSize: 11.5, color: "#3D403C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "profile" && (
          <div style={{ flex: 1, overflowY: "auto", background: "#fff" }}>
            <div style={{ padding: "18px 16px 10px", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: INK }}>My ads</span>
            </div>
            {myListings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: GRAY }}>
                <User size={28} color="#C7CBC5" style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 13.5, margin: 0 }}>You haven't posted anything yet.</p>
              </div>
            ) : (
              <div style={{ padding: "12px 10px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {myListings.map((l) => {
                  const Icon = catIcon(l.category);
                  return (
                    <div key={l.id} className="card-tap" onClick={() => setSelected(l)} style={{ background: "#fff", borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                      <div style={{ height: 90, background: colorFor(l.id), display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        <Icon size={26} color="rgba(0,0,0,0.28)" />
                        {l.status === "sold" && (
                          <span style={{ position: "absolute", bottom: 6, left: 6, background: INK, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>SOLD</span>
                        )}
                      </div>
                      <div style={{ padding: "8px 9px" }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: INK }}>{/^\$/.test(l.price) ? l.price : `$${l.price}`}</div>
                        <div style={{ fontSize: 11.5, color: "#3D403C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!selected && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "8px 6px 12px" }}>
            {[{ key: "home", label: "Home", icon: Home }, { key: "categories", label: "Categories", icon: Grid3x3 }].map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", padding: 4 }}>
                  <Icon size={20} color={active ? GREEN : GRAY} />
                  <span style={{ fontSize: 10, color: active ? GREEN_DARK : GRAY, fontWeight: active ? 700 : 500 }}>{t.label}</span>
                </button>
              );
            })}
            <button onClick={() => setShowForm(true)} style={{ width: 46, height: 46, borderRadius: "50%", background: GREEN, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 10px rgba(0,166,81,0.4)", marginTop: -20 }}>
              <Plus size={22} color="#fff" />
            </button>
            {[{ key: "saved", label: "Saved", icon: Heart }, { key: "profile", label: "Profile", icon: User }].map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)
