import { useEffect, useState } from 'react';
import { Plus, Pencil, Power, Users as UsersIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Select, FormField } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { getSettings, updateSettings } from '../services/settings';
import { listUsers, createUser, updateUser } from '../services/users';
import type { Role, Settings, User } from '../types';

const defaultSettings: Settings = {
  storeName: '',
  ownerName: '',
  address: '',
  phone: '',
  currency: 'IDR',
  defaultLowStockThreshold: 5,
  email: '',
  mapsUrl: '',
  openingHours: '',
  storeProfile: '',
  shopeeUrl: '',
  announcement: '',
};

const emptyUserForm = { name: '', email: '', password: '', role: 'staff' as Role };

export default function Pengaturan() {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const [form, setForm] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  useEffect(() => {
    getSettings()
      .then(setForm)
      .finally(() => setLoading(false));
  }, []);

  function loadUsers() {
    setUsersLoading(true);
    listUsers()
      .then(setUsers)
      .finally(() => setUsersLoading(false));
  }

  useEffect(loadUsers, []);

  async function handleSubmit() {
    setSaving(true);
    try {
      const updated = await updateSettings(form);
      setForm(updated);
      showToast('Pengaturan berhasil disimpan.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function openCreateUser() {
    setEditing(null);
    setUserForm(emptyUserForm);
    setUserError(null);
    setModalOpen(true);
  }

  function openEditUser(user: User) {
    setEditing(user);
    setUserForm({ name: user.name, email: user.email, password: '', role: user.role });
    setUserError(null);
    setModalOpen(true);
  }

  async function handleUserSubmit() {
    setUserSaving(true);
    setUserError(null);
    try {
      if (editing) {
        await updateUser(editing.id, { name: userForm.name, role: userForm.role });
        showToast('Pengguna berhasil diperbarui.');
      } else {
        await createUser(userForm);
        showToast('Pengguna berhasil ditambahkan.');
      }
      setModalOpen(false);
      loadUsers();
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Gagal menyimpan pengguna.');
    } finally {
      setUserSaving(false);
    }
  }

  async function toggleUserActive(user: User) {
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      showToast(user.isActive ? 'Pengguna dinonaktifkan.' : 'Pengguna diaktifkan kembali.');
      loadUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengubah status pengguna.', 'error');
    }
  }

  const isCreateValid =
    userForm.name.trim().length > 0 && userForm.email.trim().length > 0 && userForm.password.length >= 6;
  const isEditValid = userForm.name.trim().length > 0;
  const isUserFormValid = editing ? isEditValid : isCreateValid;

  if (loading) return <div className="text-sm text-text-muted">Memuat pengaturan...</div>;

  return (
    <div className="max-w-3xl space-y-4">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Informasi Toko</CardTitle>
        </CardHeader>
        <div className="p-4 space-y-3.5">
          <FormField label="Nama Toko">
            <Input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
          </FormField>
          <FormField label="Nama Owner">
            <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          </FormField>
          <FormField label="Alamat">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Nomor Telepon / WhatsApp">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </FormField>
            <FormField label="Mata Uang">
              <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Batas Peringatan Stok Menipis">
            <Input
              type="number"
              min={0}
              value={form.defaultLowStockThreshold}
              onChange={(e) => setForm({ ...form, defaultLowStockThreshold: Number(e.target.value) })}
            />
          </FormField>
        </div>
      </Card>

      <div className="flex justify-end max-w-xl">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Manajemen Pengguna</CardTitle>
          <Button size="sm" onClick={openCreateUser}>
            <Plus size={14} />
            Tambah Pengguna
          </Button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg/50">
                {['Nama', 'Email', 'Peran', 'Status', ''].map((h) => (
                  <th key={h} className="text-left font-medium text-text-faint text-[11px] uppercase tracking-wide px-3.5 py-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!usersLoading && users.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon={UsersIcon} message="Belum ada pengguna." />
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-3.5 py-2.5 text-text">{u.name}</td>
                  <td className="px-3.5 py-2.5 text-text-muted">{u.email}</td>
                  <td className="px-3.5 py-2.5 text-text-muted capitalize">{u.role}</td>
                  <td className="px-3.5 py-2.5">
                    <Badge tone={u.isActive ? 'success' : 'neutral'}>{u.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditUser(u)}
                        className="p-1.5 rounded text-text-muted hover:text-text hover:bg-white/[0.06] transition"
                        aria-label="Edit"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => toggleUserActive(u)}
                        disabled={u.id === currentUser?.id}
                        className="p-1.5 rounded text-text-muted hover:text-text hover:bg-white/[0.06] transition disabled:opacity-30 disabled:pointer-events-none"
                        aria-label="Ubah status"
                        title={u.id === currentUser?.id ? 'Tidak dapat menonaktifkan akun sendiri' : u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        <Power size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Pengguna' : 'Tambah Pengguna'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUserSubmit} disabled={!isUserFormValid || userSaving}>
              {userSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <FormField label="Nama">
            <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
          </FormField>
          <FormField label="Email">
            <Input
              type="email"
              value={userForm.email}
              disabled={!!editing}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            />
          </FormField>
          {!editing && (
            <FormField label="Kata Sandi">
              <Input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Minimal 6 karakter"
              />
            </FormField>
          )}
          <FormField label="Peran">
            <Select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as Role })}>
              <option value="staff">Staff</option>
              <option value="admin">Owner/Admin</option>
            </Select>
          </FormField>
          {userError && (
            <div className="text-[13px] text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{userError}</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
