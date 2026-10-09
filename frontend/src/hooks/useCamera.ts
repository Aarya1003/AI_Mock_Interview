import { useRef, useState, useCallback } from 'react';

interface CameraMetrics {
  faceDetected: boolean;
  lookingAway: boolean;
  facePosition: { x: number; y: number; width: number; height: number } | null;
  timestamp: number;
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState('');

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false
      });
      setStream(mediaStream);
      setIsActive(true);
      setError('');
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Camera access denied');
      setIsActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsActive(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  const getCameraMetrics = useCallback(() => {
    return {
      isActive,
      totalFrames: 0,
      faceDetectedFrames: 0,
      lookingAwayFrames: 0
    };
  }, [isActive]);

  return { videoRef, stream, isActive, error, startCamera, stopCamera, getCameraMetrics };
}