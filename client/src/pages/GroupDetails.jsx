import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { groupService, expenseService, settlementService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatPaise, formatDate, getCategoryBadge } from '../utils/currency';
import Avatar from '../components/common/Avatar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ConfirmationModal from '../components/common/ConfirmationModal';
import AddMemberModal from '../components/groups/AddMemberModal';
import SettleUpModal from '../components/settlements/SettleUpModal';
import {
  Users,
  Plus,
  Scale,
  Receipt,
  UserPlus,
  Trash2,
  Edit2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowLeft
} from 'lucide-react';

export default function GroupDetails() {
  const { id: groupId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [totalExpensePaise, setTotalExpensePaise] = useState(0);
  const [memberBalances, setMemberBalances] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlementPlan, setSettlementPlan] = useState([]);
  const [recordedSettlements, setRecordedSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses', 'balances', 'settlement', 'settlements_history', 'members'

  // Modals state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);
  const [settleDefaults, setSettleDefaults] = useState({ payerId: '', recipientId: '', amountPaise: 0 });

  // Delete Expense Confirmation
  const [deleteExpenseModal, setDeleteExpenseModal] = useState({ isOpen: false, expenseId: null, loading: false });
  // Delete Settlement Confirmation
  const [deleteSettlementModal, setDeleteSettlementModal] = useState({ isOpen: false, settlementId: null, loading: false });

  const fetchAllGroupData = useCallback(async () => {
    try {
      const [groupRes, expRes, settlePlanRes, recSettleRes] = await Promise.all([
        groupService.getGroupById(groupId),
        expenseService.getGroupExpenses(groupId),
        settlementService.getSettlementPlan(groupId),
        settlementService.getGroupSettlements(groupId)
      ]);

      if (groupRes.data.success) {
        setGroup(groupRes.data.data.group);
        setTotalExpensePaise(groupRes.data.data.totalGroupExpensePaise);
        setMemberBalances(groupRes.data.data.memberBalances);
      }

      if (expRes.data.success) {
        setExpenses(expRes.data.data.expenses);
      }

      if (settlePlanRes.data.success) {
        setSettlementPlan(settlePlanRes.data.data.settlementPlan || []);
      }

      if (recSettleRes.data.success) {
        setRecordedSettlements(recSettleRes.data.data.settlements || []);
      }
    } catch (err) {
      console.error('Failed to load group details:', err);
      toast.error(err.response?.data?.message || 'Could not load group details');
    } finally {
      setLoading(false);
    }
  }, [groupId, toast]);

  useEffect(() => {
    fetchAllGroupData();
  }, [fetchAllGroupData]);

  const handleDeleteExpenseConfirm = async () => {
    if (!deleteExpenseModal.expenseId) return;
    setDeleteExpenseModal((prev) => ({ ...prev, loading: true }));
    try {
      const res = await expenseService.deleteExpense(deleteExpenseModal.expenseId);
      if (res.data.success) {
        toast.success('Expense deleted. Balances updated.');
        await fetchAllGroupData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    } finally {
      setDeleteExpenseModal({ isOpen: false, expenseId: null, loading: false });
    }
  };

  const handleDeleteSettlementConfirm = async () => {
    if (!deleteSettlementModal.settlementId) return;
    setDeleteSettlementModal((prev) => ({ ...prev, loading: true }));
    try {
      const res = await settlementService.deleteSettlement(deleteSettlementModal.settlementId);
      if (res.data.success) {
        toast.success('Recorded settlement removed. Balances reverted.');
        await fetchAllGroupData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete settlement');
    } finally {
      setDeleteSettlementModal({ isOpen: false, settlementId: null, loading: false });
    }
  };

  const handleOpenSettleWithPrefill = (debtorId, creditorId, amountPaise) => {
    setSettleDefaults({
      payerId: debtorId,
      recipientId: creditorId,
      amountPaise
    });
    setIsSettleUpOpen(true);
  };

  if (loading) {
    return <LoadingSpinner text="Loading group details..." />;
  }

  if (!group) {
    return (
      <EmptyState
        title="Group Not Found"
        description="This group does not exist or you do not have permission to access it."
        actionText="Back to Groups"
        onAction={() => navigate('/groups')}
      />
    );
  }

  const myBalanceRecord = memberBalances.find((m) => m.user._id === user?._id);
  const myNetPaise = myBalanceRecord ? myBalanceRecord.netBalancePaise : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top back navigation */}
      <button
        onClick={() => navigate('/groups')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>All Groups</span>
      </button>

      {/* Group Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                {group.category || 'Trip'}
              </span>
              <span className="text-xs text-slate-400">
                Created by {group.creator?.name?.split(' ')[0]}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {group.name}
            </h1>
            {group.description && (
              <p className="text-sm text-slate-500 mt-1 max-w-xl">{group.description}</p>
            )}
          </div>

          {/* Quick Metrics and Action Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center min-w-[120px]">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Expenses</span>
              <p className="text-lg font-black text-slate-900">{formatPaise(totalExpensePaise)}</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center min-w-[130px]">
              <span className="text-[10px] uppercase font-bold text-slate-400">Your Group Balance</span>
              <p
                className={`text-lg font-black ${
                  myNetPaise > 0
                    ? 'text-emerald-600'
                    : myNetPaise < 0
                    ? 'text-rose-600'
                    : 'text-slate-700'
                }`}
              >
                {formatPaise(myNetPaise, true)}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                to={`/groups/${group._id}/expenses/new`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Expense</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setSettleDefaults({ payerId: '', recipientId: '', amountPaise: 0 });
                  setIsSettleUpOpen(true);
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-xs transition active:scale-[0.98]"
              >
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>Settle Up</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddMemberOpen(true)}
                title="Add member"
                className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'expenses', label: `Expenses (${expenses.length})`, icon: Receipt },
            { id: 'balances', label: 'Balances', icon: Scale },
            { id: 'settlement', label: `Settlement Plan (${settlementPlan.length})`, icon: CheckCircle2 },
            { id: 'settlements_history', label: `Payments (${recordedSettlements.length})`, icon: Clock },
            { id: 'members', label: `Members (${group.members.length})`, icon: Users }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Expenses List */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Expense History</h2>
            <Link
              to={`/groups/${group._id}/expenses/new`}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add an expense</span>
            </Link>
          </div>

          {expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses yet"
              description="Keep track of shared meals, cabs, or hotel stays by adding your first expense."
              actionText="Add an Expense"
              onAction={() => navigate(`/groups/${group._id}/expenses/new`)}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {expenses.map((expense) => {
                const badge = getCategoryBadge(expense.category);
                const isPayer = expense.payer?._id === user?._id;
                const userSplit = expense.splits?.find(
                  (s) => (s.user?._id || s.user) === user?._id
                );

                return (
                  <div
                    key={expense._id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${badge.bg} ${badge.text}`}
                      >
                        <Receipt className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                            {expense.description}
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase tracking-wide">
                            {expense.splitType} SPLIT
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 mt-1">
                          <span className="font-medium text-slate-600">
                            {isPayer ? 'You paid' : `${expense.payer?.name} paid`}
                          </span>{' '}
                          • {formatDate(expense.date)} • Split among {expense.splits?.length} people
                        </p>

                        {expense.notes && (
                          <p className="text-xs text-slate-500 italic mt-1 font-serif">
                            "{expense.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 pl-13 sm:pl-0">
                      <div className="text-right">
                        <p className="text-base font-black text-slate-900">
                          {formatPaise(expense.totalAmountPaise)}
                        </p>
                        {userSplit ? (
                          <p
                            className={`text-xs font-semibold ${
                              isPayer ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isPayer
                              ? `You lent ${formatPaise(expense.totalAmountPaise - userSplit.amountPaise)}`
                              : `You borrowed ${formatPaise(userSplit.amountPaise)}`}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">Not involved</p>
                        )}
                      </div>

                      {/* Edit / Delete Actions */}
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/groups/${group._id}/expenses/${expense._id}/edit`}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          title="Edit expense"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteExpenseModal({ isOpen: true, expenseId: expense._id, loading: false })
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Balances */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Member Net Balances</h2>
            <span className="text-xs text-slate-500">
              Positive (+) = Is owed money • Negative (-) = Owes money
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {memberBalances.map((m) => {
              const isMe = m.user._id === user?._id;
              const net = m.netBalancePaise;

              return (
                <div
                  key={m.user._id}
                  className={`p-5 rounded-2xl bg-white border shadow-sm transition ${
                    isMe ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.user.name} avatar={m.user.avatar} size="md" />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          {m.user.name} {isMe && <span className="text-emerald-600 font-semibold">(You)</span>}
                        </p>
                        <p className="text-xs text-slate-400">{m.user.email}</p>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        net > 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : net < 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {net > 0 ? 'Creditor' : net < 0 ? 'Debtor' : 'Settled'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Total Paid for group:</span>
                      <span className="font-semibold text-slate-800">{formatPaise(m.totalPaidPaise)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Share of expenses:</span>
                      <span className="font-semibold text-slate-800">{formatPaise(m.totalOwedPaise)}</span>
                    </div>
                    {(m.settlementsPaidPaise > 0 || m.settlementsReceivedPaise > 0) && (
                      <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200/60">
                        <span>Payments made / received:</span>
                        <span>
                          +{formatPaise(m.settlementsPaidPaise)} / -{formatPaise(m.settlementsReceivedPaise)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Net Balance:</span>
                    <span
                      className={`text-base font-black ${
                        net > 0
                          ? 'text-emerald-600'
                          : net < 0
                          ? 'text-rose-600'
                          : 'text-slate-800'
                      }`}
                    >
                      {formatPaise(net, true)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Settlement Plan */}
      {activeTab === 'settlement' && (
        <div className="space-y-4">
          <div className="p-5 bg-gradient-to-br from-emerald-50/60 via-teal-50/40 to-slate-50 rounded-3xl border border-emerald-100">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">
                Minimum-Payment Debt Simplification Plan
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              Our greedy matching algorithm computes the optimal payment schedule to clear all debts in
              at most (N - 1) transactions, ensuring total money transferred equals total money owed
              with integer-paise precision.
            </p>
          </div>

          {settlementPlan.length === 0 ? (
            <div className="p-10 bg-white rounded-2xl border border-slate-100 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">All balances are settled!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No member in this group owes any money. All expenses are balanced.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {settlementPlan.map((step, idx) => {
                const isFromMe = step.from._id === user?._id;
                const isToMe = step.to._id === user?._id;

                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      {/* Debtor */}
                      <div className="flex items-center gap-2.5">
                        <Avatar name={step.from.name} avatar={step.from.avatar} size="sm" />
                        <span className="font-bold text-slate-900 text-sm">
                          {isFromMe ? 'You' : step.from.name}
                        </span>
                      </div>

                      {/* Direction Arrow */}
                      <div className="flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-slate-500 text-xs font-semibold">
                        <span>pays</span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                      </div>

                      {/* Creditor */}
                      <div className="flex items-center gap-2.5">
                        <Avatar name={step.to.name} avatar={step.to.avatar} size="sm" />
                        <span className="font-bold text-slate-900 text-sm">
                          {isToMe ? 'You' : step.to.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className="text-lg font-black text-emerald-600">
                        {formatPaise(step.amountPaise)}
                      </span>

                      {/* Settle up action button */}
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenSettleWithPrefill(step.from._id, step.to._id, step.amountPaise)
                        }
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition active:scale-[0.98] flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Record Payment</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Recorded Payments History */}
      {activeTab === 'settlements_history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Recorded Payments</h2>
            <button
              onClick={() => setIsSettleUpOpen(true)}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record a Payment</span>
            </button>
          </div>

          {recordedSettlements.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No recorded payments yet"
              description="When members make transfers or cash handovers to settle debts, record them here to update balances."
              actionText="Record a Payment"
              onAction={() => setIsSettleUpOpen(true)}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {recordedSettlements.map((st) => (
                <div
                  key={st._id}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {st.fromUser?._id === user?._id ? 'You' : st.fromUser?.name} paid{' '}
                        {st.toUser?._id === user?._id ? 'You' : st.toUser?.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDate(st.date)} {st.notes ? `• ${st.notes}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-base font-black text-emerald-600">
                      {formatPaise(st.amountPaise)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteSettlementModal({ isOpen: true, settlementId: st._id, loading: false })
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete payment record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Members List */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Group Members</h2>
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {group.members.map((member) => {
              const isCreator = group.creator?._id === member._id;
              const isMe = user?._id === member._id;

              return (
                <div
                  key={member._id}
                  className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-3"
                >
                  <Avatar name={member.name} avatar={member.avatar} size="md" />
                  <div className="truncate flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-800 text-sm truncate">{member.name}</p>
                      {isCreator && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{member.email}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        groupId={group._id}
        onMemberAdded={async () => await fetchAllGroupData()}
      />

      <SettleUpModal
        isOpen={isSettleUpOpen}
        onClose={() => setIsSettleUpOpen(false)}
        group={group}
        defaultPayerId={settleDefaults.payerId}
        defaultRecipientId={settleDefaults.recipientId}
        defaultAmountPaise={settleDefaults.amountPaise}
        onSettled={async () => await fetchAllGroupData()}
      />

      {/* Delete Expense Confirmation */}
      <ConfirmationModal
        isOpen={deleteExpenseModal.isOpen}
        onClose={() => setDeleteExpenseModal({ isOpen: false, expenseId: null, loading: false })}
        onConfirm={handleDeleteExpenseConfirm}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? All balances and settlement plans will be immediately recalculated."
        confirmText="Delete Expense"
        isDanger={true}
        loading={deleteExpenseModal.loading}
      />

      {/* Delete Settlement Confirmation */}
      <ConfirmationModal
        isOpen={deleteSettlementModal.isOpen}
        onClose={() => setDeleteSettlementModal({ isOpen: false, settlementId: null, loading: false })}
        onConfirm={handleDeleteSettlementConfirm}
        title="Delete Recorded Settlement"
        message="Are you sure you want to delete this recorded payment? The debt will be restored to member balances."
        confirmText="Delete Payment"
        isDanger={true}
        loading={deleteSettlementModal.loading}
      />
    </div>
  );
}
