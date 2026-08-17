import React, { useState, useEffect } from 'react';
import { X, BarChart3, Sparkles, Trophy, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Chat, ChatAnalytics } from '../../types';
import { api } from '../../api/client';

interface AnalyticsModalProps {
  chat: Chat | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ chat, isOpen, onClose }) => {
  const [analytics, setAnalytics] = useState<ChatAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllParticipants, setShowAllParticipants] = useState(false);
  const [hoveredHour, setHoveredHour] = useState<{ hour: number; count: number } | null>(null);
  const [hoveredDay, setHoveredDay] = useState<{ day: number; dayName: string; count: number } | null>(null);

  const fetchAnalytics = async () => {
    if (!chat) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getChatAnalytics(chat.id);
      setAnalytics(res.analytics);
    } catch (err: any) {
      console.error('Failed to load chat analytics:', err);
      setError(err.message || 'Failed to compute chat analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && chat) {
      fetchAnalytics();
    } else {
      setAnalytics(null);
      setError(null);
      setShowAllParticipants(false);
    }
  }, [isOpen, chat?.id]);

  if (!isOpen || !chat) return null;

  // Calculate max hour count for chart scaling
  const maxHourCount = analytics && analytics.activityByHour ? Math.max(...analytics.activityByHour.map(h => h.count), 1) : 1;
  const maxDayCount = analytics && analytics.activityByDayOfWeek ? Math.max(...analytics.activityByDayOfWeek.map(d => d.count), 1) : 1;

  // Sliced participants
  const displayedParticipants = analytics?.participantStats 
    ? (showAllParticipants ? analytics.participantStats : analytics.participantStats.slice(0, 12))
    : [];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      zIndex: 15000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '780px',
        maxHeight: '90vh',
        backgroundColor: 'var(--bg-modal)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-main)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          backgroundColor: 'var(--bg-header)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={22} color="var(--wa-primary)" />
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Chat Analytics & Insights
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {chat.name} {analytics?.dateRange.start ? `(${analytics.dateRange.start} → ${analytics.dateRange.end || ''})` : ''}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid var(--wa-primary)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px'
              }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Computing statistics & activity charts...
              </div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#e63946' }}>
              <AlertCircle size={36} style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>{error}</div>
              <button
                onClick={fetchAnalytics}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--wa-primary)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '12px'
                }}
              >
                <RefreshCw size={14} />
                <span>Retry</span>
              </button>
            </div>
          ) : !analytics ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No analytics data available.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* 1. Quick Stat Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{
                  backgroundColor: 'var(--bg-input)',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                    Messages
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--wa-primary)' }}>
                    {analytics.totalMessages.toLocaleString()}
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-input)',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                    Media Files
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#1f7a8c' }}>
                    {analytics.totalMedia.toLocaleString()}
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-input)',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                    Est. Words
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#e76f51' }}>
                    {analytics.totalWords.toLocaleString()}
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-input)',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                    Participants
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#7209b7' }}>
                    {analytics.participantStats.length}
                  </div>
                </div>
              </div>

              {/* 2. Participant Contribution */}
              <div style={{
                backgroundColor: 'var(--bg-input)',
                padding: '18px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={16} color="var(--wa-primary)" />
                    <span>Top Active Participants</span>
                  </div>

                  {analytics.participantStats.length > 12 && (
                    <button
                      onClick={() => setShowAllParticipants(prev => !prev)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--wa-primary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>{showAllParticipants ? 'Show Top 12' : `View All (${analytics.participantStats.length})`}</span>
                      {showAllParticipants ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {displayedParticipants.map(p => (
                    <div key={p.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: p.color }}>{p.name}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {p.messageCount.toLocaleString()} msgs ({p.percentage}%) • {p.mediaCount} media
                        </span>
                      </div>
                      <div style={{
                        height: '8px',
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.max(p.percentage, 1)}%`,
                          backgroundColor: p.color,
                          borderRadius: '4px'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. 24-Hour Activity Chart */}
              <div style={{
                backgroundColor: 'var(--bg-input)',
                padding: '18px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    🕒 Activity by Hour of Day (Peak Messaging Times)
                  </div>
                  {hoveredHour ? (
                    <div style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: 'var(--wa-primary)',
                      backgroundColor: 'rgba(0, 168, 132, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      animation: 'fadeIn 0.1s ease-out'
                    }}>
                      {String(hoveredHour.hour).padStart(2, '0')}:00 - {String((hoveredHour.hour + 1) % 24).padStart(2, '0')}:00 • {hoveredHour.count.toLocaleString()} messages ({analytics.totalMessages > 0 ? ((hoveredHour.count / analytics.totalMessages) * 100).toFixed(1) : 0}%)
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Hover over any bar to view exact counts
                    </div>
                  )}
                </div>

                {/* Bars Container - Shared Baseline */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  height: '95px',
                  gap: '3px',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '2px'
                }}>
                  {analytics.activityByHour.map(h => {
                    const isHovered = hoveredHour?.hour === h.hour;
                    const barHeight = Math.max((h.count / maxHourCount) * 85, 3);
                    return (
                      <div
                        key={h.hour}
                        onMouseEnter={() => setHoveredHour(h)}
                        onMouseLeave={() => setHoveredHour(null)}
                        style={{
                          flex: 1,
                          height: '100%',
                          display: 'flex',
                          alignItems: 'flex-end',
                          cursor: 'pointer'
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: `${barHeight}px`,
                            backgroundColor: isHovered ? '#25d366' : 'var(--wa-primary)',
                            borderRadius: '3px 3px 0 0',
                            opacity: isHovered ? 1 : (hoveredHour ? 0.45 : 0.85),
                            transform: isHovered ? 'scaleY(1.05)' : 'none',
                            transformOrigin: 'bottom',
                            boxShadow: isHovered ? '0 0 8px rgba(0, 168, 132, 0.6)' : 'none',
                            transition: 'background-color 0.1s, opacity 0.1s, transform 0.1s'
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Labels Row - Perfectly Aligned */}
                <div style={{ display: 'flex', height: '18px', gap: '3px', marginTop: '4px' }}>
                  {analytics.activityByHour.map(h => (
                    <div
                      key={h.hour}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        fontSize: '9px',
                        fontWeight: hoveredHour?.hour === h.hour ? 700 : 400,
                        color: hoveredHour?.hour === h.hour ? 'var(--wa-primary)' : 'var(--text-muted)',
                        userSelect: 'none'
                      }}
                    >
                      {h.hour % 3 === 0 ? `${h.hour}h` : ''}
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Day of Week Activity */}
              <div style={{
                backgroundColor: 'var(--bg-input)',
                padding: '18px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    📅 Activity by Day of Week
                  </div>
                  {hoveredDay ? (
                    <div style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: '#1f7a8c',
                      backgroundColor: 'rgba(31, 122, 140, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      animation: 'fadeIn 0.1s ease-out'
                    }}>
                      {hoveredDay.dayName} • {hoveredDay.count.toLocaleString()} messages ({analytics.totalMessages > 0 ? ((hoveredDay.count / analytics.totalMessages) * 100).toFixed(1) : 0}%)
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Hover over any day to view exact counts
                    </div>
                  )}
                </div>

                {/* Bars Container */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  height: '90px',
                  gap: '12px',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '2px'
                }}>
                  {analytics.activityByDayOfWeek.map(d => {
                    const isHovered = hoveredDay?.day === d.day;
                    const barHeight = Math.max((d.count / maxDayCount) * 80, 4);
                    return (
                      <div
                        key={d.day}
                        onMouseEnter={() => setHoveredDay(d)}
                        onMouseLeave={() => setHoveredDay(null)}
                        style={{
                          flex: 1,
                          height: '100%',
                          display: 'flex',
                          alignItems: 'flex-end',
                          cursor: 'pointer'
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: `${barHeight}px`,
                            backgroundColor: isHovered ? '#2a9d8f' : '#1f7a8c',
                            borderRadius: '4px 4px 0 0',
                            opacity: isHovered ? 1 : (hoveredDay ? 0.45 : 0.85),
                            transform: isHovered ? 'scaleY(1.05)' : 'none',
                            transformOrigin: 'bottom',
                            boxShadow: isHovered ? '0 0 8px rgba(31, 122, 140, 0.6)' : 'none',
                            transition: 'background-color 0.1s, opacity 0.1s, transform 0.1s'
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Labels Row */}
                <div style={{ display: 'flex', height: '20px', gap: '12px', marginTop: '6px' }}>
                  {analytics.activityByDayOfWeek.map(d => (
                    <div
                      key={d.day}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: hoveredDay?.day === d.day ? 700 : 600,
                        color: hoveredDay?.day === d.day ? '#1f7a8c' : 'var(--text-secondary)',
                        userSelect: 'none'
                      }}
                    >
                      {d.dayName}
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Top Emojis */}
              {analytics.topEmojis.length > 0 && (
                <div style={{
                  backgroundColor: 'var(--bg-input)',
                  padding: '18px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} color="var(--wa-primary)" />
                    <span>Most Used Emojis</span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {analytics.topEmojis.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          backgroundColor: 'var(--bg-modal)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>{item.emoji}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {item.count.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
