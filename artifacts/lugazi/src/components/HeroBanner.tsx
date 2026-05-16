import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import CloudinaryUploader, { UploadResult } from "@/components/CloudinaryUploader";
import {
  X, ChevronLeft, ChevronRight, Cake, Megaphone, Plus, Trash2,
  ExternalLink, Send, Settings2, Pin, Clock, Image as ImageIcon, Video, Check,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BannerAnnouncement {
  id: number; title: string; message: string; audience: string;
  mediaUrl: string | null; mediaType: string | null;
  bgGradient: string | null; linkUrl: string | null; linkLabel: string | null;
  expiresAt: string | null; isPinned: boolean | null; createdAt: string;
}

interface Member { id: number; fullName: string; birthday: string | null; photoUrl: string | null; }

interface Slide {
  key: string;
  kind: "birthday" | "hero";
  member?: Member;
  banner?: BannerAnnouncement;
  gradient: string;
}

// ─── Gradient presets ─────────────────────────────────────────────────────────

const GRADIENTS: Record<string, { from: string; mid: string; to: string; label: string }> = {
  violet: { from: "#7c3aed", mid: "#8b5cf6", to: "#6366f1", label: "Violet" },
  rose:   { from: "#e11d48", mid: "#ec4899", to: "#a21caf", label: "Rose" },
  amber:  { from: "#d97706", mid: "#f59e0b", to: "#dc2626", label: "Amber" },
  blue:   { from: "#2563eb", mid: "#0ea5e9", to: "#0d9488", label: "Blue" },
  green:  { from: "#059669", mid: "#10b981", to: "#0891b2", label: "Green" },
  cyan:   { from: "#0891b2", mid: "#6366f1", to: "#7c3aed", label: "Cyan" },
};

function gradientStyle(key: string | null): React.CSSProperties {
  const g = GRADIENTS[key ?? "violet"] ?? GRADIENTS.violet;
  return { background: `linear-gradient(135deg, ${g.from} 0%, ${g.mid} 50%, ${g.to} 100%)` };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isTodayBirthday(birthday: string): boolean {
  const today = new Date();
  const parts = birthday.split("-");
  return Number(parts[1]) - 1 === today.getMonth() && Number(parts[2]) === today.getDate();
}

function loadDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem("hero_dismissed") || "[]")); } catch { return new Set(); }
}
function saveDismissed(s: Set<string>) {
  localStorage.setItem("hero_dismissed", JSON.stringify([...s]));
}

// ─── Floating particles ───────────────────────────────────────────────────────

function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20"
          style={{
            width: `${4 + (i % 5) * 3}px`,
            height: `${4 + (i % 5) * 3}px`,
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            background: "white",
            animation: `float-particle ${3 + (i % 4)}s ease-in-out ${(i * 0.4)}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes float-particle {
          from { transform: translateY(0px) scale(1); opacity: 0.15; }
          to   { transform: translateY(-12px) scale(1.3); opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function BirthdayAvatar({ member }: { member: Member }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative flex-shrink-0">
      <div
        className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl"
        style={{ boxShadow: "0 0 0 4px rgba(255,255,255,0.15), 0 0 30px rgba(255,255,255,0.3)" }}
      >
        {member.photoUrl && !failed ? (
          <img
            src={member.photoUrl}
            alt={member.fullName}
            className="w-full h-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/20 text-white font-bold text-3xl md:text-4xl">
            {member.fullName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-lg shadow-lg border-2 border-white/50">
        🎂
      </div>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          animation: "pulse-ring 2s ease-out infinite",
          boxShadow: "0 0 0 0 rgba(255,255,255,0.4)",
        }}
      />
      <style>{`
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
          70%  { box-shadow: 0 0 0 16px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
      `}</style>
    </div>
  );
}

// ─── Admin form ───────────────────────────────────────────────────────────────

const BLANK_FORM = {
  title: "", message: "", bgGradient: "violet",
  mediaUrl: "", mediaType: "", linkUrl: "", linkLabel: "",
  expiresAt: "", audience: "all", isPinned: false,
};

function AdminPanel({
  banners, onClose, onCreated, onDeleted,
}: {
  banners: BannerAnnouncement[];
  onClose: () => void;
  onCreated: () => void;
  onDeleted: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState(BLANK_FORM);
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const f = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  async function handleCreate() {
    if (!form.title.trim() || !form.message.trim()) return;
    setSaving(true);
    try {
      await axios.post("/api/announcements", {
        ...form,
        type: "hero",
        sentBy: user?.displayName ?? "Admin",
        mediaUrl: upload?.url || form.mediaUrl || null,
        mediaType: upload ? (upload.resourceType === "video" ? "video" : "image") : (form.mediaType || null),
        expiresAt: form.expiresAt || null,
        isPinned: form.isPinned,
      });
      setForm(BLANK_FORM);
      setUpload(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onCreated();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this banner?")) return;
    await axios.delete(`/api/announcements/${id}`);
    onDeleted();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-end p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Manage Hero Banners</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Existing banners */}
          {banners.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Active Banners ({banners.length})</p>
              <div className="space-y-2">
                {banners.map(b => (
                  <div key={b.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/30">
                    <div
                      className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                      style={gradientStyle(b.bgGradient)}
                    >
                      {b.mediaType === "video" ? <Video className="h-3.5 w-3.5 text-white" /> :
                       b.mediaUrl ? <ImageIcon className="h-3.5 w-3.5 text-white" /> :
                       <Megaphone className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{b.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{b.message}</p>
                      {b.expiresAt && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          Expires {new Date(b.expiresAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {b.isPinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
                    <button onClick={() => handleDelete(b.id)} className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create new */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Create New Banner</p>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
              <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm" placeholder="e.g. Youth Conference 2026" value={form.title} onChange={e => f("title", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Message *</label>
              <textarea className="w-full bg-muted rounded-lg px-3 py-2 text-sm resize-none" rows={3} placeholder="What's happening? Add details here…" value={form.message} onChange={e => f("message", e.target.value)} />
            </div>

            {/* Gradient picker */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Background Color</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(GRADIENTS).map(([key, g]) => (
                  <button
                    key={key}
                    onClick={() => f("bgGradient", key)}
                    title={g.label}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${form.bgGradient === key ? "border-white scale-110 shadow-lg" : "border-transparent"}`}
                    style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                  />
                ))}
              </div>
            </div>

            {/* Media upload */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Media (image or video)</label>
              <CloudinaryUploader
                accept="image/*,video/*"
                label="Upload background image or video"
                onUpload={setUpload}
                currentUrl={upload?.url}
              />
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Button Label</label>
                <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm" placeholder="Learn More" value={form.linkLabel} onChange={e => f("linkLabel", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Button URL</label>
                <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm" placeholder="https://…" value={form.linkUrl} onChange={e => f("linkUrl", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Expires (optional)</label>
                <input type="date" className="w-full bg-muted rounded-lg px-3 py-2 text-sm" value={form.expiresAt} onChange={e => f("expiresAt", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Audience</label>
                <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm" value={form.audience} onChange={e => f("audience", e.target.value)}>
                  {["all","admin","leadership","workforce","member"].map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" className="rounded" checked={form.isPinned} onChange={e => f("isPinned", e.target.checked)} />
              <Pin className="h-3.5 w-3.5 text-primary" /> Pin this banner (always shows first)
            </label>

            <button
              onClick={handleCreate}
              disabled={saving || !form.title.trim() || !form.message.trim()}
              className="w-full py-2.5 rounded-xl text-sm blue-gradient-bg text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saved ? <><Check className="h-4 w-4" /> Banner Created!</> : saving ? "Creating…" : <><Plus className="h-4 w-4" /> Create Banner</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HeroBanner() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const qc = useQueryClient();

  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const [showAdmin, setShowAdmin] = useState(false);
  const [wishSent, setWishSent] = useState<Set<string>>(new Set());
  const [wishSending, setWishSending] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: heroBanners = [], refetch: refetchBanners } = useQuery<BannerAnnouncement[]>({
    queryKey: ["hero-banners"],
    queryFn: () => axios.get("/api/announcements?type=hero").then(r => r.data),
    staleTime: 60_000,
  });

  const { data: allMembers = [] } = useQuery<Member[]>({
    queryKey: ["members-birthdays"],
    queryFn: () => axios.get("/api/members").then(r => r.data).catch(() => []),
    staleTime: 300_000,
  });

  const todayBirthdays = (allMembers as Member[]).filter(m => m.birthday && isTodayBirthday(m.birthday));

  const slides: Slide[] = [
    ...todayBirthdays.map(m => ({
      key: `bday-${m.id}`,
      kind: "birthday" as const,
      member: m,
      gradient: "rose",
    })),
    ...(heroBanners as BannerAnnouncement[]).map(b => ({
      key: `hero-${b.id}`,
      kind: "hero" as const,
      banner: b,
      gradient: b.bgGradient || "violet",
    })),
  ].filter(s => !dismissed.has(s.key));

  const go = useCallback((idx: number) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(idx);
      setTransitioning(false);
    }, 200);
  }, [transitioning]);

  const prev = () => go((current - 1 + slides.length) % slides.length);
  const next = useCallback(() => go((current + 1) % slides.length), [current, slides.length, go]);

  useEffect(() => {
    if (slides.length <= 1 || isHovered) return;
    intervalRef.current = setInterval(next, 6000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [slides.length, isHovered, next]);

  function dismiss(key: string) {
    const next = new Set(dismissed);
    next.add(key);
    setDismissed(next);
    saveDismissed(next);
    if (current >= slides.length - 1) setCurrent(Math.max(0, slides.length - 2));
  }

  async function sendWishes(member: Member) {
    const key = `bday-${member.id}`;
    setWishSending(key);
    try {
      await axios.post("/api/chat/global", {
        message: `🎂 Happy Birthday, ${member.fullName}! Wishing you a day full of joy and God's blessings! 🎉`,
        senderName: user?.displayName ?? "Church Member",
        senderRole: user?.role ?? "member",
      });
      setWishSent(p => new Set([...p, key]));
    } catch {
      // silent fail — chat might use a different scope
    } finally { setWishSending(null); }
  }

  if (slides.length === 0 && !isAdmin) return null;

  if (slides.length === 0 && isAdmin) {
    return (
      <div className="relative rounded-2xl border border-dashed border-primary/30 p-5 flex items-center justify-between bg-primary/5">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Megaphone className="h-5 w-5 text-primary/50" />
          <div>
            <p className="text-sm font-medium text-foreground">No hero banners yet</p>
            <p className="text-xs">Create your first banner to announce events, celebrations & more.</p>
          </div>
        </div>
        <button onClick={() => setShowAdmin(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl blue-gradient-bg text-white text-sm font-semibold">
          <Plus className="h-4 w-4" /> Add Banner
        </button>
        {showAdmin && (
          <AdminPanel
            banners={heroBanners as BannerAnnouncement[]}
            onClose={() => setShowAdmin(false)}
            onCreated={() => { refetchBanners(); setShowAdmin(false); }}
            onDeleted={() => refetchBanners()}
          />
        )}
      </div>
    );
  }

  const slide = slides[current] ?? slides[0];
  if (!slide) return null;

  const isBirthday = slide.kind === "birthday";
  const banner = slide.banner;
  const member = slide.member;
  const hasMedia = banner?.mediaUrl;
  const isVideo = banner?.mediaType === "video";

  return (
    <>
      <div
        className="relative rounded-2xl overflow-hidden select-none"
        style={{
          minHeight: "180px",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.1) inset, 0 8px 32px rgba(0,0,0,0.18)",
          ...(!hasMedia ? gradientStyle(slide.gradient) : {}),
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* ── Background ── */}
        {hasMedia && isVideo && (
          <video
            key={banner!.mediaUrl!}
            src={banner!.mediaUrl!}
            autoPlay muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {hasMedia && !isVideo && (
          <img
            key={banner!.mediaUrl!}
            src={banner!.mediaUrl!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {hasMedia && <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 100%)" }} />}
        {!hasMedia && <Particles />}

        {/* ── Animated gradient border shimmer ── */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(255,255,255,0.06) 100%)",
          }}
        />

        {/* ── Content ── */}
        <div
          className="relative z-10 flex items-center gap-6 p-6 md:p-8 transition-opacity duration-200"
          style={{ opacity: transitioning ? 0 : 1 }}
        >
          {/* Left: text content */}
          <div className="flex-1 min-w-0">
            {/* Type badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/20">
                {isBirthday ? <><Cake className="h-3 w-3" /> Birthday Celebration</> : <><Megaphone className="h-3 w-3" /> {banner?.audience === "all" ? "Church Announcement" : `${banner?.audience?.charAt(0).toUpperCase()}${banner?.audience?.slice(1)} Notice`}</>}
              </span>
              {banner?.isPinned && <span className="inline-flex items-center gap-1 text-[10px] text-white/70 bg-white/10 px-2 py-0.5 rounded-full"><Pin className="h-3 w-3" />Pinned</span>}
            </div>

            {/* Title */}
            <h2 className="text-white font-bold text-xl md:text-2xl leading-tight mb-2 drop-shadow-sm">
              {isBirthday ? `Happy Birthday, ${member!.fullName}! 🎉` : banner!.title}
            </h2>

            {/* Message */}
            <p className="text-white/85 text-sm md:text-base leading-relaxed line-clamp-2 mb-4">
              {isBirthday ? "The church family is celebrating you today. You are loved! 🙏" : banner!.message}
            </p>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {isBirthday && (
                <button
                  onClick={() => sendWishes(member!)}
                  disabled={wishSent.has(slide.key) || wishSending === slide.key}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-gray-900 text-sm font-semibold shadow-lg hover:bg-white/90 transition disabled:opacity-70"
                >
                  {wishSent.has(slide.key)
                    ? <><Check className="h-3.5 w-3.5 text-green-600" /> Wishes Sent!</>
                    : wishSending === slide.key
                    ? "Sending…"
                    : <><Send className="h-3.5 w-3.5" /> Send Wishes</>}
                </button>
              )}
              {banner?.linkUrl && (
                <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-gray-900 text-sm font-semibold shadow-lg hover:bg-white/90 transition">
                  <ExternalLink className="h-3.5 w-3.5" />
                  {banner.linkLabel || "Learn More"}
                </a>
              )}
              <button
                onClick={() => dismiss(slide.key)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white/15 text-white text-xs font-medium hover:bg-white/25 transition backdrop-blur-sm border border-white/20"
              >
                <X className="h-3 w-3" /> Dismiss
              </button>
            </div>
          </div>

          {/* Right: avatar (birthday) or media thumbnail */}
          <div className="hidden md:flex items-center justify-center shrink-0">
            {isBirthday && member && <BirthdayAvatar member={member} />}
            {!isBirthday && banner?.mediaUrl && !isVideo && (
              <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
                <img src={banner.mediaUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* ── Navigation ── */}
        {slides.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={next} className="absolute right-10 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === current ? "20px" : "6px",
                    height: "6px",
                    background: i === current ? "white" : "rgba(255,255,255,0.4)",
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* ── Admin controls ── */}
        {isAdmin && (
          <button
            onClick={() => setShowAdmin(true)}
            className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition"
            title="Manage Banners"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        )}

        {/* ── Slide counter ── */}
        {slides.length > 1 && (
          <div className="absolute top-3 left-3 z-20 text-[10px] text-white/60 bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
            {current + 1} / {slides.length}
          </div>
        )}
      </div>

      {/* Admin modal */}
      {showAdmin && isAdmin && (
        <AdminPanel
          banners={heroBanners as BannerAnnouncement[]}
          onClose={() => setShowAdmin(false)}
          onCreated={() => { refetchBanners(); setShowAdmin(false); }}
          onDeleted={() => refetchBanners()}
        />
      )}
    </>
  );
}
