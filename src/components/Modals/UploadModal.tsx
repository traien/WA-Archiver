import React, { useState, useRef } from 'react';
import { Upload, X, FileArchive, Users, User, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../../api/client';
import { Chat } from '../../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (chat: Chat) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [chatType, setChatType] = useState<'personal' | 'group' | 'auto'>('auto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
      setError('Please select a WhatsApp export .zip file (containing _chat.txt or chat.txt)');
      return;
    }
    setFile(selectedFile);
    setError(null);

    // Auto-detect type from file name
    const lower = selectedFile.name.toLowerCase();
    if (lower.includes('group') || lower.includes('team') || lower.includes('family')) {
      setChatType('group');
    } else if (lower.includes('chat with') || lower.includes('conversation')) {
      setChatType('personal');
    } else {
      setChatType('auto');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a .zip archive first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const explicitType = chatType === 'auto' ? undefined : chatType;
      const res = await api.uploadChatZip(file, explicitType);
      onUploadSuccess(res.chat);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import WhatsApp chat archive.');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        backgroundColor: 'var(--bg-modal)',
        borderRadius: '14px',
        boxShadow: 'var(--shadow-main)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-header)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileArchive size={22} color="var(--wa-primary)" />
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Import WhatsApp Chat Export
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              backgroundColor: 'rgba(230, 57, 70, 0.12)',
              border: '1px solid rgba(230, 57, 70, 0.3)',
              color: '#e63946',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? 'var(--wa-primary)' : file ? 'var(--wa-primary)' : 'var(--border-subtle)'}`,
              borderRadius: '12px',
              padding: '32px 20px',
              textAlign: 'center',
              backgroundColor: dragActive ? 'rgba(0, 168, 132, 0.08)' : file ? 'rgba(0, 168, 132, 0.04)' : 'var(--bg-input)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '20px'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={e => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
              style={{ display: 'none' }}
            />

            {file ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={38} color="var(--wa-primary)" />
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Size: {formatBytes(file.size)} • Ready to import
                </div>
                <span style={{ fontSize: '12px', color: 'var(--wa-primary)', marginTop: '4px', textDecoration: 'underline' }}>
                  Click or drop to choose another file
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 168, 132, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--wa-primary)'
                }}>
                  <Upload size={26} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                    Drag and drop your exported WhatsApp .zip file here
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Supports exports with media (photos, voice notes, videos, docs)
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Conversation Type Selector */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '10px'
            }}>
              Conversation Type
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setChatType('auto')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1.5px solid ${chatType === 'auto' ? 'var(--wa-primary)' : 'var(--border-subtle)'}`,
                  backgroundColor: chatType === 'auto' ? 'rgba(0, 168, 132, 0.12)' : 'var(--bg-input)',
                  color: chatType === 'auto' ? 'var(--wa-primary)' : 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Sparkles size={15} />
                <span>Auto-Detect</span>
              </button>

              <button
                type="button"
                onClick={() => setChatType('personal')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1.5px solid ${chatType === 'personal' ? 'var(--wa-primary)' : 'var(--border-subtle)'}`,
                  backgroundColor: chatType === 'personal' ? 'rgba(0, 168, 132, 0.12)' : 'var(--bg-input)',
                  color: chatType === 'personal' ? 'var(--wa-primary)' : 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <User size={15} />
                <span>Personal (1:1)</span>
              </button>

              <button
                type="button"
                onClick={() => setChatType('group')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1.5px solid ${chatType === 'group' ? 'var(--wa-primary)' : 'var(--border-subtle)'}`,
                  backgroundColor: chatType === 'group' ? 'rgba(0, 168, 132, 0.12)' : 'var(--bg-input)',
                  color: chatType === 'group' ? 'var(--wa-primary)' : 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Users size={15} />
                <span>Group Chat</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!file || loading}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--wa-primary)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: !file || loading ? 'not-allowed' : 'pointer',
                opacity: !file || loading ? 0.6 : 1,
                boxShadow: '0 2px 6px rgba(0, 168, 132, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <span>Extracting & Indexing...</span>
                </>
              ) : (
                <span>Import & Save to Disk</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
