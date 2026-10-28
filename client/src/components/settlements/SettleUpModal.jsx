import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { settlementService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, CheckCircle2, IndianRupee } from 'lucide-react';
import Avatar from '../common/Avatar';
import { paiseToDecimal } from '../../utils/currency';

export default function SettleUpModal({
  isOpen,
  onClose,
  group,
  defaultPayerId,
  defaultRecipientId,
  defaultAmountPaise,
  onSettled
}) {
  const { user } = useAuth();
  const toast = useToast();

  const [fromUserId, setFromUserId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && group) {
      setFromUserId(defaultPayerId || user?._id || group.members[0]?._id);
      setToUserId(
        defaultRecipientId ||
          group.members.find((m) => m._id !== (defaultPayerId || user?._id))?._id ||
          ''
      );
      if (defaultAmountPaise) {
        setAmountRupees(paiseToDecimal(defaultAmountPaise));
      } else {
        setAmountRupees('');
      }
      setNotes('Direct settlement payment');
    }
  }, [isOpen, group, defaultPayerId, defaultRecipientId, defaultAmountPaise, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amountRupees || parseFloat(amountRupees) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (fromUserId === toUserId) {
      toast.error('Payer and recipient cannot be the same person');
      return;
    }

    setSubmitting(true);
    try {
      const res = await settlementService.recordSettlement({
        groupId: group._id,
        fromUserId,
        toUserId,
        amount: parseFloat(amountRupees),
        notes,
        date: new Date()
      });

      if (res.data.success) {
        toast.success('Payment recorded successfully! Group balances updated.');
        if (onSettled) onSettled(res.data.data);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!group) return null;

  const fromMember = group.members.find((m) => m._id === fromUserId);
  const toMember = group.members.find((m) => m._id === toUserId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment / Settle Up" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Visual representation of money flow */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <Avatar name={fromMember?.name || 'Payer'} avatar={fromMember?.avatar} size="md" />
            <span className="text-xs font-semibold text-slate-800 text-center truncate max-w-[100px]">
              {fromMember?._id === user?._id ? 'You (Payer)' : fromMember?.name}
            </span>
          </div>

          <div className="flex flex-col items-center px-4">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
              PAYS
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5 flex-1">
            <Avatar name={toMember?.name || 'Recipient'} avatar={toMember?.avatar} size="md" />
            <span className="text-xs font-semibold text-slate-800 text-center truncate max-w-[100px]">
              {toMember?._id === user?._id ? 'You (Recipient)' : toMember?.name}
            </span>
          </div>
        </div>

        {/* Payer selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Who paid?</label>
            <select
              value={fromUserId}
              onChange={(e) => setFromUserId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            >
              {group.members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} {m._id === user?._id ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Who received?</label>
            <select
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            >
              {group.members
                .filter((m) => m._id !== fromUserId)
                .map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} {m._id === user?._id ? '(You)' : ''}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Amount Paid (₹)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <IndianRupee className="w-4 h-4" />
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="0.00"
              required
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-base font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Will be stored with integer-paise precision to guarantee zero rounding error.
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Payment Notes / Reference (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Paid via Google Pay UPI / Cash"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-600/20 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Recording...' : 'Record Payment'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
