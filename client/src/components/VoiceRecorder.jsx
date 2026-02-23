import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VoiceRecorder({ onRecordingComplete, maxDuration = 120 }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-IN'; // Support Indian English

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript((prev) => prev + finalTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };
    }

    return () => {
      stopRecording();
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      chunksRef.current = [];
      setTranscript('');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current.mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Start speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Ignore if already started
        }
      }
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Unable to access microphone. Please check permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => {
            if (prev >= maxDuration - 1) {
              stopRecording();
              return prev;
            }
            return prev + 1;
          });
        }, 1000);
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }
      } else {
        mediaRecorderRef.current.pause();
        clearInterval(timerRef.current);
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
      setIsPaused(false);
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setAudioURL(null);
    setRecordingTime(0);
    setTranscript('');
    chunksRef.current = [];
  };

  const handleSave = () => {
    if (audioBlob) {
      onRecordingComplete({
        blob: audioBlob,
        url: audioURL,
        duration: recordingTime,
        transcript: transcript.trim(),
        mimeType: audioBlob.type,
      });
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-200">
      <AnimatePresence mode="wait">
        {!audioURL ? (
          <motion.div
            key="recorder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            {!isRecording ? (
              <>
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 hover:bg-red-600 transition-colors shadow-lg"
                >
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                </button>
                <p className="text-gray-600 font-medium">Click to start recording</p>
                <p className="text-gray-400 text-sm mt-1">Max duration: {formatTime(maxDuration)}</p>
              </>
            ) : (
              <div className="space-y-4">
                {/* Recording animation */}
                <div className="relative w-24 h-24 mx-auto">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 bg-red-200 rounded-full"
                  />
                  <motion.div
                    animate={{ scale: isPaused ? 1 : [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="absolute inset-2 bg-red-400 rounded-full"
                  />
                  <div className="absolute inset-4 bg-red-500 rounded-full flex items-center justify-center">
                    {isPaused ? (
                      <span className="text-white text-2xl">⏸</span>
                    ) : (
                      <motion.div
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                        className="w-4 h-4 bg-white rounded-full"
                      />
                    )}
                  </div>
                </div>

                {/* Timer */}
                <div className="text-3xl font-mono font-bold text-gray-900">
                  {formatTime(recordingTime)}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${(recordingTime / maxDuration) * 100}%` }}
                  />
                </div>

                {/* Live transcript */}
                {transcript && (
                  <div className="bg-white rounded-lg p-3 text-left max-h-24 overflow-y-auto">
                    <p className="text-xs text-gray-400 mb-1">Live Transcript:</p>
                    <p className="text-sm text-gray-600">{transcript}</p>
                  </div>
                )}

                {/* Controls */}
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={pauseRecording}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Stop
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-500 text-sm mt-4">{error}</p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-center gap-2 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Recording Complete</span>
            </div>

            {/* Audio player */}
            <div className="bg-white rounded-lg p-4">
              <audio src={audioURL} controls className="w-full" />
              <p className="text-sm text-gray-500 mt-2">Duration: {formatTime(recordingTime)}</p>
            </div>

            {/* Transcript */}
            {transcript && (
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Transcript:</p>
                <p className="text-gray-600 text-sm">{transcript}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={cancelRecording}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Re-record
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Use Recording
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
