import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useAdminGetStaff,
  useAdminCreateStaff,
  useAdminUpdateStaff,
  useAdminDeleteStaff,
  useAdminResetStaffPassword,
  useGetMe,
  StaffMember,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Plus, Shield, User, Pencil, Trash2, KeyRound,
  CheckCircle2, XCircle, MoreVertical, Phone, Mail,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type ModalMode = "create" | "edit" | "reset-password" | null;

const roleBadge = (role: string) =>
  role === "superadmin"
    ? "bg-primary/10 text-primary border-primary/20"
    : "bg-slate-500/10 text-slate-600 border-slate-500/20";

export default function AdminStaff() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe();

  const { data: staff = [] } = useAdminGetStaff();
  const createStaff = useAdminCreateStaff();
  const updateStaff = useAdminUpdateStaff();
  const deleteStaff = useAdminDeleteStaff();
  const resetPassword = useAdminResetStaffPassword();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", role: "staff" as "superadmin" | "staff",
  });
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] });
  };

  const openCreate = () => {
    setForm({ name: "", email: "", password: "", phone: "", role: "staff" });
    setModalMode("create");
  };

  const openEdit = (s: StaffMember) => {
    setSelectedStaff(s);
    setForm({ name: s.name, email: s.email, password: "", phone: s.phone ?? "", role: s.role as "superadmin" | "staff" });
    setModalMode("edit");
    setOpenMenuId(null);
  };

  const openResetPassword = (s: StaffMember) => {
    setSelectedStaff(s);
    setPasswordForm({ password: "", confirm: "" });
    setModalMode("reset-password");
    setOpenMenuId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStaff.mutateAsync({ data: { name: form.name, email: form.email, password: form.password, phone: form.phone || undefined, role: form.role } });
      toast({ title: "Staff member created" });
      setModalMode(null);
      invalidate();
    } catch (err: any) {
      toast({ title: err?.data?.error ?? "Error creating staff member", variant: "destructive" });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    try {
      await updateStaff.mutateAsync({ id: selectedStaff.id, data: { name: form.name, email: form.email, phone: form.phone || undefined, role: form.role } });
      toast({ title: "Staff member updated" });
      setModalMode(null);
      invalidate();
    } catch (err: any) {
      toast({ title: err?.data?.error ?? "Error updating staff member", variant: "destructive" });
    }
  };

  const handleToggleActive = async (s: StaffMember) => {
    try {
      await updateStaff.mutateAsync({ id: s.id, data: { isActive: !s.isActive } });
      toast({ title: s.isActive ? "Staff member deactivated" : "Staff member activated" });
      invalidate();
    } catch {
      toast({ title: "Error updating status", variant: "destructive" });
    }
    setOpenMenuId(null);
  };

  const handleDelete = async (s: StaffMember) => {
    if (!confirm(`Delete ${s.name}? This cannot be undone.`)) return;
    try {
      await deleteStaff.mutateAsync({ id: s.id });
      toast({ title: "Staff member deleted" });
      invalidate();
    } catch (err: any) {
      toast({ title: err?.data?.error ?? "Error deleting staff member", variant: "destructive" });
    }
    setOpenMenuId(null);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    if (passwordForm.password !== passwordForm.confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    try {
      await resetPassword.mutateAsync({ id: selectedStaff.id, data: { password: passwordForm.password } });
      toast({ title: "Password reset successfully" });
      setModalMode(null);
    } catch (err: any) {
      toast({ title: err?.data?.error ?? "Error resetting password", variant: "destructive" });
    }
  };

  const inputCls = "w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none text-sm";
  const labelCls = "block text-sm font-medium text-muted-foreground mb-1.5";

  return (
    <AppLayout role="admin" title="Staff Management">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm mt-1">
            {staff.length} staff member{staff.length !== 1 ? "s" : ""} &mdash;{" "}
            {staff.filter(s => s.isActive).length} active
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Staff Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {staff.map((s: StaffMember, idx) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`bg-card border rounded-2xl p-5 shadow-lg shadow-black/10 relative transition-all ${s.isActive ? "border-border" : "border-border/40 opacity-60"}`}
          >
            {/* Status dot */}
            <span className={`absolute top-4 right-12 w-2 h-2 rounded-full ${s.isActive ? "bg-emerald-400" : "bg-slate-400"}`} />

            {/* Menu button */}
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-black/5 hover:text-foreground transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {openMenuId === s.id && (
                <div className="absolute right-0 top-8 bg-card border border-border rounded-xl shadow-xl z-20 w-44 py-1 text-sm">
                  <button onClick={() => openEdit(s)} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-black/5 text-foreground">
                    <Pencil className="w-3.5 h-3.5" /> Edit Details
                  </button>
                  <button onClick={() => openResetPassword(s)} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-black/5 text-foreground">
                    <KeyRound className="w-3.5 h-3.5" /> Reset Password
                  </button>
                  <button onClick={() => handleToggleActive(s)} className={`flex items-center gap-2 w-full px-3 py-2 hover:bg-black/5 ${s.isActive ? "text-amber-600" : "text-emerald-600"}`}>
                    {s.isActive ? <><XCircle className="w-3.5 h-3.5" /> Deactivate</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Activate</>}
                  </button>
                  {s.id !== me?.id && (
                    <button onClick={() => handleDelete(s)} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-destructive/5 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base ${s.role === "superadmin" ? "bg-primary/10 text-primary" : "bg-slate-500/10 text-slate-600"}`}>
                {s.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{s.name}</p>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${roleBadge(s.role)}`}>
                  {s.role === "superadmin" ? "Super Admin" : "Staff"}
                </span>
              </div>
              {s.id === me?.id && (
                <span className="ml-auto text-[10px] font-bold text-primary border border-primary/30 rounded px-1.5 py-0.5">You</span>
              )}
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{s.email}</span>
              </div>
              {s.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span>{s.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                <User className="w-3 h-3 shrink-0" />
                <span>Added {format(new Date(s.createdAt), "PP")}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {staff.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Shield className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-medium">No staff members yet</p>
        </div>
      )}

      {/* Click-away to close menu */}
      {openMenuId !== null && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
      )}

      {/* Create Modal */}
      <Modal isOpen={modalMode === "create"} onClose={() => setModalMode(null)} title="Add Staff Member">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Full Name</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Jane Smith" />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="+27 11 000 0000" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email Address</label>
            <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="jane@blacktievoip.co.za" />
          </div>
          <div>
            <label className={labelCls}>Password</label>
            <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={inputCls} placeholder="Min. 6 characters" minLength={6} />
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as "superadmin" | "staff" })} className={inputCls + " appearance-none"}>
              <option value="staff">Staff</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setModalMode(null)} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5">Cancel</button>
            <button type="submit" disabled={createStaff.isPending} className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground">
              {createStaff.isPending ? "Creating…" : "Create Member"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={modalMode === "edit"} onClose={() => setModalMode(null)} title="Edit Staff Member">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Full Name</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email Address</label>
            <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as "superadmin" | "staff" })} className={inputCls + " appearance-none"}>
              <option value="staff">Staff</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setModalMode(null)} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5">Cancel</button>
            <button type="submit" disabled={updateStaff.isPending} className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground">
              {updateStaff.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={modalMode === "reset-password"} onClose={() => setModalMode(null)} title={`Reset Password — ${selectedStaff?.name}`}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className={labelCls}>New Password</label>
            <input required type="password" value={passwordForm.password} onChange={e => setPasswordForm({ ...passwordForm, password: e.target.value })} className={inputCls} placeholder="Min. 6 characters" minLength={6} />
          </div>
          <div>
            <label className={labelCls}>Confirm Password</label>
            <input required type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className={inputCls} placeholder="Repeat password" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setModalMode(null)} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5">Cancel</button>
            <button type="submit" disabled={resetPassword.isPending} className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground">
              {resetPassword.isPending ? "Resetting…" : "Reset Password"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
