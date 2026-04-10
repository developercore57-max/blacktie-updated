import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAdminGetCompanySettings,
  useAdminUpdateCompanySettings,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Building2, Save, Globe, Phone, Mail, MapPin, Receipt, Palette,
  Server, Eye, EyeOff, FlaskConical, CheckCircle2, XCircle, Loader2, Landmark,
  FileText, Plus, Pencil, Trash2, Copy, ChevronDown, ChevronUp,
  KeyRound, ShieldCheck, Lock, Database, Download, RefreshCw, Table2, AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SA_PROVINCES = [
  "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape",
  "Free State", "Mpumalanga", "Limpopo", "North West", "Northern Cape",
];

// ── Email Templates Types & Tab ──────────────────────────────────────────────

interface EmailTemplate {
  id: number;
  name: string;
  slug: string;
  subject: string;
  body: string;
  description: string | null;
  isActive: boolean;
  notificationRecipients: string | null;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATE_VARS = [
  { key: "companyName", desc: "Company name from settings" },
  { key: "contactName", desc: "Reseller contact name" },
  { key: "resellerCompanyName", desc: "Reseller company name" },
  { key: "resellerEmail", desc: "Reseller email address" },
  { key: "year", desc: "Current year" },
];

// ── Change Password Section ──────────────────────────────────────────────────

function ChangePasswordSection() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast({ title: "Current password is required", variant: "destructive" });
      return;
    }
    if (!newPassword) {
      toast({ title: "New password is required", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "New password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "New passwords do not match", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to change password" }));
        toast({ title: err.error ?? "Password change failed", variant: "destructive" });
        setSaving(false);
        return;
      }
      toast({ title: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
        <Lock className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-foreground">Change Password</h2>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">Current Password</label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none text-sm pr-10"
              placeholder="Enter current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none text-sm pr-10"
                placeholder="Min 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">Confirm New Password</label>
            <input
              type={showNew ? "text" : "password"}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none text-sm"
              placeholder="Re-enter new password"
            />
          </div>
        </div>
        {newPassword && confirmPassword && newPassword !== confirmPassword && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Passwords do not match
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={saving || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Change Password
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── API Keys Tab ─────────────────────────────────────────────────────────────

const WELL_KNOWN_KEYS: Record<string, { label: string; placeholder: string; description: string }> = {
  googleMapsApiKey: { label: "Google Maps API Key", placeholder: "AIza...", description: "Used for Fibre and Telkom LTE coverage maps" },
};

function friendlyKeyLabel(key: string): string {
  return WELL_KNOWN_KEYS[key]?.label ?? key;
}

function ApiKeysTab() {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [maskedKeys, setMaskedKeys] = useState<Record<string, string>>({});
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");

  // Fetch masked keys on mount
  useEffect(() => {
    fetch("/api/admin/api-keys", { credentials: "include" })
      .then(r => r.ok ? r.json() : { keys: {} })
      .then(data => setMaskedKeys(data.keys ?? {}))
      .catch(() => {});
  }, []);

  const handleReveal = async () => {
    if (!password) {
      toast({ title: "Enter your admin password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/api-keys/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to reveal keys" }));
        toast({ title: err.error ?? "Invalid password", variant: "destructive" });
        setLoading(false);
        return;
      }
      const data = await res.json();
      setKeys(data.keys ?? {});
      setUnlocked(true);
      toast({ title: "API keys revealed successfully" });
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!password) {
      toast({ title: "Password is required to save keys", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password, keys }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save keys" }));
        toast({ title: err.error ?? "Save failed", variant: "destructive" });
        setSaving(false);
        return;
      }
      const data = await res.json();
      setMaskedKeys(data.keys ?? {});
      toast({ title: "API keys saved successfully" });
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleAddKey = () => {
    const trimmedName = newKeyName.trim();
    if (!trimmedName) {
      toast({ title: "Key name is required", variant: "destructive" });
      return;
    }
    if (!newKeyValue.trim()) {
      toast({ title: "Key value is required", variant: "destructive" });
      return;
    }
    // Convert name to camelCase key
    const keyId = trimmedName
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
      .replace(/^\w/, c => c.toLowerCase());
    if (keys[keyId] !== undefined) {
      toast({ title: `Key "${trimmedName}" already exists`, variant: "destructive" });
      return;
    }
    setKeys(prev => ({ ...prev, [keyId]: newKeyValue.trim() }));
    setNewKeyName("");
    setNewKeyValue("");
    toast({ title: `Added "${trimmedName}" — click Save to persist` });
  };

  const handleRemoveKey = (keyId: string) => {
    setKeys(prev => {
      const next = { ...prev };
      delete next[keyId];
      return next;
    });
    toast({ title: `Removed "${friendlyKeyLabel(keyId)}" — click Save to persist` });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-foreground">API Keys</h2>
      </div>
      <div className="p-6 space-y-6">
        {/* Password gate */}
        {!unlocked && (
          <div className="bg-muted/30 border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="w-4 h-4" />
              <span>Enter your admin password to reveal or edit API keys</span>
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Admin Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
                    placeholder="Enter password…"
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleReveal(); } }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReveal}
                disabled={loading || !password}
                className="flex items-center gap-2 px-5 py-2 rounded-lg font-medium bg-primary text-primary-foreground shadow hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Reveal Keys
              </button>
            </div>
          </div>
        )}

        {/* Masked view (before unlock) */}
        {!unlocked && Object.keys(maskedKeys).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground/70">Stored Keys (masked)</h3>
            {Object.entries(maskedKeys).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 bg-muted/20 border border-border rounded-lg px-4 py-2 text-sm">
                <span className="font-medium text-foreground/80 min-w-[160px]">{friendlyKeyLabel(k)}</span>
                <span className="text-muted-foreground font-mono">{v}</span>
              </div>
            ))}
          </div>
        )}

        {!unlocked && Object.keys(maskedKeys).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No API keys stored yet. Reveal to add keys.</p>
        )}

        {/* Editable keys (after unlock) */}
        {unlocked && (
          <div className="space-y-5">
            {/* Existing keys */}
            {Object.keys(keys).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground/70">Stored Keys</h3>
                {Object.entries(keys).map(([k, v]) => {
                  const meta = WELL_KNOWN_KEYS[k];
                  return (
                    <div key={k} className="bg-muted/20 border border-border rounded-xl p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground/80">{friendlyKeyLabel(k)}</label>
                        <button
                          type="button"
                          onClick={() => handleRemoveKey(k)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                          title="Remove key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={v}
                        onChange={e => setKeys(prev => ({ ...prev, [k]: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder={meta?.placeholder ?? "Enter value…"}
                      />
                      {meta?.description && (
                        <p className="text-xs text-muted-foreground">{meta.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {Object.keys(keys).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">No keys stored yet. Add one below.</p>
            )}

            {/* Add new key */}
            <div className="bg-muted/10 border border-dashed border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-foreground/70 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add New API Key
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground/60 mb-1">Key Name</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="e.g. Stripe Secret Key"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/60 mb-1">Key Value</label>
                  <input
                    type="text"
                    value={newKeyValue}
                    onChange={e => setNewKeyValue(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="sk_live_..."
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddKey(); } }}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddKey}
                  disabled={!newKeyName.trim() || !newKeyValue.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Key
                </button>
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save API Keys
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Database Backup Tab ───────────────────────────────────────────────────────

const DB_TABLE_LABELS: Record<string, string> = {
  admins: "Admins",
  company_settings: "Company Settings",
  resellers: "Resellers",
  clients: "Clients",
  area_codes: "Area Codes",
  dids: "DIDs",
  orders: "Orders",
  order_items: "Order Items",
  order_comments: "Order Comments",
  service_categories: "Service Categories",
  services: "Services",
  product_categories: "Product Categories",
  products: "Products",
  web_hosting_packages: "Web Hosting Packages",
  domain_tlds: "Domain TLDs",
  notices: "Notices",
  documents: "Documents",
  chat_threads: "Chat Threads",
  chat_messages: "Chat Messages",
  coverage_check_requests: "Coverage Check Requests",
  coverage_check_comments: "Coverage Check Comments",
  number_porting_requests: "Number Porting Requests",
  did_requests: "DID Requests",
  minute_bundles: "Minute Bundles",
  email_templates: "Email Templates",
  connectivity_categories: "Connectivity Categories",
  connectivity_items: "Connectivity Items",
  cybersecurity_categories: "Cybersecurity Categories",
  cybersecurity_items: "Cybersecurity Items",
  data_security_categories: "Data Security Categories",
  data_security_items: "Data Security Items",
  web_dev_categories: "Web Dev Categories",
  web_dev_items: "Web Dev Items",
  voip_categories: "VoIP Categories",
  voip_items: "VoIP Items",
};

interface DbStats {
  tables: Record<string, number>;
  totalTables: number;
}

function DatabaseBackupTab() {
  const { toast } = useToast();
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/database/stats", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        toast({ title: "Failed to load database stats", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error loading stats", variant: "destructive" });
    }
    setLoadingStats(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/admin/database/backup", { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Download failed" }));
        toast({ title: err.error ?? "Backup download failed", variant: "destructive" });
        setDownloading(false);
        return;
      }
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+?)"/);
      const filename = match?.[1] ?? `blacktievoip-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Backup downloaded successfully" });
    } catch {
      toast({ title: "Failed to download backup", variant: "destructive" });
    }
    setDownloading(false);
  };

  const totalRows = stats ? Object.values(stats.tables).reduce((a, b) => a + b, 0) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header card */}
      <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Database Backup</h2>
          <button
            type="button"
            onClick={fetchStats}
            disabled={loadingStats}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted/50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? "animate-spin" : ""}`} />
            Refresh Stats
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Info notice */}
          <div className="flex gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
              <p className="font-medium">Sensitive Data</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                The backup contains all database records including hashed passwords and encrypted credentials.
                Store backups securely and restrict access to authorised personnel only.
              </p>
            </div>
          </div>

          {/* Summary stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-muted/30 border border-border rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{stats.totalTables}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Tables</div>
              </div>
              <div className="bg-muted/30 border border-border rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{totalRows.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Total Records</div>
              </div>
              <div className="col-span-2 md:col-span-1 bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                <div className="text-sm font-semibold text-primary">JSON Format</div>
                <div className="text-xs text-muted-foreground mt-0.5">Portable & readable</div>
              </div>
            </div>
          )}

          {/* Download button */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {downloading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Backup…</>
                : <><Download className="w-4 h-4" /> Download JSON Backup</>
              }
            </button>
            <p className="text-xs text-muted-foreground">
              Exports all {stats?.totalTables ?? "35"} tables as a single timestamped JSON file
            </p>
          </div>
        </div>
      </div>

      {/* Table breakdown */}
      <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
          <Table2 className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Table Overview</h2>
          {loadingStats && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-auto" />}
        </div>
        <div className="p-4">
          {stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {Object.entries(stats.tables).map(([tableName, count]) => (
                <div
                  key={tableName}
                  className="flex items-center justify-between bg-muted/20 hover:bg-muted/40 border border-border/60 rounded-lg px-3 py-2 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground/80 truncate">
                    {DB_TABLE_LABELS[tableName] ?? tableName}
                  </span>
                  <span className={`text-xs font-mono ml-2 flex-shrink-0 px-1.5 py-0.5 rounded ${count > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : loadingStats ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading table stats…
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              Click "Refresh Stats" to load table information
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function EmailTemplatesTab() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [notifEmailList, setNotifEmailList] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    subject: "",
    body: "",
    description: "",
    isActive: true,
    notificationRecipients: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/admin/email-templates", { credentials: "include" });
      if (res.ok) setTemplates(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
    // Load the notification emails list from company settings
    fetch("/api/admin/company-settings", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.notificationEmails) {
          setNotifEmailList(data.notificationEmails.split(",").map((e: string) => e.trim()).filter(Boolean));
        }
      })
      .catch(() => {});
  }, []);

  const startEdit = (t?: EmailTemplate) => {
    if (t) {
      setEditingId(t.id);
      setForm({
        name: t.name,
        slug: t.slug,
        subject: t.subject,
        body: t.body,
        description: t.description ?? "",
        isActive: t.isActive,
        notificationRecipients: t.notificationRecipients
          ? t.notificationRecipients.split(",").map(e => e.trim()).filter(Boolean)
          : [],
      });
    } else {
      setEditingId("new");
      setForm({ name: "", slug: "", subject: "", body: "", description: "", isActive: true, notificationRecipients: [] });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  const toggleRecipient = (email: string) => {
    setForm(f => ({
      ...f,
      notificationRecipients: f.notificationRecipients.includes(email)
        ? f.notificationRecipients.filter(e => e !== email)
        : [...f.notificationRecipients, email],
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.slug || !form.subject || !form.body) {
      toast({ title: "Name, slug, subject and body are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const isNew = editingId === "new";
      const url = isNew ? "/api/admin/email-templates" : `/api/admin/email-templates/${editingId}`;
      const payload = {
        ...form,
        notificationRecipients: form.notificationRecipients.join(", ") || null,
      };
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast({ title: isNew ? "Template created" : "Template saved" });
      setEditingId(null);
      fetchTemplates();
    } catch (err: any) {
      toast({ title: err.message ?? "Error saving template", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    try {
      await fetch(`/api/admin/email-templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      toast({ title: "Template deleted" });
      fetchTemplates();
    } catch {
      toast({ title: "Error deleting template", variant: "destructive" });
    }
  };

  const handleDuplicate = (t: EmailTemplate) => {
    setEditingId("new");
    setForm({
      name: `${t.name} (Copy)`,
      slug: `${t.slug}_copy`,
      subject: t.subject,
      body: t.body,
      description: t.description ?? "",
      isActive: true,
      notificationRecipients: t.notificationRecipients
        ? t.notificationRecipients.split(",").map(e => e.trim()).filter(Boolean)
        : [],
    });
  };

  const inputCls = "w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none text-sm";
  const labelCls = "block text-sm font-medium text-muted-foreground mb-1.5";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Editing / Creating form
  if (editingId !== null) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">
            {editingId === "new" ? "New Email Template" : "Edit Email Template"}
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Template Name</label>
              <input
                value={form.name}
                onChange={e => {
                  const name = e.target.value;
                  setForm(f => ({
                    ...f,
                    name,
                    slug: editingId === "new" ? autoSlug(name) : f.slug,
                  }));
                }}
                className={inputCls}
                placeholder="e.g. Reseller Welcome"
              />
            </div>
            <div>
              <label className={labelCls}>Slug <span className="text-xs font-normal">(unique identifier)</span></label>
              <input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                className={inputCls + " font-mono"}
                placeholder="e.g. reseller_welcome"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Description <span className="text-xs font-normal">(optional — when this template is used)</span></label>
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={inputCls}
              placeholder="e.g. Sent when a reseller application is approved"
            />
          </div>

          <div>
            <label className={labelCls}>Subject Line</label>
            <input
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              className={inputCls}
              placeholder="e.g. Welcome to {{companyName}}!"
            />
          </div>

          <div>
            <label className={labelCls}>Email Body <span className="text-xs font-normal">(HTML)</span></label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              className={inputCls + " min-h-[280px] font-mono text-xs leading-relaxed"}
              placeholder="<div>Your HTML email content here...</div>"
              rows={14}
            />
          </div>

          {/* Template variables reference */}
          <div className="p-4 bg-muted/30 rounded-xl border border-border/60">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Available Variables</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_VARS.map(v => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`{{${v.key}}}`);
                    toast({ title: `Copied {{${v.key}}}` });
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer font-mono"
                  title={v.desc}
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Click a variable to copy it. Paste into subject or body.</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative ${form.isActive ? "bg-primary" : "bg-muted-foreground/20"}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-6" : "translate-x-1"}`} />
              </div>
              <span className="text-sm text-foreground">Active</span>
            </label>
          </div>

          {/* Notification Recipients */}
          <div className="pt-3 border-t border-border/40">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Notification Recipients</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Select which notification email addresses should receive a copy when this template is sent.
              {notifEmailList.length === 0 && (
                <span className="ml-1 text-amber-600">
                  No notification emails configured yet — add them in the SMTP tab first.
                </span>
              )}
            </p>
            {notifEmailList.length > 0 && (
              <div className="space-y-2">
                {notifEmailList.map(email => {
                  const checked = form.notificationRecipients.includes(email);
                  return (
                    <label
                      key={email}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                        checked
                          ? "bg-primary/8 border-primary/30 text-primary"
                          : "bg-muted/20 border-border text-foreground hover:border-primary/20"
                      }`}
                    >
                      <div
                        onClick={() => toggleRecipient(email)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          checked ? "bg-primary border-primary" : "border-muted-foreground/40 bg-background"
                        }`}
                      >
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-mono flex-1" onClick={() => toggleRecipient(email)}>{email}</span>
                      {checked && (
                        <span className="text-xs text-primary font-medium">Will receive copy</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
            {form.notificationRecipients.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {form.notificationRecipients.length} recipient{form.notificationRecipients.length !== 1 ? "s" : ""} selected — they will receive a <strong>[COPY]</strong> of each email sent using this template.
              </p>
            )}
          </div>

          {/* Preview */}
          {form.body && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Preview</p>
              <div
                className="border border-border rounded-xl p-4 bg-white max-h-[300px] overflow-auto"
                dangerouslySetInnerHTML={{ __html: form.body }}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5 border border-border"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : editingId === "new" ? "Create Template" : "Save Template"}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Template list view
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Email Templates</h2>
          <span className="ml-auto text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border border-border/60">
            Used for automated emails
          </span>
        </div>
        <div className="p-6">
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => startEdit()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No email templates yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(t => (
                <div
                  key={t.id}
                  className="border border-border rounded-xl overflow-hidden transition-colors hover:border-primary/30"
                >
                  <div className="px-5 py-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{t.name}</span>
                        <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border/60">{t.slug}</span>
                        {!t.isActive && (
                          <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Inactive</span>
                        )}
                        {t.notificationRecipients && (
                          <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/8 px-1.5 py-0.5 rounded border border-primary/20">
                            <Mail className="w-2.5 h-2.5" />
                            {t.notificationRecipients.split(",").filter(Boolean).length} recipient{t.notificationRecipients.split(",").filter(Boolean).length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                        className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                        title="Preview"
                      >
                        {expandedId === t.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(t)}
                        className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(t)}
                        className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {expandedId === t.id && (
                    <div className="border-t border-border/60 px-5 py-4 space-y-3 bg-muted/10">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Subject</p>
                        <p className="text-sm text-foreground font-mono">{t.subject}</p>
                      </div>
                      {t.notificationRecipients && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Notification Recipients</p>
                          <div className="flex flex-wrap gap-1.5">
                            {t.notificationRecipients.split(",").map(e => e.trim()).filter(Boolean).map((email, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 font-mono">
                                <Mail className="w-2.5 h-2.5" />
                                {email}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Preview</p>
                        <div
                          className="border border-border rounded-xl p-4 bg-white max-h-[300px] overflow-auto"
                          dangerouslySetInnerHTML={{ __html: t.body }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminCompanySettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useAdminGetCompanySettings();
  const updateSettings = useAdminUpdateCompanySettings();

  const [form, setForm] = useState({
    companyName: "",
    email: "",
    phone: "",
    unitStreetNumber: "",
    buildingComplex: "",
    streetName: "",
    address: "",
    address2: "",
    city: "",
    province: "",
    postalCode: "",
    country: "South Africa",
    vatNumber: "",
    website: "",
    primaryColor: "#4BA3E3",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
    smtpSecure: false,
    notificationEmails: "",
    bankName: "",
    bankAccountHolder: "",
    bankAccountNumber: "",
    bankAccountType: "",
    bankBranchCode: "",
    bankSwiftCode: "",
    bankReference: "",
  });

  const [isDirty, setIsDirty] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [smtpTestState, setSmtpTestState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [smtpTestMsg, setSmtpTestMsg] = useState("");

  useEffect(() => {
    if (settings) {
      const s = settings as any;
      setForm({
        companyName: s.companyName ?? "",
        email: s.email ?? "",
        phone: s.phone ?? "",
        unitStreetNumber: s.unitStreetNumber ?? "",
        buildingComplex: s.buildingComplex ?? "",
        streetName: s.streetName ?? "",
        address: s.address ?? "",
        address2: s.address2 ?? "",
        city: s.city ?? "",
        province: s.province ?? "",
        postalCode: s.postalCode ?? "",
        country: s.country ?? "South Africa",
        vatNumber: s.vatNumber ?? "",
        website: s.website ?? "",
        primaryColor: s.primaryColor ?? "#4BA3E3",
        smtpHost: s.smtpHost ?? "",
        smtpPort: s.smtpPort ?? "587",
        smtpUser: s.smtpUser ?? "",
        smtpPass: s.smtpPass ?? "",
        smtpFrom: s.smtpFrom ?? "",
        smtpSecure: s.smtpSecure ?? false,
        notificationEmails: s.notificationEmails ?? "",
        bankName: s.bankName ?? "",
        bankAccountHolder: s.bankAccountHolder ?? "",
        bankAccountNumber: s.bankAccountNumber ?? "",
        bankAccountType: s.bankAccountType ?? "",
        bankBranchCode: s.bankBranchCode ?? "",
        bankSwiftCode: s.bankSwiftCode ?? "",
        bankReference: s.bankReference ?? "",
      });
      setIsDirty(false);
    }
  }, [settings]);

  const set = (key: string, val: string | boolean) => {
    setForm(f => ({ ...f, [key]: val }));
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync({ data: form as any });
      toast({ title: "Company settings saved" });
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company-settings"] });
    } catch {
      toast({ title: "Error saving settings", variant: "destructive" });
    }
  };

  const handleTestSmtp = async () => {
    setSmtpTestState("loading");
    setSmtpTestMsg("");
    try {
      const res = await fetch("/api/admin/company-settings/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: form.email || form.smtpUser }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test failed");
      setSmtpTestState("success");
      setSmtpTestMsg(data.message ?? "Test email sent successfully");
    } catch (err: any) {
      setSmtpTestState("error");
      setSmtpTestMsg(err.message ?? "SMTP test failed");
    }
  };

  const discardForm = () => {
    if (!settings) return;
    const s = settings as any;
    setForm({
      companyName: s.companyName ?? "",
      email: s.email ?? "",
      phone: s.phone ?? "",
      unitStreetNumber: s.unitStreetNumber ?? "",
      buildingComplex: s.buildingComplex ?? "",
      streetName: s.streetName ?? "",
      address: s.address ?? "",
      address2: s.address2 ?? "",
      city: s.city ?? "",
      province: s.province ?? "",
      postalCode: s.postalCode ?? "",
      country: s.country ?? "South Africa",
      vatNumber: s.vatNumber ?? "",
      website: s.website ?? "",
      primaryColor: s.primaryColor ?? "#4BA3E3",
      smtpHost: s.smtpHost ?? "",
      smtpPort: s.smtpPort ?? "587",
      smtpUser: s.smtpUser ?? "",
      smtpPass: s.smtpPass ?? "",
      smtpFrom: s.smtpFrom ?? "",
      smtpSecure: s.smtpSecure ?? false,
      notificationEmails: s.notificationEmails ?? "",
      bankName: s.bankName ?? "",
      bankAccountHolder: s.bankAccountHolder ?? "",
      bankAccountNumber: s.bankAccountNumber ?? "",
      bankAccountType: s.bankAccountType ?? "",
      bankBranchCode: s.bankBranchCode ?? "",
      bankSwiftCode: s.bankSwiftCode ?? "",
      bankReference: s.bankReference ?? "",
    });
    setIsDirty(false);
  };

  const inputCls = "w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none text-sm";
  const labelCls = "block text-sm font-medium text-muted-foreground mb-1.5";

  if (isLoading) {
    return (
      <AppLayout role="admin" title="Company Settings">
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="admin" title="Company Settings">
      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <Tabs defaultValue="identity" className="space-y-6">
          <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground">Settings</h2>
            </div>
            <div className="p-4">
              <TabsList className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 w-full">
                <TabsTrigger value="identity">Identity</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="branding">Branding</TabsTrigger>
                <TabsTrigger value="smtp">SMTP</TabsTrigger>
                <TabsTrigger value="bank">Bank</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="api-keys">API Keys</TabsTrigger>
                <TabsTrigger value="database">Database</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="identity" className="mt-0 space-y-6">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Company Identity</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Company Name</label>
                    <input value={form.companyName} onChange={e => set("companyName", e.target.value)} className={inputCls} placeholder="Black Tie VoIP" required />
                  </div>
                  <div>
                    <label className={labelCls}>VAT Number</label>
                    <input value={form.vatNumber} onChange={e => set("vatNumber", e.target.value)} className={inputCls} placeholder="e.g. 4123456789" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Website</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input value={form.website} onChange={e => set("website", e.target.value)} className={inputCls + " pl-9"} placeholder="https://blacktievoip.co.za" type="url" />
                  </div>
                </div>
              </div>
            </motion.div>
            <ChangePasswordSection />
          </TabsContent>

          <TabsContent value="contact" className="mt-0">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Contact Details</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={inputCls + " pl-9"} placeholder="info@blacktievoip.co.za" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input value={form.phone} onChange={e => set("phone", e.target.value)} className={inputCls + " pl-9"} placeholder="+27 11 000 0000" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="address" className="mt-0">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Physical Address</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Unit / Street Number</label>
                    <input value={form.unitStreetNumber} onChange={e => set("unitStreetNumber", e.target.value)} className={inputCls} placeholder="e.g. Unit 4 / 12" />
                  </div>
                  <div>
                    <label className={labelCls}>Building / Complex</label>
                    <input value={form.buildingComplex} onChange={e => set("buildingComplex", e.target.value)} className={inputCls} placeholder="e.g. Sunridge Business Park" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Street Name</label>
                  <input value={form.streetName} onChange={e => set("streetName", e.target.value)} className={inputCls} placeholder="e.g. Main Road" />
                </div>
                <div>
                  <label className={labelCls}>Address Line 2 <span className="text-xs font-normal">(optional)</span></label>
                  <input value={form.address2} onChange={e => set("address2", e.target.value)} className={inputCls} placeholder="e.g. Industrial area, Estate name" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <label className={labelCls}>City / Town</label>
                    <input value={form.city} onChange={e => set("city", e.target.value)} className={inputCls} placeholder="Johannesburg" />
                  </div>
                  <div>
                    <label className={labelCls}>Province</label>
                    <select value={form.province} onChange={e => set("province", e.target.value)} className={inputCls + " appearance-none"}>
                      <option value="">Select…</option>
                      {SA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Postal Code</label>
                    <input value={form.postalCode} onChange={e => set("postalCode", e.target.value)} className={inputCls} placeholder="2001" maxLength={10} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <input value={form.country} onChange={e => set("country", e.target.value)} className={inputCls} placeholder="South Africa" />
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="branding" className="mt-0">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Branding</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-6">
                  <div>
                    <label className={labelCls}>Primary Colour</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={form.primaryColor}
                        onChange={e => set("primaryColor", e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-background p-0.5"
                      />
                      <input
                        value={form.primaryColor}
                        onChange={e => set("primaryColor", e.target.value)}
                        className={inputCls + " w-32 font-mono"}
                        placeholder="#4BA3E3"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-2">Preview</p>
                    <div className="flex gap-2">
                      <div className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: form.primaryColor }}>Button</div>
                      <div className="px-3 py-2 rounded-lg text-sm font-medium border" style={{ color: form.primaryColor, borderColor: form.primaryColor + "40", backgroundColor: form.primaryColor + "10" }}>Badge</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="smtp" className="mt-0">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Email / SMTP</h2>
                <span className="ml-auto text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border border-border/60">Used for order notifications</span>
              </div>
              <div className="p-6 space-y-5">

            {/* Host + Port */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>SMTP Host</label>
                <input
                  value={form.smtpHost}
                  onChange={e => set("smtpHost", e.target.value)}
                  className={inputCls}
                  placeholder="e.g. smtp.gmail.com"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelCls}>Port</label>
                <input
                  value={form.smtpPort}
                  onChange={e => set("smtpPort", e.target.value)}
                  className={inputCls}
                  placeholder="587"
                  type="number"
                  min={1}
                  max={65535}
                />
              </div>
            </div>

            {/* Username + Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Username / Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    value={form.smtpUser}
                    onChange={e => set("smtpUser", e.target.value)}
                    className={inputCls + " pl-9"}
                    placeholder="you@gmail.com"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Password / App Password</label>
                <div className="relative">
                  <input
                    value={form.smtpPass}
                    onChange={e => set("smtpPass", e.target.value)}
                    type={showSmtpPass ? "text" : "password"}
                    className={inputCls + " pr-10"}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* From address + TLS toggle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  From Address
                  <span className="text-xs font-normal ml-1">(optional — defaults to username)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    value={form.smtpFrom}
                    onChange={e => set("smtpFrom", e.target.value)}
                    className={inputCls + " pl-9"}
                    placeholder="noreply@blacktievoip.co.za"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Security</label>
                <div className="flex items-center gap-3 h-[42px]">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => set("smtpSecure", !form.smtpSecure)}
                      className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative ${form.smtpSecure ? "bg-primary" : "bg-muted-foreground/20"}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.smtpSecure ? "translate-x-6" : "translate-x-1"}`} />
                    </div>
                    <span className="text-sm text-foreground">Use SSL/TLS <span className="text-muted-foreground">(port 465)</span></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Notification Emails */}
            <div className="pt-4 border-t border-border/40">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Notification Emails</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                These addresses receive order alerts and reseller signup notifications. Separate multiple addresses with commas.
              </p>
              <textarea
                value={form.notificationEmails}
                onChange={e => set("notificationEmails", e.target.value)}
                rows={3}
                className={inputCls + " resize-none font-mono text-xs"}
                placeholder="sales@example.com, support@example.com, accounts@example.com"
              />
              {form.notificationEmails && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.notificationEmails.split(",").map(e => e.trim()).filter(Boolean).map((email, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 font-mono">
                      {email}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Test SMTP */}
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={smtpTestState === "loading" || !form.smtpHost || !form.smtpUser || !form.smtpPass}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {smtpTestState === "loading" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Testing…</>
                  ) : (
                    <><FlaskConical className="w-4 h-4" /> Test SMTP Connection</>
                  )}
                </button>

                {smtpTestState === "success" && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    {smtpTestMsg}
                  </div>
                )}
                {smtpTestState === "error" && (
                  <div className="flex items-center gap-2 text-sm text-destructive font-medium">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    {smtpTestMsg}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Sends a test email to your company email address to verify the SMTP connection. Save settings first if you've made changes.
              </p>
            </div>
          </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="bank" className="mt-0">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Bank Details</h2>
                <span className="ml-auto text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border border-border/60">Printed on invoices &amp; statements</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Bank Name</label>
                    <input value={form.bankName} onChange={e => set("bankName", e.target.value)} className={inputCls} placeholder="e.g. First National Bank" />
                  </div>
                  <div>
                    <label className={labelCls}>Account Holder Name</label>
                    <input value={form.bankAccountHolder} onChange={e => set("bankAccountHolder", e.target.value)} className={inputCls} placeholder="e.g. Black Tie VoIP (Pty) Ltd" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Account Number</label>
                    <input value={form.bankAccountNumber} onChange={e => set("bankAccountNumber", e.target.value)} className={inputCls} placeholder="e.g. 62012345678" />
                  </div>
                  <div>
                    <label className={labelCls}>Account Type</label>
                    <select value={form.bankAccountType} onChange={e => set("bankAccountType", e.target.value)} className={inputCls + " appearance-none"}>
                      <option value="">Select…</option>
                      <option value="Current">Current</option>
                      <option value="Savings">Savings</option>
                      <option value="Transmission">Transmission</option>
                      <option value="Bond">Bond</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Branch Code <span className="text-xs font-normal">(universal branch code)</span></label>
                    <input value={form.bankBranchCode} onChange={e => set("bankBranchCode", e.target.value)} className={inputCls} placeholder="e.g. 250655" maxLength={10} />
                  </div>
                  <div>
                    <label className={labelCls}>SWIFT / BIC Code <span className="text-xs font-normal">(optional)</span></label>
                    <input value={form.bankSwiftCode} onChange={e => set("bankSwiftCode", e.target.value)} className={inputCls} placeholder="e.g. FIRNZAJJ" maxLength={11} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Payment Reference <span className="text-xs font-normal">(optional — e.g. invoice number placeholder)</span></label>
                  <input value={form.bankReference} onChange={e => set("bankReference", e.target.value)} className={inputCls} placeholder="e.g. Invoice No." />
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="templates" className="mt-0">
            <EmailTemplatesTab />
          </TabsContent>

          <TabsContent value="api-keys" className="mt-0">
            <ApiKeysTab />
          </TabsContent>

          <TabsContent value="database" className="mt-0">
            <DatabaseBackupTab />
          </TabsContent>
        </Tabs>

        {/* Save */}
        <div className="flex justify-end gap-3 pb-4">
          {isDirty && (
            <button
              type="button"
              onClick={discardForm}
              className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5 border border-border"
            >
              Discard Changes
            </button>
          )}
          <button
            type="submit"
            disabled={updateSettings.isPending || !isDirty}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <Save className="w-4 h-4" />
            {updateSettings.isPending ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
