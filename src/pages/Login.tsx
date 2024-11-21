import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap } from 'lucide-react';

export default function Login() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/dashboard' : '/events'} replace />;
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <GraduationCap className="w-12 h-12 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to EventLynk</h1>
          <p className="text-gray-600">Sign in to access your account</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#7E22CE',
                    brandAccent: '#9333EA',
                    brandButtonText: 'white',
                    defaultButtonBackground: 'white',
                    defaultButtonBackgroundHover: '#F3F4F6',
                    defaultButtonBorder: 'lightgray',
                    defaultButtonText: 'gray',
                    dividerBackground: '#E5E7EB',
                    inputBackground: 'white',
                    inputBorder: '#D1D5DB',
                    inputBorderHover: '#9333EA',
                    inputBorderFocus: '#7E22CE',
                    inputText: 'black',
                    inputLabelText: '#4B5563',
                    inputPlaceholder: '#9CA3AF',
                  },
                  space: {
                    buttonPadding: '12px 16px',
                    inputPadding: '12px 16px',
                  },
                  borderWidths: {
                    buttonBorderWidth: '1px',
                    inputBorderWidth: '1px',
                  },
                  radii: {
                    borderRadiusButton: '12px',
                    buttonBorderRadius: '12px',
                    inputBorderRadius: '12px',
                  },
                  fontSizes: {
                    baseButtonSize: '16px',
                    baseInputSize: '16px',
                    baseLabelSize: '14px',
                  },
                },
              },
              style: {
                button: {
                  fontSize: '16px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  transition: 'all 0.2s ease',
                  textTransform: 'none',
                  letterSpacing: 'normal',
                },
                anchor: {
                  color: '#7E22CE',
                  fontSize: '14px',
                  textDecoration: 'none',
                },
                label: {
                  fontSize: '14px',
                  marginBottom: '4px',
                  color: '#4B5563',
                },
                input: {
                  fontSize: '16px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                },
                message: {
                  fontSize: '14px',
                  padding: '12px',
                  marginBottom: '16px',
                  borderRadius: '8px',
                },
                container: {
                  gap: '16px',
                },
              },
            }}
            providers={['google']}
            redirectTo={`${window.location.origin}/auth/callback`}
            onlyThirdPartyProviders={false}
          />
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            By signing in, you agree to our{' '}
            <a href="#" className="text-purple-600 hover:text-purple-700">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-purple-600 hover:text-purple-700">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}