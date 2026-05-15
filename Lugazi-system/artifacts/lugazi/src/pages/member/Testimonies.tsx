import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import LiveChat from "@/components/LiveChat";
import { memberNavItems } from "./navItems";
import { Star, Plus, X, Heart, Shield, Zap, HandCoins, Clock, CheckCircle2 } from "lucide-react";

interface Testimony {
  id: number;
  memberName: string;
  title: string;
  content: string;
  category: string;
  isApproved: boolean;
  isPublic: boolean;
  createdAt: string;
}

const CATEGORIES = ["healing","provision","salvation","protection","relationship","business","other"];
const CAT_ICONS: Record<string,any> = {
  healing:<Heart className="h-4 w-4"/>, provision:<HandCoins className="h-4 w-4"/>, salvation:<Star className="h-4 w-4"/>,
  protection:<Shield className="h-4 w-4"/>, relationship:<Heart className="h-4 w-4"/>, business:<Zap className="h-4 w-4"/>, other:<Star className="h-4 w-4"/>,
};
const CAT_COLORS: Record<string,string> = {
  healing:"bg-rose-100 text-rose-700", provision:"bg-green-100 text-green-700", salvation:"bg-yellow-100 text-yellow-700",
  protection:"bg-blue-100 text-blue-700", relationship:"bg-pink-100 text-pink-700", business:"bg-purple-100 text-purple-700", other:"bg-slate-100 text-slate-600",
};

const mockTestimonies: Testimony[] = [
  { id:1, memberName:"Sis. Grace Nakato", title:"God Healed My Child", content:"My daughter was diagnosed with a severe illness last month. After the church prayed for her, she was completely healed and the doctors could not explain it. To God be the glory!", category:"healing", isApproved:true, isPublic:true, createdAt: new Date(Date.now()-3*86400000).toISOString() },
  { id:2, memberName:"Bro. David Ssemakula", title:"Unexpected Business Breakthrough", content:"I had been struggling with my business for years. After I committed to tithing faithfully, within 3 months I received a contract that changed everything. God is faithful!", category:"business", isApproved:true, isPublic:true, createdAt: new Date(Date.now()-7*86400000).toISOString() },
  { id:3, memberName:"Sis. Sarah Namusoke", title:"Family Restored", content:"My marriage was on the verge of breaking down. Through counseling and prayer support from the church, God completely restored our family. We are more united than ever!", category:"relationship", isApproved:true, isPublic:true, createdAt: new Date(Date.now()-14*86400000).toISOString() },
];

export default function MemberTestimonies() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ title:"", content:"", category:"healing", isPublic:true });

  const { data: testimonies = [], isLoading } = useQuery<Testimony[]>({
    queryKey: ["testimonies-public"],
    queryFn: () => axios.get("/api/testimonies").then(r=>(r.data as Testimony[]).filter(t=>t.isApproved)).catch(()=>[] as Testimony[]),
  });

  const display = testimonies.length > 0 ? testimonies : mockTestimonies;

  const create = useMutation({
    mutationFn: (data: typeof form) => axios.post("/api/testimonies", { ...data, memberName: user?.displayName ?? "Member", memberId: user?.id }),
    onSuccess: () => {
      qc.invalidateQueries({queryKey:["testimonies-public"]});
      setShowForm(false);
      setSubmitted(true);
      setForm({ title:"", content:"", category:"healing", isPublic:true });
      setTimeout(()=>setSubmitted(false), 4000);
    },
  });

  return (
    <PortalLayout title="DCL Lugazi ERP" navItems={memberNavItems}>
      <PageHeader title="Testimonies" subtitle="Share what God has done and be encouraged by others"
        actions={<button onClick={()=>setShowForm(true)} className="blue-gradient-bg text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"><Plus className="h-4 w-4"/>Share Testimony</button>} />

      {submitted && (
        <div className="mx-6 mt-4 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0"/>
          <div>
            <p className="font-semibold text-green-700 dark:text-green-400 text-sm">Testimony submitted!</p>
            <p className="text-xs text-green-600 dark:text-green-500">Your testimony will appear after admin review. Thank you for sharing!</p>
          </div>
        </div>
      )}

      {/* Category filter pills */}
      <div className="px-6 pt-4 flex flex-wrap gap-2">
        {CATEGORIES.filter(c=>display.some(t=>t.category===c)).map(c=>(
          <span key={c} className={`text-xs px-3 py-1 rounded-full font-medium ${CAT_COLORS[c]??""} capitalize`}>
            {c}
          </span>
        ))}
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? [...Array(3)].map((_,i)=><div key={i} className="glass-card p-5 animate-pulse h-40"/>) :
          display.length === 0 ? (
            <div className="col-span-2 glass-card p-10 text-center text-muted-foreground">
              <Star className="h-10 w-10 mx-auto mb-3 text-yellow-400"/>
              <p className="font-semibold">No testimonies yet</p>
              <p className="text-sm mt-1">Be the first to share what God has done!</p>
            </div>
          ) :
          display.map(t=>(
            <div key={t.id} className="glass-card p-5 hover:shadow-md transition-shadow space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-sm">{t.title}</h4>
                  <p className="text-xs text-primary font-medium mt-0.5">{t.memberName}</p>
                </div>
                <span className={`shrink-0 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${CAT_COLORS[t.category]??""}`}>
                  {CAT_ICONS[t.category]&&<span className="[&>svg]:h-3 [&>svg]:w-3">{CAT_ICONS[t.category]}</span>}
                  {t.category}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{t.content}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3"/>
                {new Date(t.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}
              </div>
            </div>
          ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Share Your Testimony</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Encourage others with what God has done for you</p>
              </div>
              <button onClick={()=>setShowForm(false)}><X className="h-4 w-4"/></button>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm capitalize" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
              <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm" placeholder="Give your testimony a title" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Your Testimony *</label>
              <textarea className="w-full bg-muted rounded-lg px-3 py-2 text-sm resize-none" rows={6} placeholder="Share what God has done for you…" value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isPublic" checked={form.isPublic} onChange={e=>setForm(p=>({...p,isPublic:e.target.checked}))} className="rounded" />
              <label htmlFor="isPublic" className="text-xs text-muted-foreground">Make this testimony public (visible to all members after approval)</label>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={()=>setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm bg-muted">Cancel</button>
              <button onClick={()=>{if(form.title&&form.content)create.mutate(form);}} disabled={!form.title||!form.content||create.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm blue-gradient-bg text-white font-semibold disabled:opacity-60">
                {create.isPending?"Submitting…":"Submit Testimony"}
              </button>
            </div>
          </div>
        </div>
      )}

      <LiveChat />
    </PortalLayout>
  );
}
