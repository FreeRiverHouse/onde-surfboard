'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTTSOptions {
  rate?: number; // 0.1 to 10, default 1
  pitch?: number; // 0 to 2, default 1
  volume?: number; // 0 to 1, default 1
  lang?: string; // e.g., 'it-IT', 'en-US'
  voiceName?: string; // preferred voice name
}

interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  currentVoice: SpeechSynthesisVoice | null;
}

export function useTTS(options: UseTTSOptions = {}) {
  const { rate = 1, pitch = 1, volume = 1, lang = 'it-IT', voiceName } = options;
  
  const [state, setState] = useState<TTSState>({
    isSpeaking: false,
    isPaused: false,
    isSupported: false,
    voices: [],
    currentVoice: null,
  });
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check support and load voices
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isSupported = 'speechSynthesis' in window;
    setState(prev => ({ ...prev, isSupported }));
    
    if (!isSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      
      // Find best voice for the language
      let voice = voices.find(v => voiceName && v.name.includes(voiceName));
      if (!voice) {
        voice = voices.find(v => v.lang.startsWith(lang.split('-')[0])) || voices[0];
      }
      
      setState(prev => ({
        ...prev,
        voices,
        currentVoice: voice || null,
      }));
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [lang, voiceName]);

  // Speak text
  const speak = useCallback((text: string) => {
    if (!state.isSupported || !text.trim()) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    
    if (state.currentVoice) {
      utterance.voice = state.currentVoice;
    }
    
    utterance.onstart = () => {
      setState(prev => ({ ...prev, isSpeaking: true, isPaused: false }));
    };
    
    utterance.onend = () => {
      setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
    };
    
    utterance.onerror = () => {
      setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
    };
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [state.isSupported, state.currentVoice, rate, pitch, volume]);

  // Stop speaking
  const stop = useCallback(() => {
    if (!state.isSupported) return;
    window.speechSynthesis.cancel();
    setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
  }, [state.isSupported]);

  // Pause speaking
  const pause = useCallback(() => {
    if (!state.isSupported || !state.isSpeaking) return;
    window.speechSynthesis.pause();
    setState(prev => ({ ...prev, isPaused: true }));
  }, [state.isSupported, state.isSpeaking]);

  // Resume speaking
  const resume = useCallback(() => {
    if (!state.isSupported || !state.isPaused) return;
    window.speechSynthesis.resume();
    setState(prev => ({ ...prev, isPaused: false }));
  }, [state.isSupported, state.isPaused]);

  // Toggle speaking a specific text
  const toggle = useCallback((text: string) => {
    if (state.isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  }, [state.isSpeaking, speak, stop]);

  return {
    ...state,
    speak,
    stop,
    pause,
    resume,
    toggle,
  };
}

// Utility: Extract clean text from potentially formatted content
export function cleanTextForTTS(text: string): string {
  return text
    // Remove markdown code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove markdown links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown formatting
    .replace(/[*_~]+/g, '')
    // Remove URLs
    .replace(/https?:\/\/[^\s]+/g, '')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
