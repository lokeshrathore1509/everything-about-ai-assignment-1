import React, { useState } from 'react';
import Modal from '../common/Modal';
import { groupService, authService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { UserPlus, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import Avatar from '../common/Avatar';

export default function AddMemberModal({ isOpen, onClose, groupId, onMemberAdded }) {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSearching(true);
    setSearchError('');
    setFoundUser(null);

    try {
      const res = await authService.searchUser(email.trim());
      if (res.data.success) {
        setFoundUser(res.data.data.user);
      }
    } catch (err) {
      setSearchError(err.response?.data?.message || 'No registered user found with this email.');
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!foundUser) return;
    setSubmitting(true);
    try {
      const res = await groupService.addMember(groupId, foundUser.email);
      if (res.data.success) {
        toast.success(`${foundUser.name} added to the group!`);
        setEmail('');
        setFoundUser(null);
        onMemberAdded(res.data.data.group);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setFoundUser(null);
    setSearchError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Member by Email" maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          Members must already have a SplitEase account. Enter their exact registered email address below.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSearchError('');
                setFoundUser(null);
              }}
              placeholder="e.g. rahul@example.com"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !email.trim()}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            <span>{searching ? 'Searching...' : 'Find'}</span>
          </button>
        </form>

        {searchError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
            <span>{searchError}</span>
          </div>
        )}

        {foundUser && (
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={foundUser.name} avatar={foundUser.avatar} size="md" />
              <div>
                <p className="text-sm font-semibold text-slate-800">{foundUser.name}</p>
                <p className="text-xs text-slate-500">{foundUser.email}</p>
              </div>
            </div>
            <button
              onClick={handleAdd}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{submitting ? 'Adding...' : 'Add to Group'}</span>
            </button>
          </div>
        )}

        {/* Demo hints */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Quick demo emails you can try:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {['priya@example.com', 'aman@example.com', 'sneha@example.com', 'rahul@example.com'].map((demo) => (
              <button
                key={demo}
                type="button"
                onClick={() => setEmail(demo)}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono transition"
              >
                {demo}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
