import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('splitease_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('splitease_token'));
  const [balanceSummary, setBalanceSummary] = useState({
    totalNetBalancePaise: 0,
    totalYouAreOwedPaise: 0,
    totalYouOwePaise: 0
  });
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await authService.getMe();
      if (res.data.success) {
        setUser(res.data.data.user);
        if (res.data.data.balanceSummary) {
          setBalanceSummary(res.data.data.balanceSummary);
        }
        localStorage.setItem('splitease_user', JSON.stringify(res.data.data.user));
      }
    } catch (err) {
      console.warn('Failed to refresh user profile:', err.message);
      // If unauthorized, clear auth state
      if (err.response && err.response.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    const res = await authService.login({ email, password });
    if (res.data.success) {
      const { user: userData, token: userToken } = res.data.data;
      setUser(userData);
      setToken(userToken);
      localStorage.setItem('splitease_token', userToken);
      localStorage.setItem('splitease_user', JSON.stringify(userData));
      await refreshUser();
      return userData;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const register = async (name, email, password) => {
    const res = await authService.register({ name, email, password });
    if (res.data.success) {
      const { user: userData, token: userToken } = res.data.data;
      setUser(userData);
      setToken(userToken);
      localStorage.setItem('splitease_token', userToken);
      localStorage.setItem('splitease_user', JSON.stringify(userData));
      await refreshUser();
      return userData;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setBalanceSummary({
      totalNetBalancePaise: 0,
      totalYouAreOwedPaise: 0,
      totalYouOwePaise: 0
    });
    localStorage.removeItem('splitease_token');
    localStorage.removeItem('splitease_user');
  };

  const updateProfile = async (data) => {
    const res = await authService.updateProfile(data);
    if (res.data.success) {
      setUser(res.data.data.user);
      localStorage.setItem('splitease_user', JSON.stringify(res.data.data.user));
      return res.data.data.user;
    }
    throw new Error(res.data.message || 'Profile update failed');
  };

  const changePassword = async (data) => {
    const res = await authService.changePassword(data);
    return res.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        balanceSummary,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
        changePassword,
        isAuthenticated: !!token && !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
