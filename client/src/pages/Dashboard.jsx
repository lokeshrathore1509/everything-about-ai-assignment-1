import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupService, expenseService } from '../services/api';
import { formatPaise, formatDate, getCategoryBadge } from '../utils/currency';
import Avatar from '../components/common/Avatar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Users,
  Plus,
  ArrowRight,
  Receipt,
  Sparkles,
  ShieldCheck,
  Calendar
} from 'lucide-react';

export default function Dashboard() {
  const { user, balanceSummary, refreshUser } = useAuth();
  const [groups, setGroups] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await refreshUser();
        const groupsRes = await groupService.getGroups();
        if (groupsRes.data.success) {
          const userGroups = groupsRes.data.data.groups;
          setGroups(userGroups);

          // Fetch recent expenses across all user groups
          const expensePromises = userGroups.slice(0, 3).map((g) =>
            expenseService.getGroupExpenses(g._id).catch(() => ({ data: { data: { expenses: [] } } }))
          );
          const expenseResults = await Promise.all(expensePromises);
          const allExpenses = expenseResults
            .flatMap((r) => r.data?.data?.expenses || [])
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 6);

          setRecentExpenses(allExpenses);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshUser]);

  if (loading) {
    return <LoadingSpinner text="Loading your financial dashboard..." />;
  }

  const { totalNetBalancePaise, totalYouAreOwedPaise, totalYouOwePaise } = balanceSummary;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, <span className="text-emerald-600">{user?.name}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/settlements"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold shadow-xs transition active:scale-[0.98]"
          >
            <Scale className="w-4 h-4 text-emerald-600" />
            <span>Settlement Plans</span>
          </Link>
          <Link
            to="/groups/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-emerald-600/20 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Group</span>
          </Link>
        </div>
      </div>

      {/* 3 Overview Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        {/* Card 1: Total Balance */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Balance
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                totalNetBalancePaise > 0
                  ? 'bg-emerald-50 text-emerald-600'
                  : totalNetBalancePaise < 0
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                totalNetBalancePaise > 0
                  ? 'text-emerald-600'
                  : totalNetBalancePaise < 0
                  ? 'text-rose-600'
                  : 'text-slate-800'
              }`}
            >
              {formatPaise(totalNetBalancePaise, true)}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {totalNetBalancePaise > 0
                ? 'You are owed money overall'
                : totalNetBalancePaise < 0
                ? 'You owe money overall'
                : 'All your accounts are settled up'}
            </p>
          </div>
        </div>

        {/* Card 2: You are Owed */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              You are owed
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {formatPaise(totalYouAreOwedPaise)}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Total to collect across {groups.length} groups
            </p>
          </div>
        </div>

        {/* Card 3: You Owe */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
              You owe
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
              {formatPaise(totalYouOwePaise)}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Total pending payments to friends
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Groups & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Your Groups (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Your Groups</h2>
            </div>
            <Link
              to="/groups"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group"
            >
              <span>View all ({groups.length})</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>

          {groups.length === 0 ? (
            <EmptyState
              title="No groups joined yet"
              description="Create a group for an upcoming trip, flatmates, or shared dinner expenses."
              actionText="Create Your First Group"
              onAction={() => (window.location.href = '/groups/new')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.map((group) => {
                const userBal = group.userNetBalancePaise || 0;
                return (
                  <Link
                    key={group._id}
                    to={`/groups/${group._id}`}
                    className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {group.category || 'General'}
                        </span>
                        {/* Status Badge */}
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            userBal > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : userBal < 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {userBal > 0
                            ? `+${formatPaise(userBal)}`
                            : userBal < 0
                            ? formatPaise(userBal)
                            : 'Settled'}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition truncate text-base">
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {group.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      {/* Member Avatars Stack */}
                      <div className="flex items-center -space-x-2">
                        {group.members.slice(0, 4).map((member) => (
                          <Avatar
                            key={member._id}
                            name={member.name}
                            avatar={member.avatar}
                            size="sm"
                            className="ring-2 ring-white"
                          />
                        ))}
                        {group.members.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600">
                            +{group.members.length - 4}
                          </div>
                        )}
                      </div>

                      <span className="font-medium">
                        Total:{' '}
                        <span className="font-bold text-slate-800">
                          {formatPaise(group.totalGroupExpensePaise)}
                        </span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Activity Feed (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recent Expenses</h2>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 divide-y divide-slate-100">
            {recentExpenses.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent expense activity
              </div>
            ) : (
              recentExpenses.map((expense) => {
                const categoryBadge = getCategoryBadge(expense.category);
                const isPayer = expense.payer?._id === user?._id;
                const userSplit = expense.splits?.find(
                  (s) => (s.user?._id || s.user) === user?._id
                );

                return (
                  <div key={expense._id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${categoryBadge.bg} ${categoryBadge.text}`}
                    >
                      <Receipt className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {expense.description}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {isPayer ? 'You paid' : `${expense.payer?.name?.split(' ')[0]} paid`} •{' '}
                        {formatDate(expense.date)}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-slate-900">
                        {formatPaise(expense.totalAmountPaise)}
                      </p>
                      {userSplit && (
                        <p className="text-[10px] text-slate-500">
                          Your share: {formatPaise(userSplit.amountPaise)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Precision Security Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Fintech Precision
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every balance in SplitEase is calculated using exact integer paise arithmetic. Zero
              floating-point rounding inaccuracies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
