import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface VoiceNotePlayerProps {
  src: string;
  senderName?: string;
  senderColor?: string;
  isOutgoing?: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  src,
  senderColor = '#00a884',
  isOutgoing = false
}) => {
  const { settings } = useSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(settings.defaultAudioSpeed || 1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate pseudorandom but deterministic waveform bars for this audio
  const bars = React.useMemo(() => {
    const count = 28;
    const result: number[] = [];
    let seed = 42;
    for (let i = 0; i < src.length; i++) {
      seed = (seed * 31 + src.charCodeAt(i)) % 1000;
    }
    for (let i = 0; i < count; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      const rnd = seed / 233280;
      // Heights between 6px and 28px
      result.push(Math.floor(6 + rnd * 22));
    }
    return result;
  }, [src]);

  const playerId = React.useId ? React.useId() : `${src}_${Math.random()}`;

  // Global Audio Coordination: Stop this player if another player starts playing
  useEffect(() => {
    const handleGlobalAudioPlay = (e: any) => {
      if (e.detail?.id !== playerId && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener('wa_global_audio_play', handleGlobalAudioPlay);
    return () => {
      window.removeEventListener('wa_global_audio_play', handleGlobalAudioPlay);
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    };
  }, [playerId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Notify all other audio instances to pause immediately
      window.dispatchEvent(new CustomEvent('wa_global_audio_play', { detail: { id: playerId } }));
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Audio playback error:', err);
      });
    }
  };

  const handleSeek = (index: number) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;
    const progressRatio = index / bars.length;
    audio.currentTime = progressRatio * duration;
    setCurrentTime(audio.currentTime);
  };

  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rates = [1, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const activeBarIndex = Math.floor(progressRatio * bars.length);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '4px 0',
      minWidth: '240px',
      maxWidth: '320px'
    }}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Mic / Avatar icon */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play voice note'}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: isOutgoing ? '#00a884' : '#00a884',
            color: '#ffffff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
            transition: 'transform 0.1s'
          }}
        >
          {isPlaying ? <Pause size={20} fill="#ffffff" /> : <Play size={20} fill="#ffffff" style={{ marginLeft: '2px' }} />}
        </button>

        <div style={{
          position: 'absolute',
          bottom: '-2px',
          right: '-2px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: senderColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          border: '1.5px solid var(--bg-bubble-in)'
        }}>
          <Mic size={10} />
        </div>
      </div>

      {/* Waveform & Duration */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          height: '30px',
          cursor: 'pointer'
        }}>
          {bars.map((height, i) => {
            const isPlayed = i <= activeBarIndex;
            return (
              <div
                key={i}
                onClick={() => handleSeek(i)}
                style={{
                  flex: 1,
                  height: `${height}px`,
                  borderRadius: '2px',
                  backgroundColor: isPlayed ? 'var(--wa-primary)' : 'var(--text-muted)',
                  opacity: isPlayed ? 1 : 0.45,
                  transition: 'background-color 0.1s, opacity 0.1s'
                }}
              />
            );
          })}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: 'var(--text-secondary)'
        }}>
          <span>{formatTime(currentTime > 0 ? currentTime : duration)}</span>

          <button
            onClick={cyclePlaybackRate}
            style={{
              padding: '2px 6px',
              borderRadius: '10px',
              backgroundColor: 'rgba(0, 168, 132, 0.15)',
              color: 'var(--wa-primary)',
              border: 'none',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
};
