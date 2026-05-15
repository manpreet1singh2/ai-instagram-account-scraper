import { useState } from "react";
import { motion } from "framer-motion";
import { User, Key, Bell, Shield, Zap, Save, Eye, EyeOff, Copy, Check } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { apiClient } from "../services/api";

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState("profile");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({ name: user?.name || "", email: user?.email || "" });
  const [pwData, setPwData] = useState({ current: "", newPw: "", confirm: "" });
  const [isSaving, setIsSaving] = useState(false);

  const TABS = [
    { id: "profile",  icon: User,    label: "Profile" },
    { id: "api",      icon: Key,     label: "API Keys" },
    { id: "billing",  icon: Zap,     label: "Billing" },
    { id: "security", icon: Shield,  label: "Security" },
  ];

  const PLAN_FEATURES: Record<string, { quota: number; price: string; features: string[] }> = {
    FREE:       { quota: 100,   price: "$0/mo",  features: ["100 profiles/mo", "Basic filtering", "CSV export", "1 user"] },
    STARTER:    { quota: 1000,  price: "$29/mo", features: ["1,000 profiles/mo", "AI niche detection", "All exports", "3 users"] },
    PRO:        { quota: 10000, price: "$79/mo", features: ["10,000 profiles/mo", "Full AI analysis", "CRM integrations", "10 users", "Priority support"] },
    ENTERPRISE: { quota: 99999, price: "Custom", features: ["Unlimited profiles", "Dedicated AI", "Custom integrations", "Unlimited users", "SLA + dedicated CSM"] },
  };

  const currentPlan = PLAN_FEATURES[user?.plan || "FREE"];

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await apiClient.patch("/auth/me", formData);
      updateUser(formData);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText("igi-demo-key-xxxx-xxxx-xxxx");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("API key copied");
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-card border border-surface-border rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? "bg-brand-600/20 text-brand-300 border border-brand-500/20"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <tab.icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-5">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2"><User size={15} className="text-brand-400" /> Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Full Name</label>
              <input className="input" value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Email Address</label>
              <input className="input" type="email" value={formData.email} onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Plan</label>
                <div className="input flex items-center justify-between opacity-60 cursor-not-allowed">
                  <span className="text-white capitalize">{user?.plan?.toLowerCase()}</span>
                  <span className="badge bg-brand-500/15 text-brand-300 border border-brand-500/20">{currentPlan?.price}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Role</label>
                <div className="input opacity-60 cursor-not-allowed capitalize">{user?.role?.toLowerCase()}</div>
              </div>
            </div>
            <button onClick={handleSaveProfile} disabled={isSaving} className="btn-primary">
              {isSaving ? "Saving..." : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        </motion.div>
      )}

      {/* API Keys Tab */}
      {activeTab === "api" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="card p-6 space-y-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Key size={15} className="text-brand-400" /> API Keys</h2>
            <p className="text-gray-400 text-xs">Use these keys to access the IG Intelligence API from your applications.</p>
            <div className="space-y-3">
              {[{ name: "Production Key", created: "Mar 1, 2025" }].map((key) => (
                <div key={key.name} className="bg-surface-hover border border-surface-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white text-sm font-medium">{key.name}</p>
                    <span className="badge-qualified">Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-xs text-gray-400 bg-surface-card px-3 py-2 rounded-lg flex-1 truncate">
                      {showKey ? "igi-prod-xxxx-xxxx-xxxx-xxxxxxxxxxxx" : "igi-prod-••••-••••-••••-••••••••••••"}
                    </div>
                    <button onClick={() => setShowKey((v) => !v)} className="btn-ghost p-2">
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={handleCopyKey} className="btn-ghost p-2">
                      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-gray-600 text-xs mt-2">Created {key.created}</p>
                </div>
              ))}
            </div>
            <button className="btn-secondary text-sm"><Key size={14} /> Generate New Key</button>
          </div>

          <div className="card p-6 space-y-3">
            <h2 className="text-white font-semibold text-sm">API Documentation</h2>
            <p className="text-gray-400 text-xs">Base URL: <code className="text-brand-300 font-mono bg-surface-hover px-1.5 py-0.5 rounded">https://api.igintel.com/v1</code></p>
            <div className="space-y-2">
              {["/discovery/search", "/profiles", "/analytics/overview", "/export"].map((endpoint) => (
                <div key={endpoint} className="flex items-center gap-2 text-xs">
                  <span className="text-green-400 font-mono font-bold">GET</span>
                  <span className="text-gray-300 font-mono">{endpoint}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Billing Tab */}
      {activeTab === "billing" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="card p-6 space-y-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Zap size={15} className="text-brand-400" /> Current Plan</h2>
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-lg capitalize">{user?.plan?.toLowerCase()} Plan</p>
                  <p className="text-brand-300 text-sm">{currentPlan?.price}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Quota used</p>
                  <p className="text-white font-bold">{user?.usedQuota} / {user?.monthlyQuota}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1">
                {currentPlan?.features.map((f) => (
                  <li key={f} className="text-gray-300 text-xs flex items-center gap-2">
                    <Check size={11} className="text-green-400" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(PLAN_FEATURES).filter(([p]) => p !== user?.plan).map(([plan, details]) => (
              <div key={plan} className="card p-5 space-y-3 hover:border-brand-500/30 transition-colors cursor-pointer">
                <div className="flex justify-between">
                  <p className="text-white font-bold capitalize">{plan.toLowerCase()}</p>
                  <p className="text-brand-400 font-bold">{details.price}</p>
                </div>
                <ul className="space-y-1">
                  {details.features.slice(0, 3).map((f) => (
                    <li key={f} className="text-gray-400 text-xs flex items-center gap-1.5"><Check size={10} className="text-green-400" /> {f}</li>
                  ))}
                </ul>
                <button className="btn-primary w-full justify-center text-sm">Upgrade to {plan.charAt(0) + plan.slice(1).toLowerCase()}</button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-5">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Shield size={15} className="text-brand-400" /> Security Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Current Password</label>
              <input type="password" className="input" value={pwData.current} onChange={(e) => setPwData((p) => ({ ...p, current: e.target.value }))} placeholder="Enter current password" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">New Password</label>
              <input type="password" className="input" value={pwData.newPw} onChange={(e) => setPwData((p) => ({ ...p, newPw: e.target.value }))} placeholder="Min 8 characters" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Confirm New Password</label>
              <input type="password" className="input" value={pwData.confirm} onChange={(e) => setPwData((p) => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
            </div>
            <button className="btn-primary"><Shield size={14} /> Update Password</button>
          </div>
          <div className="pt-4 border-t border-surface-border">
            <h3 className="text-white font-medium text-sm mb-3">Active Sessions</h3>
            <div className="bg-surface-hover rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Current session</p>
                <p className="text-gray-600 text-xs">Browser • {new Date().toLocaleDateString()}</p>
              </div>
              <span className="badge-qualified">Active</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
