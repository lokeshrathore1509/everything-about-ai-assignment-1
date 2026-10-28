import React from 'react';
import { Menu, Plus, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import { formatPaise } from '../../utils/currency';

export default function Navbar({ onOpenMobile }) {
  const { user, balanceSummary } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Mobile brand & hamburger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-base">SplitEase</span>
        </div>
      </div>

      {/* Right controls: quick action & user pill */}
      <div className="flex items-center gap-3 ml-auto">
        <Link
          to="/groups"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          Browse Groups
        </Link>
        <Link
          to="/groups/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Group</span>
        </Link>

        {/* Balance badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-700 border border-slate-200/60">
          <span className="text-slate-400">Net:</span>
          <span
            className={`font-semibold ${
              balanceSummary.totalNetBalancePaise > 0
                ? 'text-emerald-600'
                : balanceSummary.totalNetBalancePaise < 0
                ? 'text-rose-600'
                : 'text-slate-700'
            }`}
          >
            {formatPaise(balanceSummary.totalNetBalancePaise, true)}
          </span>
        </div>

        {/* User avatar link */}
        <Link to="/profile" className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <Avatar name={user?.name || ''} avatar={user?.avatar} size="sm" />
          <span className="hidden sm:inline text-xs font-medium text-slate-700 max-w-[100px] truncate">
            {user?.name?.split(' ')[0]}
          </span>
        </Link>
      </div>
    </header>
  );
}
