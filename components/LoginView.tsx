
import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Apple, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';

interface LoginViewProps {
  onLogin: () => void;
  onGuest: () => void;
  onNavigateToSignup: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onGuest, onNavigateToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Simple validation
  const isValidEmail = email.includes('@') && email.includes('.');
  const isValidPassword = password.length >= 6;
  const isFormValid = isValidEmail && isValidPassword;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    setError(null);
    if (navigator.vibrate) navigator.vibrate(10);

    // Simulate API Call
    setTimeout(() => {
      setIsLoading(false);
      if (email === 'error@test.com') {
          setError('Invalid email or password.');
          if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      } else {
          if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
          onLogin();
      }
    }, 1500);
  };

  const handleSocialLogin = (provider: 'apple' | 'google') => {
      if (navigator.vibrate) navigator.vibrate(10);
      // Stub for social login
      alert(`Sign in with ${provider} is coming soon.`);
  };

  return (
    <div className="absolute inset-0 bg-ios-bg z-[90] flex flex-col px-6 pt-12 pb-8 animate-fade-in">
      
      {/* Header */}
      <div className="mt-8 mb-8 flex flex-col items-center animate-slide-up">
         <div className="w-16 h-16 bg-ios-teal rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 mb-4">
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2 1-2 1Z"/><path d="M16 8h-6"/><path d="M16 12h-6"/><path d="M14 16h-4"/></svg>
         </div>
         <h1 className="text-3xl font-bold text-neutral-900">Welcome Back</h1>
         <p className="text-neutral-500 text-base mt-1">Log in to manage your expenses</p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="w-full max-w-md mx-auto animate-slide-up" style={{animationDelay: '100ms'}}>
        
        {/* Card Input Group */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6 border border-neutral-200/50">
            {/* Email */}
            <div className="flex items-center px-4 py-3 border-b border-neutral-100 focus-within:bg-neutral-50 transition-colors">
                <Mail className="text-neutral-400 mr-3" size={20} />
                <input 
                    type="email"
                    placeholder="Email"
                    className="flex-1 bg-transparent focus:outline-none text-lg text-neutral-900 placeholder-neutral-400"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    autoCapitalize="none"
                    autoCorrect="off"
                />
                {email && (
                    isValidEmail ? <CheckCircle size={16} className="text-green-500" /> : <span className="text-xs text-red-500 font-medium">Invalid</span>
                )}
            </div>

            {/* Password */}
            <div className="flex items-center px-4 py-3 focus-within:bg-neutral-50 transition-colors relative">
                <Lock className="text-neutral-400 mr-3" size={20} />
                <input 
                    type={isPasswordVisible ? "text" : "password"}
                    placeholder="Password"
                    className="flex-1 bg-transparent focus:outline-none text-lg text-neutral-900 placeholder-neutral-400"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                />
                <button 
                    type="button" 
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)} 
                    className="p-2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                >
                    {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </div>

        {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm font-medium mb-4 px-2 animate-fade-in">
                <AlertCircle size={16} />
                {error}
            </div>
        )}

        {/* Main Action */}
        <button 
            type="submit"
            disabled={!isFormValid || isLoading}
            className="w-full bg-ios-teal text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
        >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : "Log In"}
        </button>

        <div className="flex justify-between items-center mt-6 px-2">
            <button type="button" onClick={onGuest} className="text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors">
                Continue as Guest
            </button>
            <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm font-medium text-ios-teal hover:text-teal-600 transition-colors">
                Forgot Password?
            </button>
        </div>

        {/* Divider */}
        <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-ios-bg text-neutral-400">Or continue with</span></div>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => handleSocialLogin('apple')} className="flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl font-medium active:scale-[0.98] transition-transform">
                <Apple size={18} fill="currentColor" /> Apple
            </button>
            <button type="button" onClick={() => handleSocialLogin('google')} className="flex items-center justify-center gap-2 bg-white border border-neutral-200 text-neutral-900 py-3 rounded-xl font-medium active:scale-[0.98] transition-transform">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.49 12.275C23.49 11.485 23.42 10.73 23.295 10.005H12V14.515H18.46C18.18 15.995 17.34 17.26 16.085 18.1V21.09H19.87C22.085 19.05 23.49 16.025 23.49 12.275Z" fill="#4285F4"/><path d="M12 24C15.24 24 17.95 22.935 19.95 21.09L16.085 18.1C15.005 18.82 13.62 19.26 12 19.26C8.875 19.26 6.235 17.15 5.285 14.295H1.355V17.335C3.275 21.16 7.265 24 12 24Z" fill="#34A853"/><path d="M5.285 14.295C5.045 13.57 4.91 12.805 4.91 12C4.91 11.195 5.045 10.43 5.285 9.705V6.665H1.355C0.49 8.39 0 10.135 0 12C0 13.865 0.49 15.61 1.355 17.335L5.285 14.295Z" fill="#FBBC05"/><path d="M12 4.74C13.765 4.74 15.35 5.345 16.59 6.535L20.025 3.1C17.945 1.155 15.235 0 12 0C7.265 0 3.275 2.84 1.355 6.665L5.285 9.705C6.235 6.85 8.875 4.74 12 4.74Z" fill="#EA4335"/></svg>
                Google
            </button>
        </div>

      </form>

      {/* Footer */}
      <div className="mt-auto pt-8 text-center animate-fade-in" style={{animationDelay: '200ms'}}>
          <p className="text-neutral-500 text-sm">
              Don't have an account? <button onClick={onNavigateToSignup} className="text-ios-teal font-semibold hover:underline">Sign Up</button>
          </p>
      </div>

      {/* Forgot Password Sheet */}
      {showForgotPassword && (
          <div className="absolute inset-0 z-[100] flex items-end justify-center">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowForgotPassword(false)} />
              <div className="bg-ios-bg w-full max-w-md rounded-t-[2rem] p-6 animate-slide-up shadow-2xl relative z-10">
                  <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-6 opacity-50" />
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-neutral-900">Reset Password</h3>
                      <button onClick={() => setShowForgotPassword(false)} className="p-2 bg-neutral-200/80 rounded-full text-neutral-500"><X size={18} /></button>
                  </div>
                  <p className="text-neutral-500 text-sm mb-6">Enter your email address and we'll send you a link to reset your password.</p>
                  
                  <input 
                      type="email"
                      placeholder="Enter your email"
                      className="w-full p-4 rounded-xl border border-neutral-200 bg-white mb-4 focus:outline-none focus:border-ios-teal"
                      autoFocus
                  />
                  
                  <button 
                      onClick={() => {
                          if (navigator.vibrate) navigator.vibrate([10, 30]);
                          setShowForgotPassword(false);
                          alert("Reset link sent (Simulated)");
                      }}
                      className="w-full bg-ios-teal text-white font-semibold py-3.5 rounded-xl shadow-sm active:scale-[0.98] transition-transform"
                  >
                      Send Reset Link
                  </button>
              </div>
          </div>
      )}

    </div>
  );
};

export default LoginView;