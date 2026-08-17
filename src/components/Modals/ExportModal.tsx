import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  FileCode
} from 'lucide-react';
import { Chat, Participant, Message } from '../../types';
import { api } from '../../api/client';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat | null;
  participants?: Participant[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  chat
}) => {
  const [scope, setScope] = useState<'all' | 'custom'>('all');
  const [startDate, setStartDate] = useState(chat?.date_start || '');
  const [endDate, setEndDate] = useState(chat?.date_end || '');
  const [includeSystem, setIncludeSystem] = useState(true);
  const [includeMediaBadges, setIncludeMediaBadges] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!isOpen || !chat) return null;

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const filterStart = scope === 'custom' ? startDate : undefined;
      const filterEnd = scope === 'custom' ? endDate : undefined;
      const res = await api.getChatExport(chat.id, filterStart, filterEnd);

      // Filter system messages if requested
      const messagesToRender = includeSystem 
        ? res.messages 
        : res.messages.filter(m => m.type !== 'system');

      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Please allow popups in your browser to print the conversation.');
      }

      // Generate HTML with embedded print styles
      const printHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(chat.name)} — WA Archiver Print Export</title>
  <style>
    @page {
      margin: 15mm;
      size: auto;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111b21;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      font-size: 13px;
      line-height: 1.4;
    }
    .header {
      border-bottom: 2px solid #00a884;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header h1 {
      margin: 0 0 4px;
      font-size: 20px;
      color: #008069;
    }
    .meta {
      font-size: 11.5px;
      color: #667781;
    }
    .date-pill {
      text-align: center;
      margin: 16px 0 10px;
      page-break-after: avoid;
    }
    .date-pill span {
      background-color: #f0f2f5;
      border: 1px solid #e9edef;
      color: #54656f;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .message-row {
      display: flex;
      margin-bottom: 6px;
      page-break-inside: avoid;
    }
    .message-row.outgoing {
      justify-content: flex-end;
    }
    .message-row.incoming {
      justify-content: flex-start;
    }
    .message-row.system {
      justify-content: center;
    }
    .bubble {
      max-width: 75%;
      padding: 6px 10px;
      border-radius: 8px;
      position: relative;
      word-break: break-word;
      font-size: 13px;
    }
    .bubble.outgoing {
      background-color: #d9fdd3;
      border: 1px solid #c7f2be;
    }
    .bubble.incoming {
      background-color: #ffffff;
      border: 1px solid #e9edef;
    }
    .bubble.system {
      background-color: #fef7ea;
      border: 1px solid #fae6c0;
      color: #54656f;
      font-size: 11.5px;
      text-align: center;
      max-width: 85%;
    }
    .sender-name {
      font-size: 11.5px;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .content {
      white-space: pre-wrap;
    }
    .media-badge {
      display: inline-block;
      background: #e9edef;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      color: #008069;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .time {
      font-size: 10px;
      color: #667781;
      float: right;
      margin-left: 10px;
      margin-top: 4px;
    }
    .footer {
      margin-top: 30px;
      border-top: 1px solid #e9edef;
      padding-top: 10px;
      font-size: 10.5px;
      color: #8696a0;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${escapeHtml(chat.name)}</h1>
      <div class="meta">Exported from WA Archiver • ${messagesToRender.length.toLocaleString()} messages</div>
    </div>
    <div class="meta" style="text-align: right;">
      ${chat.date_start ? `Period: ${chat.date_start} — ${chat.date_end}` : ''}<br>
      Printed on ${new Date().toLocaleDateString()}
    </div>
  </div>

  <div class="messages">
    ${renderExportMessagesHtml(messagesToRender, includeMediaBadges)}
  </div>

  <div class="footer">
    Archived with WA Archiver — Self-Hosted WhatsApp Chat & Media Vault
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>
      `;

      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
      onClose();
    } catch (err: any) {
      setExportError(err.message || 'Failed to generate PDF print view.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportHTML = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const filterStart = scope === 'custom' ? startDate : undefined;
      const filterEnd = scope === 'custom' ? endDate : undefined;
      const res = await api.getChatExport(chat.id, filterStart, filterEnd);

      const messagesToRender = includeSystem 
        ? res.messages 
        : res.messages.filter(m => m.type !== 'system');

      const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(chat.name)} — WA Archiver Standalone Archive</title>
  <style>
    :root {
      --wa-bg: #efeae2;
      --bubble-out: #d9fdd3;
      --bubble-in: #ffffff;
      --wa-primary: #00a884;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--wa-bg);
      color: #111b21;
      display: flex;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .chat-container {
      width: 100%;
      max-width: 860px;
      background-color: #efeae2;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(11,20,26,0.12);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #d1d7db;
    }
    .header {
      background-color: #008069;
      color: #ffffff;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 { font-size: 18px; font-weight: 600; margin-bottom: 2px; }
    .header .subtitle { font-size: 12px; opacity: 0.9; }
    .messages-canvas {
      padding: 20px;
      background-color: #efeae2;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .date-pill {
      align-self: center;
      background-color: #ffffff;
      color: #54656f;
      padding: 5px 12px;
      border-radius: 8px;
      font-size: 11.5px;
      font-weight: 600;
      margin: 12px 0 6px;
      box-shadow: 0 1px 0.5px rgba(11,20,26,0.13);
      text-transform: uppercase;
    }
    .msg-row { display: flex; width: 100%; }
    .msg-row.out { justify-content: flex-end; }
    .msg-row.in { justify-content: flex-start; }
    .msg-row.sys { justify-content: center; }
    .bubble {
      max-width: 72%;
      padding: 7px 11px;
      border-radius: 8px;
      font-size: 13.8px;
      line-height: 19px;
      position: relative;
      box-shadow: 0 1px 0.5px rgba(11,20,26,0.13);
      word-break: break-word;
    }
    .bubble.out { background-color: var(--bubble-out); }
    .bubble.in { background-color: var(--bubble-in); }
    .bubble.sys {
      background-color: rgba(255,255,255,0.85);
      color: #54656f;
      font-size: 12px;
      text-align: center;
      max-width: 85%;
      border-radius: 8px;
    }
    .sender-title {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 3px;
    }
    .content { white-space: pre-wrap; }
    .meta-time {
      font-size: 10.5px;
      color: #667781;
      float: right;
      margin-left: 10px;
      margin-top: 3px;
      user-select: none;
    }
    .media-pill {
      background: rgba(0,0,0,0.06);
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      color: #008069;
      display: inline-block;
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="chat-container">
    <div class="header">
      <div>
        <h1>${escapeHtml(chat.name)}</h1>
        <div class="subtitle">${messagesToRender.length.toLocaleString()} messages • Standalone Offline Archive</div>
      </div>
      <div style="font-size: 12px; text-align: right; opacity: 0.9;">
        ${chat.date_start ? `${chat.date_start} — ${chat.date_end}` : ''}
      </div>
    </div>
    <div class="messages-canvas">
      ${renderExportMessagesHtml(messagesToRender, includeMediaBadges)}
    </div>
  </div>
</body>
</html>`;

      const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chat.name.replace(/[/\\?%*:|"<>]/g, '_')} - WA Archive.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (err: any) {
      setExportError(err.message || 'Failed to download standalone HTML archive.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(11, 20, 26, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-modal)',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: 'var(--shadow-main)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          backgroundColor: 'var(--bg-header)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Printer size={20} color="var(--wa-primary)" />
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Export & Print Conversation
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '22px 24px' }}>
          {exportError && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              {exportError}
            </div>
          )}

          {/* Chat Overview Card */}
          <div style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '18px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {chat.name}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {chat.message_count.toLocaleString()} total messages • {chat.date_start || 'N/A'} to {chat.date_end || 'N/A'}
            </div>
          </div>

          {/* Date Scope Selection */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
              Date Range
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setScope('all')}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: scope === 'all' ? '2px solid var(--wa-primary)' : '1px solid var(--border-subtle)',
                  backgroundColor: scope === 'all' ? 'rgba(0, 168, 132, 0.12)' : 'transparent',
                  color: scope === 'all' ? 'var(--wa-primary)' : 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                All Messages ({chat.message_count.toLocaleString()})
              </button>
              <button
                type="button"
                onClick={() => setScope('custom')}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: scope === 'custom' ? '2px solid var(--wa-primary)' : '1px solid var(--border-subtle)',
                  backgroundColor: scope === 'custom' ? 'rgba(0, 168, 132, 0.12)' : 'transparent',
                  color: scope === 'custom' ? 'var(--wa-primary)' : 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Custom Date Range
              </button>
            </div>

            {scope === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Options Checkboxes */}
          <div style={{ marginBottom: '22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeSystem}
                onChange={e => setIncludeSystem(e.target.checked)}
                style={{ accentColor: 'var(--wa-primary)' }}
              />
              <span>Include system encryption & creation notices</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeMediaBadges}
                onChange={e => setIncludeMediaBadges(e.target.checked)}
                style={{ accentColor: 'var(--wa-primary)' }}
              />
              <span>Include media attachment indicators & captions</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--wa-primary)',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isExporting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(0, 168, 132, 0.3)'
              }}
            >
              <Printer size={17} />
              <span>{isExporting ? 'Preparing...' : 'Print to PDF'}</span>
            </button>

            <button
              onClick={handleExportHTML}
              disabled={isExporting}
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isExporting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <FileCode size={17} color="var(--wa-primary)" />
              <span>Download HTML</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderExportMessagesHtml(messages: Message[], includeMedia: boolean): string {
  let html = '';
  let currentDate = '';

  for (const m of messages) {
    if (m.date_str !== currentDate) {
      currentDate = m.date_str;
      html += `<div class="date-pill"><span>${escapeHtml(currentDate)}</span></div>\n`;
    }

    const isOut = Boolean(m.is_me);
    const isSys = m.type === 'system' || !m.raw_sender;

    if (isSys) {
      html += `<div class="message-row system"><div class="bubble system">${escapeHtml(m.content)}</div></div>\n`;
      continue;
    }

    const rowClass = isOut ? 'outgoing' : 'incoming';
    const bubbleClass = isOut ? 'outgoing' : 'incoming';
    const senderColor = (m as any).sender_color || '#00a884';
    const senderName = (m as any).sender_name || m.raw_sender || 'User';

    let mediaBadge = '';
    if (includeMedia && m.type !== 'text') {
      mediaBadge = `<div class="media-badge">📎 [${m.type.toUpperCase()}] ${escapeHtml(m.media_name || m.type)}</div><br>`;
    }

    html += `
      <div class="message-row ${rowClass}">
        <div class="bubble ${bubbleClass}">
          ${!isOut ? `<div class="sender-name" style="color: ${senderColor}">${escapeHtml(senderName)}</div>` : ''}
          ${mediaBadge}
          <span class="content">${escapeHtml(m.content)}</span>
          <span class="time">${escapeHtml(m.time_str)}</span>
        </div>
      </div>\n`;
  }

  return html;
}
