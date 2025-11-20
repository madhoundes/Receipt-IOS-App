
import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Check } from 'lucide-react';

interface SignUpViewProps {
  onSignUp: () => void;
}

const SignUpView: React.FC<SignUpViewProps> = ({ onSignUp }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) return;

    setIsLoading(true);
    if (navigator.vibrate) navigator.vibrate(10);

    // Simulate API call
    setTimeout(() => {
        setIsLoading(false);
        if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
        onSignUp();
    }, 1500);
  };

  return (
    <div className="absolute inset-0 bg-ios-bg z-[90] flex flex-col px-6 pt-20 pb-10 animate-fade-in">
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        
        <div className="mb-10 animate-slide-up">
            <h1 className="text-4xl font-bold text-neutral-900 mb-2">Create Account</h1>
            <p className="text-neutral-500 text-lg">Start tracking your expenses today.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up" style={{animationDelay: '100ms'}}>
            
            <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3 border border-transparent focus-within:border-ios-blue/50 transition-colors">
                <User className="text-ios-gray" size={20} />
                <input 
                    type="text"
                    placeholder="Full Name"
                    className="flex-1 bg-transparent focus:outline-none text-lg text-neutral-900 placeholder-neutral-400"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                />
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3 border border-transparent focus-within:border-ios-blue/50 transition-colors">
                <Mail className="text-ios-gray" size={20} />
                <input 
                    type="email"
                    placeholder="Email Address"
                    className="flex-1 bg-transparent focus:outline-none text-lg text-neutral-900 placeholder-neutral-400"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    required
                />
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3 border border-transparent focus-within:border-ios-blue/50 transition-colors">
                <Lock className="text-ios-gray" size={20} />
                <input 
                    type="password"
                    placeholder="Password"
                    className="flex-1 bg-transparent focus:outline-none text-lg text-neutral-900 placeholder-neutral-400"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required
                />
            </div>

            <div className="pt-6">
                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-ios-blue text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                    {isLoading ? (
                        <span>Creating Account...</span>
                    ) : (
                        <>
                            <span>Sign Up</span>
                            <ArrowRight size={20} />
                        </>
                    )}
                </button>

                <button 
                    type="button"
                    onClick={onSignUp}
                    className="w-full mt-4 text-sm font-medium text-neutral-400 hover:text-ios-blue transition-colors py-2"
                >
                    Guest Mode (Testing)
                </button>
            </div>

        </form>

        <div className="mt-auto text-center text-sm text-neutral-400 animate-fade-in" style={{animationDelay: '500ms'}}>
            <p>By signing up, you agree to our Terms of Service and Privacy Policy.</p>
        </div>

      </div>
    </div>
  );
};

export default SignUpView;
