import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupService, expenseService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatPaise, decimalToPaise, paiseToDecimal } from '../utils/currency';
import Avatar from '../components/common/Avatar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  ArrowLeft,
  Receipt,
  IndianRupee,
  Users,
  CheckCircle2,
  AlertCircle,
  Equal,
  Percent,
  Coins
} from 'lucide-react';

const CATEGORIES = [
  'General',
  'Food',
  'Transportation',
  'Entertainment',
  'Utilities',
  'Shopping',
  'Lodging'
];

export default function AddEditExpense() {
  const { groupId, expenseId } = useParams();
  const isEditing = Boolean(expenseId);

  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [description, setDescription] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [payerId, setPayerId] = useState('');
  const [category, setCategory] = useState('General');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [splitType, setSplitType] = useState('EQUAL'); // 'EQUAL', 'EXACT', 'PERCENTAGE'

  // Splits configuration
  // For EQUAL: set of participant userIds
  const [equalParticipants, setEqualParticipants] = useState([]);
  // For EXACT: map of userId -> amount in Rupees
  const [exactShares, setExactShares] = useState({});
  // For PERCENTAGE: map of userId -> percentage
  const [percentageShares, setPercentageShares] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const groupRes = await groupService.getGroupById(groupId);
        if (groupRes.data.success) {
          const grp = groupRes.data.data.group;
          setGroup(grp);

          if (!isEditing) {
            setPayerId(user?._id || grp.members[0]?._id);
            setEqualParticipants(grp.members.map((m) => m._id));

            // Default percentages equally distributed
            const equalPct = (100 / grp.members.length).toFixed(2);
            const initialPcts = {};
            const initialExact = {};
            grp.members.forEach((m) => {
              initialPcts[m._id] = equalPct;
              initialExact[m._id] = '';
            });
            setPercentageShares(initialPcts);
            setExactShares(initialExact);
          }
        }

        if (isEditing) {
          const expRes = await expenseService.getExpenseById(expenseId);
          if (expRes.data.success) {
            const exp = expRes.data.data.expense;
            setDescription(exp.description);
            setAmountRupees(paiseToDecimal(exp.totalAmountPaise));
            setPayerId(exp.payer?._id || exp.payer);
            setCategory(exp.category || 'General');
            if (exp.date) {
              setDate(new Date(exp.date).toISOString().split('T')[0]);
            }
            setNotes(exp.notes || '');
            setSplitType(exp.splitType);

            if (exp.splitType === 'EQUAL') {
              setEqualParticipants(exp.participants.map((p) => p._id || p));
            } else if (exp.splitType === 'EXACT') {
              const exactMap = {};
              exp.splits.forEach((s) => {
                exactMap[s.user?._id || s.user] = paiseToDecimal(s.amountPaise);
              });
              setExactShares(exactMap);
            } else if (exp.splitType === 'PERCENTAGE') {
              const pctMap = {};
              exp.splits.forEach((s) => {
                pctMap[s.user?._id || s.user] = s.percentage;
              });
              setPercentageShares(pctMap);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load expense form data:', err);
        toast.error('Failed to load expense details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId, expenseId, isEditing, user, toast]);

  if (loading) {
    return <LoadingSpinner text="Loading expense form..." />;
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 text-sm">Group not found</p>
      </div>
    );
  }

  // Calculations for live preview
  const totalPaiseInput = decimalToPaise(amountRupees);

  // Equal split preview
  const equalCount = equalParticipants.length;
  const equalBasePaise = equalCount > 0 ? Math.floor(totalPaiseInput / equalCount) : 0;
  const equalRemainderPaise = equalCount > 0 ? totalPaiseInput % equalCount : 0;

  // Exact split preview
  const exactTotalPaiseEntered = Object.values(exactShares).reduce(
    (acc, val) => acc + decimalToPaise(val),
    0
  );
  const exactDiffPaise = totalPaiseInput - exactTotalPaiseEntered;

  // Percentage split preview
  const percentageTotalEntered = Object.values(percentageShares).reduce(
    (acc, val) => acc + (parseFloat(val) || 0),
    0
  );
  const percentageDiff = (100 - percentageTotalEntered).toFixed(2);

  const toggleEqualParticipant = (memberId) => {
    if (equalParticipants.includes(memberId)) {
      if (equalParticipants.length === 1) {
        toast.warning('At least one participant must be included in the split');
        return;
      }
      setEqualParticipants(equalParticipants.filter((id) => id !== memberId));
    } else {
      setEqualParticipants([...equalParticipants, memberId]);
    }
  };

  const handleExactShareChange = (memberId, value) => {
    setExactShares((prev) => ({ ...prev, [memberId]: value }));
  };

  const handlePercentageShareChange = (memberId, value) => {
    setPercentageShares((prev) => ({ ...prev, [memberId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!description.trim()) {
      setErrorMsg('Please enter an expense description');
      return;
    }

    if (totalPaiseInput <= 0) {
      setErrorMsg('Expense amount must be strictly greater than ₹0.00');
      return;
    }

    // Validation per split type
    let splitsPayload = [];

    if (splitType === 'EQUAL') {
      if (equalParticipants.length === 0) {
        setErrorMsg('Select at least one participant for equal split');
        return;
      }
    } else if (splitType === 'EXACT') {
      if (exactDiffPaise !== 0) {
        setErrorMsg(
          `The sum of exact splits (${formatPaise(exactTotalPaiseEntered)}) must equal the total expense amount (${formatPaise(totalPaiseInput)}). Difference: ${formatPaise(Math.abs(exactDiffPaise))}`
        );
        return;
      }
      splitsPayload = group.members.map((m) => ({
        user: m._id,
        amountPaise: decimalToPaise(exactShares[m._id] || 0)
      })).filter((s) => s.amountPaise > 0);

      if (splitsPayload.length === 0) {
        setErrorMsg('At least one member must have a non-zero share');
        return;
      }
    } else if (splitType === 'PERCENTAGE') {
      if (Math.abs(percentageTotalEntered - 100) > 0.05) {
        setErrorMsg(
          `Percentages must total 100%. Currently they total ${percentageTotalEntered.toFixed(2)}%`
        );
        return;
      }
      splitsPayload = group.members.map((m) => ({
        user: m._id,
        percentage: parseFloat(percentageShares[m._id]) || 0
      })).filter((s) => s.percentage > 0);
    }

    setSubmitting(true);
    try {
      const payload = {
        groupId,
        description: description.trim(),
        amountPaise: totalPaiseInput,
        payerId,
        splitType,
        participants: splitType === 'EQUAL' ? equalParticipants : splitsPayload.map((s) => s.user),
        splits: splitType !== 'EQUAL' ? splitsPayload : undefined,
        category,
        date: new Date(date),
        notes: notes.trim()
      };

      if (isEditing) {
        await expenseService.updateExpense(expenseId, payload);
        toast.success('Expense updated! Balances refreshed.');
      } else {
        await expenseService.createExpense(payload);
        toast.success('Expense added! Balances recalculated.');
      }

      navigate(`/groups/${groupId}`);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Back button */}
      <button
        onClick={() => navigate(`/groups/${groupId}`)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to {group.name}</span>
      </button>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {isEditing ? 'Edit Expense' : 'Add New Expense'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              For group <span className="font-semibold text-slate-700">{group.name}</span>
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
          {/* Description & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Seafood Dinner, Villa Booking, Fuel"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Payer and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Paid By</label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                {group.members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} {m._id === user?._id ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Split Type</label>
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100/80 rounded-2xl">
              {[
                { id: 'EQUAL', label: 'Equally', icon: Equal },
                { id: 'EXACT', label: 'Exact Amounts', icon: Coins },
                { id: 'PERCENTAGE', label: 'Percentages', icon: Percent }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSplitType(tab.id)}
                    className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition ${
                      splitType === tab.id
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split Detail Form based on splitType */}

          {/* 1. EQUAL SPLIT */}
          {splitType === 'EQUAL' && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Select participants to divide equally:</span>
                {totalPaiseInput > 0 && equalCount > 0 && (
                  <span className="font-bold text-emerald-600">
                    ≈ {formatPaise(equalBasePaise)} / person
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {group.members.map((member, idx) => {
                  const isChecked = equalParticipants.includes(member._id);
                  // Deterministic share: first `equalRemainderPaise` get +1 paise
                  const sharePaise = isChecked
                    ? idx < equalRemainderPaise
                      ? equalBasePaise + 1
                      : equalBasePaise
                    : 0;

                  return (
                    <label
                      key={member._id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                        isChecked
                          ? 'border-emerald-300 bg-emerald-50/40 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEqualParticipant(member._id)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <Avatar name={member.name} avatar={member.avatar} size="sm" />
                        <span className="text-xs font-bold">{member.name}</span>
                      </div>

                      {isChecked && totalPaiseInput > 0 && (
                        <span className="text-xs font-semibold text-slate-700">
                          {formatPaise(sharePaise)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>

              {equalRemainderPaise > 0 && totalPaiseInput > 0 && (
                <p className="text-[11px] text-slate-500 italic mt-2">
                  ℹ️ Unequal division: leftover {equalRemainderPaise} paise is allocated
                  deterministically (+1 paise to the first {equalRemainderPaise} participants) to
                  guarantee exact total match.
                </p>
              )}
            </div>
          )}

          {/* 2. EXACT SPLIT */}
          {splitType === 'EXACT' && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Specify exact rupees for each:</span>
                <span
                  className={`font-bold ${
                    exactDiffPaise === 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {exactDiffPaise === 0
                    ? '✓ Sum Matches Exactly'
                    : exactDiffPaise > 0
                    ? `Remaining to allocate: ${formatPaise(exactDiffPaise)}`
                    : `Over-allocated by: ${formatPaise(Math.abs(exactDiffPaise))}`}
                </span>
              </div>

              <div className="space-y-2">
                {group.members.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-slate-200"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <Avatar name={member.name} avatar={member.avatar} size="sm" />
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {member.name}
                      </span>
                    </div>

                    <div className="w-32 relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                        <IndianRupee className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={exactShares[member._id] ?? ''}
                        onChange={(e) => handleExactShareChange(member._id, e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. PERCENTAGE SPLIT */}
          {splitType === 'PERCENTAGE' && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Enter percentage for each member:</span>
                <span
                  className={`font-bold ${
                    Math.abs(percentageTotalEntered - 100) < 0.05
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  Total: {percentageTotalEntered.toFixed(2)}%{' '}
                  {Math.abs(percentageTotalEntered - 100) < 0.05
                    ? '✓'
                    : `(${percentageDiff}% left)`}
                </span>
              </div>

              <div className="space-y-2">
                {group.members.map((member) => {
                  const pct = parseFloat(percentageShares[member._id]) || 0;
                  const estimatedPaise =
                    totalPaiseInput > 0 ? Math.round((totalPaiseInput * pct) / 100) : 0;

                  return (
                    <div
                      key={member._id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-slate-200"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <Avatar name={member.name} avatar={member.avatar} size="sm" />
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {member.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                          ≈ {formatPaise(estimatedPaise)}
                        </span>
                        <div className="w-24 relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={percentageShares[member._id] ?? ''}
                            onChange={(e) => handlePercentageShareChange(member._id, e.target.value)}
                            placeholder="0"
                            className="w-full pr-6 pl-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-right focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                          <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details or reference..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(`/groups/${groupId}`)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : isEditing ? 'Update Expense' : 'Add Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
