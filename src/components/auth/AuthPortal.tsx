import React, { useState, useEffect } from 'react';
import { useClinic, CLINIC_USER_LIMIT_TIERS, MAX_ROLES_PER_USER, ALL_USER_ROLES } from '../../context/ClinicContext';
import { UserRole, ClinicUserLimitTier } from '../../types';
import {
  Building2,
  ShieldCheck,
  UserPlus,
  Users,
  LogIn,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  RefreshCw,
  Send,
  KeyRound,
  X,
  Check,
  ArrowRight,
  Terminal
} from 'lucide-react';
import { DeveloperCard } from './DeveloperCard';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface AuthPortalProps {
  onSuccess?: () => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({ onSuccess }) => {
  const {
    clinics,
    activeClinic,
    loginUser,
    loginWithGoogle,
    registerNewClinic,
    registerClinicWithGoogle,
    resendVerificationEmail,
    requestPasswordReset,
    verifyAndResetPassword,
    requestJoinClinic
  } = useClinic();

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [authMode, setAuthMode] = useState<'login' | 'register_clinic' | 'join_clinic' | 'developer'>(() => {
    return clinics.length === 0 ? 'register_clinic' : 'login';
  });

  useEffect(() => {
    if (clinics.length === 0) {
      setAuthMode('register_clinic');
    }
  }, [clinics.length]);

  // Sign In Form State
  const [loginClinicId, setLoginClinicId] = useState<string>(activeClinic?.id || clinics[0]?.id || '');
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [isResending, setIsResending] = useState(false);

  // Forgot Password Notice State
  const [showForgotPasswordNotice, setShowForgotPasswordNotice] = useState(false);

  useEffect(() => {
    if (clinics.length > 0 && !loginClinicId) {
      setLoginClinicId(clinics[0].id);
    }
  }, [clinics, loginClinicId]);

  // Check URL parameters for email verification
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const verifyEmailParam = params.get('verifyEmail');

      if (verifyEmailParam) {
        setLoginEmail(verifyEmailParam);
        setAuthMode('login');
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  // Register New Clinic Form State
  const [newClinicForm, setNewClinicForm] = useState({
    clinicName: '',
    clinicEmail: '',
    clinicAddress: '',
    clinicPhone: '',
    userLimitTier: 'basic' as ClinicUserLimitTier,
    adminName: '',
    adminPassword: '',
    confirmPassword: ''
  });
  const [isRegisteringClinic, setIsRegisteringClinic] = useState(false);
  const [clinicRegisterError, setClinicRegisterError] = useState<string>('');
  const [clinicRegisterSuccess, setClinicRegisterSuccess] = useState<{
    clinicName: string;
    email: string;
    message: string;
  } | null>(null);

  // Join Existing Clinic Form State
  const [joinForm, setJoinForm] = useState({
    clinicId: clinics[0]?.id || '',
    name: '',
    email: '',
    requestedRoles: ['doctor'] as UserRole[],
    title: ''
  });
  const [joinSuccess, setJoinSuccess] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');
  const [isJoining, setIsJoining] = useState(false);

  const toggleJoinRole = (role: UserRole) => {
    setJoinError('');
    setJoinForm(prev => {
      const exists = prev.requestedRoles.includes(role);
      if (exists) {
        if (prev.requestedRoles.length <= 1) {
          setJoinError('Please select at least 1 department role.');
          return prev;
        }
        return {
          ...prev,
          requestedRoles: prev.requestedRoles.filter(r => r !== role)
        };
      } else {
        if (prev.requestedRoles.length >= MAX_ROLES_PER_USER) {
          setJoinError(`You can select up to ${MAX_ROLES_PER_USER} roles per user.`);
          return prev;
        }
        return {
          ...prev,
          requestedRoles: [...prev.requestedRoles, role]
        };
      }
    });
  };

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setUnverifiedEmail(null);
    setResendStatus(null);

    if (!loginClinicId) {
      setLoginError('Please select the clinic facility you are logging into.');
      return;
    }

    if (!loginEmail.trim()) {
      setLoginError('Please enter your account email address.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await loginUser(loginClinicId, loginEmail, loginPassword);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setLoginError(res.message);
        if (res.isUnverified && res.email) {
          setUnverifiedEmail(res.email);
        }
      }
    } catch (err: any) {
      setLoginError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Resend verification email
  const handleResendVerification = async (emailToResend: string) => {
    if (!emailToResend) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      const res = await resendVerificationEmail(emailToResend, loginPassword);
      setResendStatus({
        message: res.message,
        isError: !res.success
      });
    } catch (err: any) {
      setResendStatus({
        message: err.message || 'Unable to send verification email at this time.',
        isError: true
      });
    } finally {
      setIsResending(false);
    }
  };

  // Self-service password reset has been disabled in favor of Admin-managed passwords.

  // Handle Register New Clinic
  const handleRegisterClinicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClinicRegisterError('');
    setClinicRegisterSuccess(null);

    if (!newClinicForm.clinicName.trim() || !newClinicForm.clinicEmail.trim() || !newClinicForm.adminName.trim()) {
      setClinicRegisterError('Please fill in the clinic name, email address, and administrator name.');
      return;
    }

    if (newClinicForm.adminPassword.length < 6) {
      setClinicRegisterError('Admin password must be at least 6 characters.');
      return;
    }

    if (newClinicForm.adminPassword !== newClinicForm.confirmPassword) {
      setClinicRegisterError('Passwords do not match. Please confirm your password.');
      return;
    }

    setIsRegisteringClinic(true);
    try {
      const selectedTierInfo = CLINIC_USER_LIMIT_TIERS[newClinicForm.userLimitTier] || CLINIC_USER_LIMIT_TIERS.basic;
      const res = await registerNewClinic(
        {
          name: newClinicForm.clinicName.trim(),
          address: newClinicForm.clinicAddress.trim() || 'Healthcare District',
          phone: newClinicForm.clinicPhone.trim() || '+1 (555) 100-2000',
          email: newClinicForm.clinicEmail.trim(),
          userLimitTier: newClinicForm.userLimitTier,
          userLimit: selectedTierInfo.maxUsers
        },
        {
          name: newClinicForm.adminName.trim(),
          email: newClinicForm.clinicEmail.trim(),
          password: newClinicForm.adminPassword,
          title: 'Clinic Administrator & Medical Director'
        }
      );

      if (res.success) {
        setClinicRegisterSuccess({
          clinicName: newClinicForm.clinicName.trim(),
          email: res.email || newClinicForm.clinicEmail.trim(),
          message: res.message || `Contact the developer to approve the account`
        });
        setNewClinicForm({
          clinicName: '',
          clinicEmail: '',
          clinicAddress: '',
          clinicPhone: '',
          userLimitTier: 'basic',
          adminName: '',
          adminPassword: '',
          confirmPassword: ''
        });
      } else {
        setClinicRegisterError(res.error || 'Failed to register clinic.');
      }
    } catch (err: any) {
      setClinicRegisterError(err.message || 'An unexpected error occurred during clinic registration.');
    } finally {
      setIsRegisteringClinic(false);
    }
  };

  // Handle Join Clinic Request
  const handleJoinClinicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    setJoinSuccess('');

    const targetClinicId = joinForm.clinicId || clinics[0]?.id;
    if (!targetClinicId) {
      setJoinError('Please select a clinic facility to join.');
      return;
    }

    if (!joinForm.name.trim() || !joinForm.email.trim()) {
      setJoinError('Please enter your full name and official email address.');
      return;
    }

    setIsJoining(true);
    try {
      const res = requestJoinClinic(targetClinicId, {
        name: joinForm.name,
        email: joinForm.email,
        requestedRole: joinForm.requestedRoles[0] || 'doctor',
        requestedRoles: joinForm.requestedRoles,
        title: joinForm.title
      });

      if (res.success) {
        setJoinSuccess(res.message);
        setJoinForm({
          clinicId: clinics[0]?.id || '',
          name: '',
          email: '',
          requestedRoles: ['doctor'],
          title: ''
        });
      } else {
        setJoinError(res.message);
      }
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      
      {/* Brand Header */}
      <div className="text-center mb-8 max-w-lg">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-900/40">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          ViperH.M.S
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          Multi-Tenant Hospital Management System & Clinic Database Gateway
        </p>

        {/* PWA Gadget Install Prompt */}
        <div className="mt-4 flex items-center justify-center">
          <PWAInstallButton variant="portal" />
        </div>
      </div>

      {/* Main Form Container */}
      <div
        className={`w-full ${
          authMode === 'developer' ? 'max-w-6xl' : 'max-w-xl'
        } bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden transition-all duration-200`}
      >
        
        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setLoginError('');
              setUnverifiedEmail(null);
            }}
            className={`py-3.5 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              authMode === 'login'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('register_clinic');
              setClinicRegisterError('');
              setClinicRegisterSuccess(null);
            }}
            className={`py-3.5 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              authMode === 'register_clinic'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>New Clinic</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('join_clinic');
              setJoinError('');
              setJoinSuccess('');
            }}
            className={`py-3.5 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              authMode === 'join_clinic'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Join Clinic</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('developer');
            }}
            className={`py-3.5 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              authMode === 'developer'
                ? 'border-amber-500 text-amber-400 bg-slate-900 shadow-xs'
                : 'border-transparent text-slate-700 hover:text-slate-950 bg-amber-50/50'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Developer Card</span>
          </button>
        </div>

        {authMode === 'developer' ? (
          <DeveloperCard onBackToLogin={() => setAuthMode('login')} />
        ) : (
        <div className="p-6 sm:p-8 space-y-6">

          {/* TAB 1: SIGN IN TO EXISTING CLINIC ACCOUNT */}
          {authMode === 'login' && (
            <div>
              {clinics.length === 0 ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-sm">No Registered Clinics in Database</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      There are currently no hospital or clinic facilities in the database. Register your clinic facility to begin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAuthMode('register_clinic')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4" />
                    Register Your First Clinic
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[11px]">
                      1. Select Clinic Facility Branch
                    </label>
                    <div className="relative">
                      <select
                        value={loginClinicId}
                        onChange={(e) => {
                          setLoginClinicId(e.target.value);
                        }}
                        className="w-full p-2.5 pl-9 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      >
                        {clinics.map(clinic => (
                          <option key={clinic.id} value={clinic.id}>
                            {clinic.name} ({clinic.code}){clinic.status === false ? ' — [Pending Developer Approval]' : ''}
                          </option>
                        ))}
                      </select>
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                    {clinics.find(c => c.id === loginClinicId)?.status === false && (
                      <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Contact the developer to approve the account (Database Status: false)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAuthMode('developer')}
                          className="text-[11px] font-bold text-amber-800 hover:underline shrink-0 cursor-pointer"
                        >
                          Developer Card &rarr;
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[11px]">
                      2. Email Address / Username
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="e.g. admin@yourclinic.health"
                        className="w-full p-2.5 pl-9 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                        3. Account Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPasswordNotice(true)}
                        className="text-amber-700 hover:text-amber-800 font-bold text-[11px] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Forgot password? Please contact the admin</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your account password"
                        className="w-full p-2.5 pl-9 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                    {showForgotPasswordNotice && (
                      <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Forgot password? Please contact the admin</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowForgotPasswordNotice(false)}
                          className="text-amber-600 hover:text-amber-900 p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {loginError && (
                    <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                        <span className="font-medium leading-relaxed">{loginError}</span>
                      </div>

                      {/* Unverified Email Information & Resend Button */}
                      {(unverifiedEmail || loginError.includes('not verified') || loginError.includes('verification link')) && (
                        <div className="pt-2.5 border-t border-rose-200/80 space-y-2">
                          <p className="text-[11px] text-rose-900">
                            <strong>Official Verification Required:</strong> Please check the inbox and spam/junk folders of <strong>{unverifiedEmail || loginEmail}</strong> and click the verification link sent by Firebase.
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-rose-700">Didn't receive the email?</span>
                            <button
                              type="button"
                              disabled={isResending}
                              onClick={() => handleResendVerification(unverifiedEmail || loginEmail)}
                              className="px-3 py-1 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              {isResending ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              <span>Resend Verification Email</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {resendStatus && (
                    <div
                      className={`p-3 rounded-lg border text-xs font-medium flex items-start gap-2 ${
                        resendStatus.isError
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {resendStatus.isError ? (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                      )}
                      <span>{resendStatus.message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoggingIn || isGoogleLoading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoggingIn ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Sign In to Workstation</span>
                      </>
                    )}
                  </button>

                  {/* Google Sign-In Divider & Button */}
                  <div className="relative my-3 pt-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                      <span className="bg-white px-2">Or continue with</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isGoogleLoading || isLoggingIn}
                    onClick={async () => {
                      setIsGoogleLoading(true);
                      setLoginError('');
                      try {
                        const res = await loginWithGoogle(loginClinicId);
                        if (res.success) {
                          if (onSuccess) onSuccess();
                        } else {
                          setLoginError(res.message);
                        }
                      } catch (err: any) {
                        setLoginError(err.message || 'Google authentication failed.');
                      } finally {
                        setIsGoogleLoading(false);
                      }
                    }}
                    className="w-full py-2.5 px-4 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2.5"
                  >
                    {isGoogleLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                        <span>Connecting Google Account...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        <span>Sign In with Google (Instant Verification)</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: REGISTER BRAND NEW CLINIC NAME */}
          {authMode === 'register_clinic' && (
            <div>
              {clinicRegisterSuccess ? (
                /* Clinic Account Opened — Pending Developer Approval Screen */
                <div className="space-y-4 py-2">
                  <div className="p-5 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 space-y-3">
                    <div className="flex items-center gap-2.5 text-amber-800 font-black text-sm">
                      <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
                      <span>Contact the developer to approve the account</span>
                    </div>

                    <p className="text-xs text-amber-900 leading-relaxed">
                      Clinic <strong>"{clinicRegisterSuccess.clinicName}"</strong> has been opened in the database with initial status <strong>false</strong> (Pending Developer Approval).
                    </p>

                    <div className="p-3.5 bg-white rounded-lg border border-amber-200 text-xs space-y-2 text-slate-800">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-amber-600" />
                        <span>Developer Approval Required</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Please <strong>contact the developer to approve the account</strong>. Once the developer approves <strong>"{clinicRegisterSuccess.clinicName}"</strong> inside the Developer Card, its status in the database will change from <strong>false</strong> to <strong>true</strong> and you will be able to sign in with <strong>{clinicRegisterSuccess.email}</strong>.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setLoginEmail(clinicRegisterSuccess.email);
                          setClinicRegisterSuccess(null);
                        }}
                        className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Return to Sign In</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setClinicRegisterSuccess(null);
                          setAuthMode('developer');
                        }}
                        className="w-full sm:w-auto px-4 py-2 border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Open Developer Card</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegisterClinicSubmit} className="space-y-4 text-xs">
                  <div className="p-3 bg-sky-50 rounded-lg border border-sky-200 text-sky-900 text-xs">
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-4 h-4 text-sky-600" />
                      New Clinic Facility Onboarding
                    </div>
                    <p className="text-[11px] text-sky-800">
                      Registering a new clinic automatically establishes its independent clinical database. An official verification email will be dispatched to verify your ownership.
                    </p>
                  </div>

                  {/* Clinic Information */}
                  <div className="space-y-3 pt-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Facility Details
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Clinic / Hospital Name *</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="e.g. St. Jude Central Medical Center"
                          value={newClinicForm.clinicName}
                          onChange={(e) => setNewClinicForm({ ...newClinicForm, clinicName: e.target.value })}
                          className="w-full p-2.5 pl-9 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Official Clinic Email *</label>
                        <div className="relative">
                          <input
                            type="email"
                            placeholder="admin@stjudehospital.com"
                            value={newClinicForm.clinicEmail}
                            onChange={(e) => setNewClinicForm({ ...newClinicForm, clinicEmail: e.target.value })}
                            className="w-full p-2.5 pl-9 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                            required
                          />
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Clinic Phone</label>
                        <input
                          type="text"
                          placeholder="+1 (555) 234-5678"
                          value={newClinicForm.clinicPhone}
                          onChange={(e) => setNewClinicForm({ ...newClinicForm, clinicPhone: e.target.value })}
                          className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Physical Facility Address</label>
                      <input
                        type="text"
                        placeholder="e.g. 742 Evergreen Healthcare Blvd, Suite 400"
                        value={newClinicForm.clinicAddress}
                        onChange={(e) => setNewClinicForm({ ...newClinicForm, clinicAddress: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>

                    {/* Upper Limit of Number of Users for the Clinic ID */}
                    <div className="pt-1">
                      <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-emerald-600" />
                          <span>Select Upper Limit of Users for Clinic ID *</span>
                        </span>
                        <span className="text-[11px] font-mono text-emerald-700">
                          Selected: {CLINIC_USER_LIMIT_TIERS[newClinicForm.userLimitTier].shortLabel} (Max {CLINIC_USER_LIMIT_TIERS[newClinicForm.userLimitTier].displayRange} Users)
                        </span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {(
                          [
                            { tier: 'access', title: 'Access', limit: '5 Users' },
                            { tier: 'basic', title: 'Basic', limit: '10 Users' },
                            { tier: 'standard', title: 'Standard', limit: '20 Users' },
                            { tier: 'premium', title: 'Premium', limit: '50 Users' },
                            { tier: 'enterprise', title: 'Enterprise', limit: '75+ Users' }
                          ] as Array<{ tier: ClinicUserLimitTier; title: string; limit: string }>
                        ).map(opt => {
                          const isSelected = newClinicForm.userLimitTier === opt.tier;
                          return (
                            <button
                              key={opt.tier}
                              type="button"
                              onClick={() =>
                                setNewClinicForm({ ...newClinicForm, userLimitTier: opt.tier })
                              }
                              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 text-emerald-950'
                                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              <div className="text-[11px] font-bold">{opt.title}</div>
                              <div
                                className={`text-xs font-black font-mono mt-0.5 ${
                                  isSelected ? 'text-emerald-700' : 'text-slate-900'
                                }`}
                              >
                                {opt.limit}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Sets the maximum number of staff user accounts permitted for this clinic ID. Can be modified later by the Developer.
                      </p>
                    </div>
                  </div>

                  {/* Chief Admin Account */}
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Chief Administrator Credentials (Level 5 Clearance)
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Chief Admin Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Catherine Mitchell, MD"
                        value={newClinicForm.adminName}
                        onChange={(e) => setNewClinicForm({ ...newClinicForm, adminName: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Admin Password (min 6 chars) *</label>
                        <div className="relative">
                          <input
                            type="password"
                            placeholder="Create secure password"
                            value={newClinicForm.adminPassword}
                            onChange={(e) => setNewClinicForm({ ...newClinicForm, adminPassword: e.target.value })}
                            className="w-full p-2.5 pl-9 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                            required
                          />
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Confirm Password *</label>
                        <div className="relative">
                          <input
                            type="password"
                            placeholder="Repeat password"
                            value={newClinicForm.confirmPassword}
                            onChange={(e) => setNewClinicForm({ ...newClinicForm, confirmPassword: e.target.value })}
                            className="w-full p-2.5 pl-9 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                            required
                          />
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {clinicRegisterError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                      {clinicRegisterError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isRegisteringClinic || isGoogleLoading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isRegisteringClinic ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Registering & Sending Official Verification Email...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Register Clinic & Send Verification Email</span>
                      </>
                    )}
                  </button>

                  {/* Google Registration Divider & Button */}
                  <div className="relative my-3 pt-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                      <span className="bg-white px-2">Or express register with</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isGoogleLoading || isRegisteringClinic}
                    onClick={async () => {
                      if (!newClinicForm.clinicName.trim()) {
                        setClinicRegisterError('Please enter the Clinic / Hospital Name above first.');
                        return;
                      }
                      setIsGoogleLoading(true);
                      setClinicRegisterError('');
                      try {
                        const selectedTierInfo = CLINIC_USER_LIMIT_TIERS[newClinicForm.userLimitTier] || CLINIC_USER_LIMIT_TIERS.basic;
                        const res = await registerClinicWithGoogle({
                          name: newClinicForm.clinicName.trim(),
                          address: newClinicForm.clinicAddress.trim() || 'Central Medical District',
                          phone: newClinicForm.clinicPhone.trim() || '+1 (555) 010-2000',
                          userLimitTier: newClinicForm.userLimitTier,
                          userLimit: selectedTierInfo.maxUsers
                        });
                        if (res.success) {
                          setClinicRegisterSuccess({
                            clinicName: newClinicForm.clinicName.trim(),
                            email: res.email || newClinicForm.clinicEmail.trim() || 'Google Account',
                            message: res.message || 'Contact the developer to approve the account'
                          });
                          setNewClinicForm({
                            clinicName: '',
                            clinicEmail: '',
                            clinicAddress: '',
                            clinicPhone: '',
                            userLimitTier: 'basic',
                            adminName: '',
                            adminPassword: '',
                            confirmPassword: ''
                          });
                        } else {
                          setClinicRegisterError(res.error || 'Google registration failed.');
                        }
                      } catch (err: any) {
                        setClinicRegisterError(err.message || 'Google registration failed.');
                      } finally {
                        setIsGoogleLoading(false);
                      }
                    }}
                    className="w-full py-2.5 px-4 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2.5"
                  >
                    {isGoogleLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                        <span>Creating Clinic via Google Account...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        <span>Register with Google (Instant Verification & Admin)</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: REQUEST TO JOIN AN EXISTING CLINIC */}
          {authMode === 'join_clinic' && (
            <div>
              {clinics.length === 0 ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-sm">No Clinics Available</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      You must register a clinic facility before staff members can apply to join.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAuthMode('register_clinic')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4" />
                    Register a Clinic First
                  </button>
                </div>
              ) : (
                <form onSubmit={handleJoinClinicSubmit} className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-xs">
                    <div className="font-bold flex items-center gap-1.5 mb-1 text-slate-900">
                      <UserPlus className="w-4 h-4 text-slate-600" />
                      Staff Clearance Request
                    </div>
                    <p className="text-[11px]">
                      Submit your application to join an existing clinic branch. Once approved by the Clinic Administrator, your account will be activated and an approval email dispatched to your inbox.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Clinic Facility *</label>
                    <select
                      value={joinForm.clinicId || clinics[0]?.id}
                      onChange={(e) => setJoinForm({ ...joinForm, clinicId: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-semibold"
                      required
                    >
                      {clinics.map(clinic => (
                        <option key={clinic.id} value={clinic.id}>
                          {clinic.name} ({clinic.code}) &bull; Admin: {clinic.adminName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Your Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Daniel Okafor, MD"
                        value={joinForm.name}
                        onChange={(e) => setJoinForm({ ...joinForm, name: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Official Work Email *</label>
                      <input
                        type="email"
                        placeholder="e.g. d.okafor@clinicstaff.org"
                        value={joinForm.email}
                        onChange={(e) => setJoinForm({ ...joinForm, email: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block font-bold text-slate-700">
                          Requested Department Roles (Select 1 to {MAX_ROLES_PER_USER} Roles)
                        </label>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            joinForm.requestedRoles.length >= MAX_ROLES_PER_USER
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {joinForm.requestedRoles.length} / {MAX_ROLES_PER_USER} Selected
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 bg-white p-2.5 rounded-lg border border-slate-300">
                        {ALL_USER_ROLES.map(roleOpt => {
                          const isSelected = joinForm.requestedRoles.includes(roleOpt.role);
                          const isPrimary = joinForm.requestedRoles[0] === roleOpt.role;
                          const isDisabled = !isSelected && joinForm.requestedRoles.length >= MAX_ROLES_PER_USER;
                          return (
                            <button
                              key={roleOpt.role}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => toggleJoinRole(roleOpt.role)}
                              className={`text-left px-2.5 py-1.5 rounded border text-[11px] font-semibold transition-all flex items-center justify-between gap-1.5 ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs cursor-pointer'
                                  : isDisabled
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-55 cursor-not-allowed'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer'
                              }`}
                            >
                              <span className="truncate">{roleOpt.label}</span>
                              {isSelected && (
                                <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-white/20 text-white shrink-0">
                                  {isPrimary ? '1st' : `#${joinForm.requestedRoles.indexOf(roleOpt.role) + 1}`}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        You may request up to {MAX_ROLES_PER_USER} roles. The Clinic Administrator will review and confirm your final assigned roles.
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Professional Title / Credentials</label>
                      <input
                        type="text"
                        placeholder="e.g. Consultant Surgeon, Staff Nurse"
                        value={joinForm.title}
                        onChange={(e) => setJoinForm({ ...joinForm, title: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  {joinError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                      {joinError}
                    </div>
                  )}

                  {joinSuccess && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{joinSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isJoining}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isJoining ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 text-emerald-400" />
                        <span>Submit Registration for Admin Approval</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
        )}

        {/* Footer info */}
        <div className="mt-2 pb-6 text-center text-xs text-slate-500 flex items-center justify-center gap-4">
          <span>&bull; Firestore Protected Database</span>
          <span>&bull; Role & Clearance Enforced</span>
        </div>
      </div>

      {/* Companion Developer Card Prompt alongside the Login Page */}
      {authMode !== 'developer' && (
        <div className="w-full max-w-xl mt-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Developer Telemetry & Clinic Usage Card</span>
                <Lock className="w-3 h-3 text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                Monitor users per clinic, Firestore reads/writes, and daily/monthly data calendar tracker (Password & PIN Protected).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAuthMode('developer')}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Open Developer Card</span>
          </button>
        </div>
      )}
    </div>
  );
};
