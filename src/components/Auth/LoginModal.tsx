import React, { useState } from 'react';
import { Lock, User, KeyRound, ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../../api/client';
import { WAArchiverLogo } from '../Common/WAArchiverLogo';

interface LoginModalProps {
  onLoginSuccess: (username: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(username.trim(), password.trim(), remember);
      onLoginSuccess(res.username);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDefault = () => {
    setUsername('admin');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'var(--bg-app)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      {/* Top Brand Banner */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '220px',
        backgroundColor: 'var(--wa-primary-dark)',
        zIndex: 0
      }} />

      {/* Main Login Card */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '460px',
        backgroundColor: 'var(--bg-modal)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-main)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        animation: 'fadeIn 0.3s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '32px 32px 24px',
          textAlign: 'center',
          borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(180deg, rgba(0, 168, 132, 0.08) 0%, transparent 100%)'
        }}>
          <div style={{ marginBottom: '14px' }}>
            <WAArchiverLogo size={68} showGlow />
          </div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '4px'
          }}>
            WA Archiver
          </h1>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            Self-Hosted WhatsApp Chat & Media Vault
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '28px 32px 32px' }}>
          {error && (
            <div style={{
              backgroundColor: 'rgba(230, 57, 70, 0.12)',
              border: '1px solid rgba(230, 57, 70, 0.3)',
              color: '#e63946',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Lock size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Username Field */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              Admin Username
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '0 14px',
              transition: 'border-color 0.2s'
            }}>
              <User size={18} color="var(--text-muted)" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                style={{
                  width: '100%',
                  padding: '12px 10px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              Password
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '0 14px'
            }}>
              <KeyRound size={18} color="var(--text-muted)" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '12px 10px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Options: Remember & Quick Fill */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            fontSize: '13px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                style={{ accentColor: 'var(--wa-primary)' }}
              />
              Remember session
            </label>

            <button
              type="button"
              onClick={handleFillDefault}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--wa-primary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sparkles size={13} />
              Default (admin123)
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: 'var(--wa-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0, 168, 132, 0.3)',
              transition: 'background-color 0.2s, transform 0.1s',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Authenticating...' : (
              <>
                <span>Access Chat Vault</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Disclaimer / Trademark Notice */}
        <div style={{
          padding: '0 24px 20px',
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--text-muted)',
          lineHeight: '1.4'
        }}>
          Independent open-source project. Not affiliated with or endorsed by WhatsApp LLC or Meta Platforms, Inc.
        </div>
      </div>
    </div>
  );
};
