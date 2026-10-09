import { useState, useRef, useCallback } from 'react';

interface VoiceMetrics {
  volume: number[];
  pitch: number[];
  pauseCount: number;
  totalPauseDuration: number;
  wpm: number;
  fillerWords: string[];
}

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceMetrics, setVoiceMetrics] = useState<VoiceMetrics>({
    volume: [], pitch: [], pauseCount: 0, totalPauseDuration: 0,
    wpm: 0, fillerWords: []
  });
  const [error, setError] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const SpeechRecognition = (window as any).SpeechRecognition 
        || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setError('Speech recognition not supported in this browser. Please use Chrome.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      recognition.maxAlternatives = 1;

      finalTranscriptRef.current = '';

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += text + ' ';
          } else {
            interim += text;
          }
        }
        
        if (final) finalTranscriptRef.current += final;
        setTranscript(finalTranscriptRef.current + interim);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          setError(`Mic error: ${event.error}. Try typing your answer.`);
        }
      };

      recognition.onend = () => {
        // Auto-restart if still meant to be recording
        if (recognitionRef.current === recognition && isRecording) {
          try { recognition.start(); } catch(e) {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      setError('');
    } catch (err: any) {
      setError('Microphone access denied. Please allow mic permissions and retry.');
    }
  }, [isRecording]);

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // prevent auto-restart
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    
    const wordCount = transcript.trim().split(/\s+/).filter(w => w).length;
    return { 
      transcript: finalTranscriptRef.current || transcript,
      metrics: voiceMetrics 
    };
  }, [transcript, voiceMetrics]);

  const reset = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setTranscript('');
    finalTranscriptRef.current = '';
    setVoiceMetrics({ volume: [], pitch: [], pauseCount: 0, 
                      totalPauseDuration: 0, wpm: 0, fillerWords: [] });
  }, []);

  return {
    isRecording, transcript, setTranscript, voiceMetrics,
    error, startRecording, stopRecording, reset
  };
}