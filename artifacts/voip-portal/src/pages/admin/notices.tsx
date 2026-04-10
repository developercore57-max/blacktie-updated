import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useAdminGetNotices,
  useAdminCreateNotice,
  useAdminUpdateNotice,
  useAdminDeleteNotice,
  Notice,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Bell, Edit2, Trash2, CheckCircle2, AlertTriangle, Info, Eye, EyeOff, Calendar } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";

const NOTICE_TYPES = [
  { value: "info",    label: "Info",    cls: "bg-blue-500/10 text-blue-500 border-blue-300/30" },
  { value: "warning", label: "Warning", cls: "bg-amber-500/10 text-amber-500 border-amber-300/30" },
  { value: "success", label: "Success", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-300/30" },
  { value: "danger",  label: "Danger",  cls: "bg-red-500/10 text-red-500 border-red-300/30" },
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  danger: AlertTriangle,
};

const emptyForm = {
  title: "",
  content: "",
  type: "info",
  priority: "0",
  isActive: true,
  expiresAt: "",
};

export default function AdminNotices() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: notices = [], isLoading } = useAdminGetNotices();
  const createNotice = useAdminCreateNotice();
  const updateNotice = useAdminUpdateNotice();
  const deleteNotice = useAdminDeleteNotice();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditingNotice(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setForm({
      title: notice.title,
      content: notice.content,
      type: notice.type,
      priority: String(notice.priority),
      isActive: notice.isActive,
      expiresAt: notice.expiresAt ? notice.expiresAt.slice(0, 16) : "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      content: form.content,
      type: form.type as any,
      priority: parseInt(form.priority) || 0,
      isActive: form.isActive,
      expiresAt: form.expiresAt || null,
    };
    try {
      if (editingNotice) {
        await updateNotice.mutateAsync({ id: editingNotice.id, data: payload });
        toast({ title: "Notice updated" });
      } else {
        await createNotice.mutateAsync({ data: payload });
        toast({ title: "Notice created" });
      }
      setIsModalOpen(false);
      setEditingNotice(null);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notices"] });
    } catch {
      toast({ title: editingNotice ? "Error updating notice" : "Error creating notice", variant: "destructive" });
    }
  };

  const handleToggleActive = async (notice: Notice) => {
    try {
      await updateNotice.mutateAsync({ id: notice.id, data: { ...notice, isActive: !notice.isActive } });
      toast({ title: `Notice ${!notice.isActive ? "activated" : "deactivated"}` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notices"] });
    } catch {
      toast({ title: "Error updating notice", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this notice?")) return;
    try {
      await deleteNotice.mutateAsync({ id });
      toast({ title: "Notice deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notices"] });
    } catch {
      toast({ title: "Error deleting notice", variant: "destructive" });
    }
  };

  return (
    <AppLayout role="admin" title="Notices & Announcements">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Reseller Notices</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Post announcements, alerts, and updates that appear on the reseller dashboard.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4" /> New Notice
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (notices as Notice[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-card border border-border rounded-2xl">
          <Bell className="w-12 h-12 opacity-20 mb-3" />
          <p className="font-medium">No notices yet</p>
          <p className="text-sm opacity-60 mt-1">Create one to display messages on the reseller dashboard</p>
          <button onClick={openCreate} className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
            Create First Notice
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(notices as Notice[]).map((notice: Notice, idx) => {
            const typeInfo = NOTICE_TYPES.find(t => t.value === notice.type) ?? NOTICE_TYPES[0];
            const Icon = TYPE_ICONS[notice.type] ?? Info;
            const isExpired = notice.expiresAt && new Date(notice.expiresAt) < new Date();
            return (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-card border rounded-2xl p-5 shadow-sm transition-all ${notice.isActive && !isExpired ? "border-border" : "border-border/40 opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${typeInfo.cls}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground">{notice.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${typeInfo.cls}`}>
                          {typeInfo.label}
                        </span>
                        {!notice.isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted/30 text-muted-foreground border border-border/50">
                            Inactive
                          </span>
                        )}
                        {isExpired && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-300/30">
                            Expired
                          </span>
                        )}
                        {notice.priority > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                            Priority {notice.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{notice.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Created {new Date(notice.createdAt).toLocaleDateString("en-ZA")}
                        </span>
                        {notice.expiresAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Expires {new Date(notice.expiresAt).toLocaleDateString("en-ZA")}
                          </span>
                        )}
                        {notice.createdByName && (
                          <span>by {notice.createdByName}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(notice)}
                      title={notice.isActive ? "Deactivate" : "Activate"}
                      className={`p-2 rounded-lg transition-colors ${notice.isActive ? "hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500" : "hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500"}`}
                    >
                      {notice.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(notice)}
                      className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(notice.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingNotice(null); }}
        title={editingNotice ? "Edit Notice" : "New Notice"}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Title *</label>
            <input
              required
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Scheduled Maintenance Notice"
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Message *</label>
            <textarea
              required
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              rows={4}
              placeholder="Write your announcement or notice here…"
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
              >
                {NOTICE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Priority (higher = shown first)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Expires At (optional)</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${form.isActive ? "bg-primary" : "bg-border"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <span className="text-sm font-medium text-foreground">Active (visible to resellers)</span>
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={() => { setIsModalOpen(false); setEditingNotice(null); }}
              className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createNotice.isPending || updateNotice.isPending}
              className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50"
            >
              {editingNotice ? "Save Changes" : "Publish Notice"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
