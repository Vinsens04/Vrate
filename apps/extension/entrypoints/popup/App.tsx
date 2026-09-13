import React, { useCallback, useEffect, useState } from 'react';
import { APP_INFO } from '@vrate/shared';
import { sendExtensionMessage } from '../../src/auth/messages';
import type {
  ExtensionAuthResponse,
  ExtensionAuthState,
  SafeUser,
  UserProfile,
} from '../../src/auth/schemas';
import { ConnectedAccount } from './components/ConnectedAccount';
import { ErrorNotice } from './components/ErrorNotice';
import { Header } from './components/Header';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { LoginForm } from './components/LoginForm';

export default function App() {
  const [authState, setAuthState] = useState<ExtensionAuthState>('loading');
  const [user, setUser] = useState<SafeUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSession = useCallback(async () => {
    setAuthState('loading');
    setErrorMessage(null);

    try {
      const response = await sendExtensionMessage<ExtensionAuthResponse>({
        type: 'AUTH_GET_STATE',
      });

      if (response && response.success && response.state === 'signed_in' && response.user) {
        setAuthState('signed_in');
        setUser(response.user);
        setProfile(response.profile || null);
      } else if (response && response.state) {
        setAuthState(response.state);
        setUser(null);
        setProfile(null);
        if (response.error) {
          setErrorMessage(response.error);
        }
      } else {
        setAuthState('signed_out');
        setUser(null);
      }
    } catch (err: unknown) {
      setAuthState('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to connect popup to background worker.'
      );
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const handleSignIn = async (email: string, password: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await sendExtensionMessage<ExtensionAuthResponse>({
        type: 'AUTH_SIGN_IN',
        payload: { email, password },
      });

      if (response && response.success && response.user) {
        setAuthState('signed_in');
        setUser(response.user);
        setProfile(response.profile || null);
        setErrorMessage(null);
      } else {
        setErrorMessage(response?.error || 'Failed to sign in. Please check your email and password.');
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred while trying to sign in.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setIsSubmitting(true);
    try {
      await sendExtensionMessage<ExtensionAuthResponse>({
        type: 'AUTH_SIGN_OUT',
      });
      setAuthState('signed_out');
      setUser(null);
      setProfile(null);
      setErrorMessage(null);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to sign out from extension.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="popup-container">
      <Header state={authState} />

      {authState === 'loading' && <LoadingSkeleton />}

      {authState === 'unconfigured' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="error-banner" role="alert">
            <strong>Configuration Incomplete</strong>
            <p style={{ marginTop: '4px', fontSize: '11px', lineHeight: '1.4' }}>
              Extension is missing Supabase URL or Anon Key. Add the variables to{' '}
              <code>apps/extension/.env.local</code> and rebuild the extension.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadSession}
          >
            Reload
          </button>
        </div>
      )}

      {authState === 'signed_in' && user && (
        <ConnectedAccount
          user={user}
          profile={profile}
          onSignOut={handleSignOut}
          isSigningOut={isSubmitting}
        />
      )}

      {(authState === 'signed_out' || authState === 'expired') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {authState === 'expired' && (
            <div className="notice-card" style={{ borderColor: 'rgba(255, 92, 53, 0.3)' }}>
              <p style={{ color: '#FF5C35', fontWeight: 600 }}>Session Expired</p>
              <p style={{ fontSize: '11px', marginTop: '2px' }}>
                Your session has expired. Please enter your account credentials again.
              </p>
            </div>
          )}

          <LoginForm
            onSubmit={handleSignIn}
            isLoading={isSubmitting}
            errorMessage={errorMessage}
          />
        </div>
      )}

      {authState === 'offline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <ErrorNotice
            message="Connection lost. Unable to reach Vrate authentication server."
            onRetry={loadSession}
            retryLabel="Try Again"
          />
        </div>
      )}

      {authState === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <ErrorNotice
            message={errorMessage || 'An internal error occurred in the extension.'}
            onRetry={loadSession}
            retryLabel="Try Again"
          />
        </div>
      )}

      <footer className="footer-note">
        {APP_INFO.name} Extension • v{APP_INFO.version}
      </footer>
    </div>
  );
}
