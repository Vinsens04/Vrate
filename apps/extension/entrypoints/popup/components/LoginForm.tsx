import React, { useState } from 'react';
import { sendExtensionMessage } from '../../../src/auth/messages';
import { signInInputSchema } from '../../../src/auth/schemas';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
}

export function LoginForm({ onSubmit, isLoading, errorMessage }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    const validation = signInInputSchema.safeParse({ email, password });
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Invalid input';
      setFieldError(firstError);
      return;
    }

    await onSubmit(email.trim(), password);
  };

  const handleOpenRegister = () => {
    void sendExtensionMessage({
      type: 'OPEN_URL',
      payload: { url: '/register?source=extension' },
    });
  };

  const handleOpenForgotPassword = () => {
    void sendExtensionMessage({
      type: 'OPEN_URL',
      payload: { url: '/forgot-password?source=extension' },
    });
  };

  const displayError = fieldError || errorMessage;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {displayError && (
        <div className="error-banner" role="alert">
          {displayError}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="vr-email" className="form-label">
          Email
        </label>
        <div className="input-container">
          <input
            id="vr-email"
            type="email"
            className="vr-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@email.com"
            autoComplete="email"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label htmlFor="vr-password" className="form-label">
            Password
          </label>
          <button
            type="button"
            className="link-btn"
            onClick={handleOpenForgotPassword}
            style={{ fontSize: '11px' }}
          >
            Forgot password?
          </button>
        </div>
        <div className="input-container">
          <input
            id="vr-password"
            type={showPassword ? 'text' : 'password'}
            className="vr-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            disabled={isLoading}
            style={{ paddingRight: '56px' }}
          />
          <button
            type="button"
            className="toggle-password-btn"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="btn-primary"
        disabled={isLoading || !email || !password}
        style={{ marginTop: '4px' }}
      >
        {isLoading ? 'Verifying...' : 'Sign in to Vrate'}
      </button>

      <div className="auth-links" style={{ justifyContent: 'center', gap: '4px', fontSize: '12px' }}>
        <span style={{ color: '#A3A3A3', fontSize: '11px' }}>Don&apos;t have an account?</span>
        <button
          type="button"
          className="link-btn"
          onClick={handleOpenRegister}
          style={{ fontWeight: 600 }}
        >
          Sign up now
        </button>
      </div>
    </form>
  );
}
