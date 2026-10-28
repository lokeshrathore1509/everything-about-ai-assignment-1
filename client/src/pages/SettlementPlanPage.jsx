import React, { useState, useEffect } from 'react';
import { groupService, settlementService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatPaise } from '../utils/currency';
import Avatar from '../components/common/Avatar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import SettleUpModal from '../components/settlements/SettleUpModal';
import {
  Scale,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  Layers
} from 'lucide-react';

export default function SettlementPlanPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedGroupData, setSelectedGroupData] = useState(null);
  const [settlementPlan, setSettlementPlan] = useState([]);
  const [creditors, setCreditors] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [settledMembers, setSettledMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Settle modal state
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settlePrefill, setSettlePrefill] = useState({ payerId: '', recipientId: '', amountPaise: 0 });

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await groupService.getGroups();
        if (res.data.success) {
          const userGroups = res.data.data.groups;
          setGroups(userGroups);
          if (userGroups.length > 0) {
            setSelectedGroupId(userGroups[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch groups:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const loadGroupPlan = async (groupId) => {
    if (!groupId) return;
    try {
      const [groupRes, planRes] = await Promise.all([
        groupService.getGroupById(groupId),
        settlementService.getSettlementPlan(groupId)
      ]);

      if (groupRes.data.success) {
        setSelectedGroupData(groupRes.data.data.group);
      }
      if (planRes.data.success) {
        setSettlementPlan(planRes.data.data.settlementPlan || []);
        setCreditors(planRes.data.data.creditors || []);
        setDebtors(planRes.data.data.debtors || []);
        setSettledMembers(planRes.data.data.settledMembers || []);
      }
    } catch (err) {
      console.error('Failed to load settlement plan for group:', err);
      toast.error('Could not load settlement plan');
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      loadGroupPlan(selectedGroupId);
    }
  }, [selectedGroupId]);

  if (loading) {
    return <LoadingSpinner text="Loading settlement plans..." />;
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={Scale}
        title="No groups found"
        description="Join or create a group to start managing shared expenses and calculating optimal debt settlement plans."
        actionText="Create Group"
        onAction={() => (window.location.href = '/groups/new')}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Debt Settlement Plans
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Greedy minimum-transaction matching algorithm for optimal debt clearance
          </p>
        </div>

        {/* Group Selector Dropdown */}
        <div className="w-full sm:w-64">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Selected Group
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
          >
            {groups.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Algorithm Transparency & Clarification Banner */}
      <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">
            How Debt Simplification Works
          </h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Instead of every member paying back individual expenses separately, our backend combines
          all expenses into a single net balance for each member. The algorithm then matches the
          largest debtors with the largest creditors to settle all balances in the minimum possible
          number of transactions (at most N - 1 payments).
        </p>

        <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <span>
            <strong>Note on Payments:</strong> The transactions shown below are calculated
            settlement suggestions. A payment is not considered completed until you click "Record
            Payment" or settle up through the group page.
          </span>
        </div>
      </div>

      {/* 2-Column Overview: Creditors & Debtors Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Creditors */}
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
              <span>Creditors (To Receive Money)</span>
            </h3>
            <span className="text-xs font-semibold text-slate-400">{creditors.length} members</span>
          </div>

          {creditors.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">No creditors in this group</p>
          ) : (
            <div className="space-y-2.5">
              {creditors.map((c) => (
                <div
                  key={c.user._id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.user.name} avatar={c.user.avatar} size="sm" />
                    <span className="text-xs font-bold text-slate-800">
                      {c.user._id === user?._id ? 'You' : c.user.name}
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-600">
                    +{formatPaise(c.amountPaise)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debtors */}
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
              <span>Debtors (To Pay Money)</span>
            </h3>
            <span className="text-xs font-semibold text-slate-400">{debtors.length} members</span>
          </div>

          {debtors.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">No debtors in this group</p>
          ) : (
            <div className="space-y-2.5">
              {debtors.map((d) => (
                <div
                  key={d.user._id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={d.user.name} avatar={d.user.avatar} size="sm" />
                    <span className="text-xs font-bold text-slate-800">
                      {d.user._id === user?._id ? 'You' : d.user.name}
                    </span>
                  </div>
                  <span className="text-xs font-black text-rose-600">
                    -{formatPaise(d.amountPaise)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommended Settlement Payments Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Recommended Settlement Transactions
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {settlementPlan.length} payments required to completely settle group
          </span>
        </div>

        {settlementPlan.length === 0 ? (
          <div className="p-12 bg-white rounded-3xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">This group is fully settled!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Zero outstanding balances remaining. No payment actions needed.
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
                  className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-200 transition"
                >
                  <div className="flex items-center gap-4">
                    {/* Debtor */}
                    <div className="flex items-center gap-2.5 min-w-[120px]">
                      <Avatar name={step.from.name} avatar={step.from.avatar} size="sm" />
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {isFromMe ? 'You' : step.from.name}
                        </p>
                        <p className="text-[10px] text-slate-400">Payer</p>
                      </div>
                    </div>

                    {/* Direction */}
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-slate-600 text-xs font-semibold">
                      <span>pays</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                    </div>

                    {/* Creditor */}
                    <div className="flex items-center gap-2.5 min-w-[120px]">
                      <Avatar name={step.to.name} avatar={step.to.avatar} size="sm" />
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {isToMe ? 'You' : step.to.name}
                        </p>
                        <p className="text-[10px] text-slate-400">Recipient</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="text-right">
                      <span className="text-lg font-black text-emerald-600 block">
                        {formatPaise(step.amountPaise)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Exact paise</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSettlePrefill({
                          payerId: step.from._id,
                          recipientId: step.to._id,
                          amountPaise: step.amountPaise
                        });
                        setIsSettleModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm shadow-emerald-600/20 transition active:scale-[0.98] flex items-center gap-1.5"
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

      {/* Settle Up Modal */}
      {selectedGroupData && (
        <SettleUpModal
          isOpen={isSettleModalOpen}
          onClose={() => setIsSettleModalOpen(false)}
          group={selectedGroupData}
          defaultPayerId={settlePrefill.payerId}
          defaultRecipientId={settlePrefill.recipientId}
          defaultAmountPaise={settlePrefill.amountPaise}
          onSettled={async () => {
            await loadGroupPlan(selectedGroupId);
          }}
        />
      )}
    </div>
  );
}
