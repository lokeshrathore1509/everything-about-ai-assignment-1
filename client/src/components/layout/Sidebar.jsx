import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users2,
  PlusCircle,
  Scale,
  Settings,
  LogOut,
  Wallet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import { formatPaise } from '../../utils/currency';

export default function Sidebar({ onCloseMobile }) {
  const { user, logout, balanceSummary } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'All Groups', path: '/groups', icon: Users2 },
    { name: 'Create Group', path: '/groups/new', icon: PlusCircle },
    { name: 'Settlement Plans', path: '/settlements', icon: Scale },
    { name: 'Profile & Settings', path: '/profile', icon: Settings }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-full select-none">
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Split<span className="text-emerald-600">Ease</span>
          </span>
          <span className="block text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">
            Fintech Splitter
          </span>
        </div>
      </div>

      {/* User Balance Glance Box */}
      <div className="mx-4 my-4 p-3.5 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 rounded-xl border border-emerald-100/80 shadow-xs">
        <p className="text-xs text-slate-500 font-medium">Your Net Balance</p>
        <p
          className={`text-lg font-bold tracking-tight mt-0.5 ${
            balanceSummary.totalNetBalancePaise > 0
              ? 'text-emerald-600'
              : balanceSummary.totalNetBalancePaise < 0
              ? 'text-rose-600'
              : 'text-slate-700'
          }`}
        >
          {formatPaise(balanceSummary.totalNetBalancePaise, true)}
        </p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-100/60 text-[11px]">
          <span className="text-slate-500">
            Owed: <span className="text-emerald-600 font-semibold">{formatPaise(balanceSummary.totalYouAreOwedPaise)}</span>
          </span>
          <span className="text-slate-500">
            Owe: <span className="text-rose-600 font-semibold">{formatPaise(balanceSummary.totalYouOwePaise)}</span>
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout at bottom */}
      <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Avatar name={user?.name || ''} avatar={user?.avatar} size="sm" />
          <div className="truncate">
            <p className="text-xs font-semibold text-slate-800 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Sign out"
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
