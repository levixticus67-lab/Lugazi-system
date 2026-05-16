import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import LiveChat from "@/components/LiveChat";
import { memberNavItems } from "./navItems";
import { Users, Plus, X, Phone, Mail, Cake, Trash2, Edit2, Search, UserCheck } from "lucide-react";

interface FamilyMember {
  id: number;
  userId: number;
  fullName: string;
  relationship: string;
  birthday: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
}

interface ChurchMember {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  birthday: string | null;
  photoUrl: string | null;
}

const RELATIONSHIPS = ["Spouse","Child","Parent","Sibling","Grandparent","Grandchild","Aunt/Uncle","Niece/Nephew","Other"];

const relColors: Record<string,string> = {
  Spouse:"bg-rose-100 text-rose-700", Child:"bg-blue-100 text-blue-700", Parent:"bg-purple-100 text-purple-700",
  Sibling:"bg-green-100 text-green-700", Grandparent:"bg-amber-100 text-amber-700", Other:"bg-slate-100 text-slate-600",
};

const blankForm = { fullName:"", relationship:"Spouse", birthday:"", phone:"", email:"", notes:"" };

export default function MemberFamily() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FamilyMember|null>(null);
  const [form, setForm] = useState(blankForm);
  const [memberSearch, setMemberSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: family = [], isLoading } = useQuery<FamilyMember[]>({
    queryKey: ["family-members"],
    queryFn: () => axios.get("/api/family").then(r=>r.data).catch(()=>[] as FamilyMember[]),
  });

  const { data: churchMembers = [] } = useQuery<ChurchMember[]>({
    queryKey: ["church-members-list"],
    queryFn: () => axios.get("/api/members").then(r => r.data as ChurchMember[]).catch(() => []),
    staleTime: 300_000,
    enabled: showForm,
  });

  const filteredMembers = memberSearch.length >= 2
    ? (churchMembers as ChurchMember[]).filter(m =>
        m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(memberSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  const create = useMutation({
    mutationFn: (data: typeof blankForm) => axios.post("/api/family", data),
    onSuccess: () => { qc.invalidateQueries({queryKey:["family-members"]}); setShowForm(false); resetForm(); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id:number; data:typeof blankForm }) => axios.patch(`/api/family/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({queryKey:["family-members"]}); setEditing(null); setShowForm(false); resetForm(); },
  });

  const remove = useMutation({
    mutationFn: (id:number) => axios.delete(`/api/family/${id}`),
    onSuccess: () => qc.invalidateQueries({queryKey:["family-members"]}),
  });

  function resetForm() {
    setForm(blankForm);
    setMemberSearch("");
    setShowSuggestions(false);
  }

  function openEdit(m: FamilyMember) {
    setEditing(m);
    setForm({ fullName:m.fullName, relationship:m.relationship, birthday:m.birthday??"", phone:m.phone??"", email:m.email??"", notes:m.notes??"" });
    setMemberSearch("");
    setShowSuggestions(false);
    setShowForm(true);
  }

  function selectChurchMember(cm: ChurchMember) {
    setForm(p => ({
      ...p,
      fullName: cm.fullName,
      email: cm.email ?? "",
      phone: cm.phone ?? "",
      birthday: cm.birthday ?? "",
    }));
    setMemberSearch(cm.fullName);
    setShowSuggestions(false);
  }

  function handleSave() {
    if (!form.fullName) return;
    if (editing) update.mutate({ id:editing.id, data:form });
    else create.mutate(form);
  }

  function getAge(birthday: string|null) {
    if (!birthday) return null;
    const bd = new Date(birthday);
    if (isNaN(bd.getTime())) return null;
    return new Date().getFullYear() - bd.getFullYear();
  }

  return (
    <PortalLayout title="DCL Lugazi ERP" navItems={memberNavItems}>
      <PageHeader title="My Family" subtitle="Manage your family members linked to your profile"
        actions={<button onClick={()=>{setEditing(null);resetForm();setShowForm(true);}} className="blue-gradient-bg text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"><Plus className="h-4 w-4"/>Add Family Member</button>} />

      <div className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(3)].map((_,i)=><div key={i} className="glass-card p-5 animate-pulse h-36"/>)}</div>
        ) : family.length === 0 ? (
          <div className="glass-card p-10 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 text-primary/50"/>
            <p className="font-semibold text-base">No family members added yet</p>
            <p className="text-sm mt-1">Add your family members to keep track of them within the church community.</p>
            <button onClick={()=>setShowForm(true)} className="mt-4 blue-gradient-bg text-white px-5 py-2 rounded-xl text-sm font-semibold">Add First Member</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {family.map(m=>(
              <div key={m.id} className="glass-card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {m.fullName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{m.fullName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${relColors[m.relationship]??"bg-slate-100 text-slate-600"}`}>{m.relationship}</span>
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {m.birthday && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Cake className="h-3 w-3"/>
                            {new Date(m.birthday).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}
                            {getAge(m.birthday) && <span>({getAge(m.birthday)} yrs)</span>}
                          </div>
                        )}
                        {m.phone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="h-3 w-3"/>{m.phone}</div>}
                        {m.email && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3 w-3 shrink-0"/><span className="truncate">{m.email}</span></div>}
                        {m.notes && <p className="text-xs text-muted-foreground italic">{m.notes}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={()=>openEdit(m)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition"><Edit2 className="h-3.5 w-3.5"/></button>
                    <button onClick={()=>{ if(confirm("Remove this family member?")) remove.mutate(m.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"><Trash2 className="h-3.5 w-3.5"/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{editing?"Edit Family Member":"Add Family Member"}</h3>
              <button onClick={()=>{setShowForm(false);setEditing(null);resetForm();}}><X className="h-4 w-4"/></button>
            </div>

            {!editing && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1.5">
                  <Search className="h-3 w-3"/> Search church member (optional)
                </label>
                <div className="relative">
                  <input
                    ref={searchRef}
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm pr-8"
                    placeholder="Type a name to search church members…"
                    value={memberSearch}
                    onChange={e => { setMemberSearch(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    autoComplete="off"
                  />
                  <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  {showSuggestions && filteredMembers.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                      {filteredMembers.map(cm => (
                        <button
                          key={cm.id}
                          type="button"
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/5 text-left transition-colors"
                          onClick={() => selectChurchMember(cm)}
                        >
                          <div className="w-8 h-8 rounded-full blue-gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {cm.fullName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{cm.fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">{cm.email}</p>
                          </div>
                          <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {memberSearch.length >= 2 && filteredMembers.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No church members found. Fill in the fields below manually.</p>
                )}
                <div className="border-t border-border my-2" />
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Full Name *</label>
              <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm" placeholder="Full name" value={form.fullName} onChange={e=>setForm(p=>({...p,fullName:e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Relationship *</label>
              <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm" value={form.relationship} onChange={e=>setForm(p=>({...p,relationship:e.target.value}))}>
                {RELATIONSHIPS.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            {[
              {label:"Date of Birth",key:"birthday",type:"date",placeholder:""},
              {label:"Phone",key:"phone",type:"text",placeholder:"+256 7XX XXX XXX"},
              {label:"Email",key:"email",type:"email",placeholder:"email@example.com"},
              {label:"Notes",key:"notes",type:"text",placeholder:"Any additional notes"},
            ].map(f=>(
              <div key={f.key}>
                <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                <input type={f.type} className="w-full bg-muted rounded-lg px-3 py-2 text-sm" placeholder={f.placeholder} value={form[f.key as keyof typeof blankForm]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={()=>{setShowForm(false);setEditing(null);resetForm();}} className="flex-1 py-2.5 rounded-xl text-sm bg-muted">Cancel</button>
              <button onClick={handleSave} disabled={!form.fullName || create.isPending || update.isPending} className="flex-1 py-2.5 rounded-xl text-sm blue-gradient-bg text-white font-semibold disabled:opacity-60">{editing?"Update":"Add Member"}</button>
            </div>
          </div>
        </div>
      )}

      <LiveChat />
    </PortalLayout>
  );
}
