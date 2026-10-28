import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupService, authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Users, Plus, X, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  { id: 'Trip', label: 'Trip / Vacation' },
  { id: 'Home', label: 'Flatmates / Home' },
  { id: 'Couple', label: 'Couple' },
  { id: 'Food', label: 'Food & Outings' },
  { id: 'Project', label: 'Work / Project' },
  { id: 'Other', label: 'Other' }
];

export default function CreateGroup() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Trip');
  const [emailInput, setEmailInput] = useState('');
  const [memberEmails, setMemberEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddEmail = async (e) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) return;

    if (cleanEmail === user.email.toLowerCase()) {
      toast.info("You're automatically included as the group creator!");
      setEmailInput('');
      return;
    }

    if (memberEmails.includes(cleanEmail)) {
      toast.warning('Email already added to the list');
      setEmailInput('');
      return;
    }

    // Verify email belongs to registered user
    setVerifyingEmail(true);
    try {
      const res = await authService.searchUser(cleanEmail);
      if (res.data.success) {
        setMemberEmails([...memberEmails, cleanEmail]);
        setEmailInput('');
        toast.success(`Found registered user: ${res.data.data.user.name}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'User must be registered before adding to group.');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const removeEmail = (emailToRemove) => {
    setMemberEmails(memberEmails.filter((e) => e !== emailToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a group name');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await groupService.createGroup({
        name: name.trim(),
        description: description.trim(),
        category,
        memberEmails
      });

      if (res.data.success) {
        toast.success(`Group "${res.data.data.group.name}" created!`);
        navigate(`/groups/${res.data.data.group._id}`);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Create a New Group
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Set up a group and invite friends by their email
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-sm text-rose-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Group Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Goa Trip 2026, Flat 402, Weekly Dinners"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-xl border text-xs font-semibold transition text-left ${
                    category === cat.id
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group for? Add a short note..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Add Members by Email */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Add Members by Registered Email
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              You are automatically included. Add friends using their registered email.
            </p>

            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="friend@example.com"
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddEmail}
                disabled={verifyingEmail || !emailInput.trim()}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {verifyingEmail ? 'Checking...' : 'Add'}
              </button>
            </div>

            {/* Added member chips */}
            {memberEmails.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {memberEmails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="p-0.5 hover:text-emerald-950 transition"
                      aria-label="Remove email"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Creating Group...' : 'Create Group'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
