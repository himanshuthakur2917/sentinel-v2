"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reminderApi } from "@/lib/api/reminders.api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VoiceInputFormProps {
  onBack: () => void;
  onProceed: (data: any) => void;
}

export function VoiceInputForm({ onBack, onProceed }: VoiceInputFormProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(12).fill(10));
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const stopMediaStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMediaStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stopMediaStream]);

  const updateVisualizer = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Sample just a few points for our bars
    const samples: number[] = [];
    const step = Math.floor(dataArray.length / 12);
    for (let i = 0; i < 12; i++) {
        const value = dataArray[i * step];
        // Scale to height percentage (min 10%, max 100%)
        samples.push(Math.max(15, (value / 255) * 100));
    }
    setAudioLevel(samples);
    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
  };

  const startRecording = async () => {
    console.log("Start recording clicked");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          toast.error("Audio recording is not supported in this browser or context (requires HTTPS).");
          return;
      }
      
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = audioStream;

      // Setup Audio Context for Visualizer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioStream);
      source.connect(analyser);
      analyser.fftSize = 64;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      updateVisualizer();

      const mediaRecorder = new MediaRecorder(audioStream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = handleRecordingStop;

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error(
        "Could not access microphone. Please check permissions and try again.",
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      stopMediaStream();
    }
  };

  const handleRecordingStop = async () => {
    const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
    setIsProcessing(true);

    try {
      // Language parameter: undefined = auto-detect (default), 'en' = English, 'hi' = Hindi
      const result = await reminderApi.processVoiceCommand(audioBlob, undefined);
      // toast.success("Voice command processed successfully!"); // Optional: Let UI speak for itself
      onProceed(result); 
    } catch (error: any) {
      console.error("Voice processing error:", error);
      let message = "Failed to process voice command.";
      if (error?.response?.status === 429) {
        message = "You have reached the voice command limit. Please try again later.";
      }
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center justify-between py-10 px-6 h-[500px] relative overflow-hidden bg-gradient-to-b from-transparent to-muted/10 w-full">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
        <Sparkles className="w-24 h-24 text-primary blur-sm" />
      </div>
      <div className="absolute bottom-0 left-0 p-8 opacity-20 pointer-events-none">
        <div className="w-32 h-32 rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* Header / Status */}
      <div className="space-y-4 text-center z-10 max-w-md animate-in fade-in slide-in-from-top-4 duration-500">
        <div className={cn(
            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border shadow-sm transition-colors duration-300",
            isRecording ? "bg-red-500/10 text-red-500 border-red-200" : 
            isProcessing ? "bg-blue-500/10 text-blue-500 border-blue-200" :
            "bg-muted text-muted-foreground border-border"
        )}>
            {isRecording ? <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> : null}
            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin"/> : null}
            <span>
                {isProcessing ? "Processing audio..." : 
                 isRecording ? "Recording in progress" : "Ready to listen"}
            </span>
        </div>

        <h3 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
          {isProcessing ? "Analyzing Context" : isRecording ? "Listening..." : "What's on your mind?"}
        </h3>
        
        <p className="text-muted-foreground text-sm min-h-[20px]">
             {isProcessing ? "Extracting details like time, priority, and category." : 
              isRecording ? formatTime(recordingTime) : 
              "Tap the microphone and speak naturally."}
        </p>
      </div>

      {/* Visualizer / Interaction Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full my-8 relative z-10">
        {isRecording ? (
            <div className="flex items-end justify-center gap-1.5 h-32 w-full px-12">
                {audioLevel.map((height, i) => (
                    <div 
                        key={i} 
                        className="w-3 rounded-full bg-primary/80 transition-all duration-75"
                        style={{ height: `${height}%`, opacity: 0.6 + (height/200) }}
                    />
                ))}
            </div>
        ) : (
             <div className="relative group flex flex-col items-center gap-4">
                 {/* Ripple Effect hint */}
                 {!isProcessing && (
                     <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-0 group-hover:opacity-50 duration-1000 pointer-events-none" style={{ width: '6rem', height: '6rem', top: 0 }} />
                 )}
                 
                 <Button
                    size="icon"
                    className={cn(
                        "h-24 w-24 rounded-full shadow-2xl transition-all duration-300 transform relative z-10",
                        isProcessing ? "opacity-100 scale-90 bg-muted text-muted-foreground" : "hover:scale-105 bg-gradient-to-tr from-primary to-primary/80 hover:shadow-primary/25"
                    )}
                    onClick={startRecording}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    ) : (
                        <Mic className="h-10 w-10 text-primary-foreground" />
                    )}
                </Button>

                {/* DEBUG PLAYBACK */}
                {chunksRef.current.length > 0 && !isProcessing && (
                    <button 
                        type="button"
                        onClick={() => {
                            const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                            const url = URL.createObjectURL(blob);
                            const audio = new Audio(url);
                            audio.play();
                        }}
                        className="text-xs text-muted-foreground hover:text-primary underline"
                    >
                        Play Last Recording (Debug)
                    </button>
                )}
            </div>
        )}

        {/* Stop Button (conditionally shown near bottom of visualizer when recording) */}
        {isRecording && (
             <Button 
                variant="destructive" 
                size="icon" 
                className="absolute -bottom-8 h-12 w-12 rounded-full shadow-lg animate-in zoom-in duration-300"
                onClick={stopRecording}
             >
                <Square className="h-5 w-5 fill-current" />
             </Button>
        )}
      </div>

      {/* Footer Hints */}
      {!isRecording && !isProcessing && (
         <div className="w-full max-w-sm grid gap-3 z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
             <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border shadow-sm backdrop-blur-sm">
                <div className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-xs">
                    <p className="font-medium text-foreground">Try saying:</p>
                    <p className="text-muted-foreground">"Remind me to email Sarah tomorrow at 10am"</p>
                </div>
             </div>
         </div>
      )}

      {/* Back Action */}
      <Button variant="ghost" size="sm" onClick={onBack} disabled={isRecording || isProcessing} className="mt-2 text-muted-foreground hover:text-foreground z-10">
        Switch Input Method
      </Button>
    </div>
  );
}
