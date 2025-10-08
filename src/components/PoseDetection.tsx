import { useRef, useEffect, useState } from 'react';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { estimateSize } from '@/data/sizeChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Camera as CameraIcon, RotateCcw, CheckCircle, Trophy, RotateCcw as TryAgainIcon, AlertCircle } from 'lucide-react';

interface MeasurementData {
  distance: number;
  shoulderWidth: number;
  torsoHeight: number;
  predictedSize: string;
}

const PoseDetection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [measurements, setMeasurements] = useState<MeasurementData | null>(null);
  const [isStable, setIsStable] = useState(false);
  const [finalMeasurements, setFinalMeasurements] = useState<MeasurementData | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const cameraRef = useRef<any>(null);
  const poseRef = useRef<any>(null);
  const isLockedRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const lockTimerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);

  const F = 500;
  const REAL_EYE_DIST = 6.3;
  const SCALING_FACTOR = 1.48;
  const LOCK_DURATION = 5000;

  const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
    return Math.sqrt(Math.pow(point1[0] - point2[0], 2) + Math.pow(point1[1] - point2[1], 2));
  };

  const stopCameraProcessing = () => {
    console.log('Stopping camera processing...');
    
    // Clear all timers and intervals
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    
    // Stop pose detection
    if (poseRef.current) {
      try {
        poseRef.current.close();
      } catch (error) {
        console.error('Error closing pose:', error);
      }
      poseRef.current = null;
    }
    
    // Stop camera
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
      } catch (error) {
        console.error('Error stopping camera:', error);
      }
      cameraRef.current = null;
    }
    
    // Stop media stream
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
      });
      videoRef.current.srcObject = null;
    }
  };

  const onResults = (results: any) => {
    if (!canvasRef.current || !videoRef.current || isLockedRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Only draw the video if we have valid dimensions
    if (canvas.width > 0 && canvas.height > 0) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    }

    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks;
      const { width, height } = canvas;

      drawConnectors(ctx, landmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
      drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 1 });

      const leftEye = landmarks[2];
      const rightEye = landmarks[5];
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];

      // Check visibility of key points
      if (leftEye && rightEye && leftShoulder && rightShoulder && leftHip && rightHip) {
        const leftEyePos: [number, number] = [leftEye.x * width, leftEye.y * height];
        const rightEyePos: [number, number] = [rightEye.x * width, rightEye.y * height];
        const pixelEyeDistance = calculateDistance(leftEyePos, rightEyePos);

        if (pixelEyeDistance === 0) {
          ctx.restore();
          return;
        }

        const distance = (REAL_EYE_DIST * F) / pixelEyeDistance;

        // Check if shoulders and hips are visible
        if (leftShoulder.visibility < 0.5 || rightShoulder.visibility < 0.5 ||
            leftHip.visibility < 0.5 || rightHip.visibility < 0.5) {
          ctx.fillStyle = 'red';
          ctx.font = '20px Arial';
          ctx.fillText('⚠️ Move back a little', 20, 50);
          ctx.restore();
          return;
        }

        const leftShoulderPos: [number, number] = [leftShoulder.x * width, leftShoulder.y * height];
        const rightShoulderPos: [number, number] = [rightShoulder.x * width, rightShoulder.y * height];
        const pixelShoulderDistance = calculateDistance(leftShoulderPos, rightShoulderPos) * SCALING_FACTOR;
        const shoulderWidth = (pixelShoulderDistance * distance) / F;

        const shoulderMid: [number, number] = [
          (leftShoulder.x + rightShoulder.x) / 2 * width,
          (leftShoulder.y + rightShoulder.y) / 2 * height
        ];
        const hipMid: [number, number] = [
          (leftHip.x + rightHip.x) / 2 * width,
          (leftHip.y + rightHip.y) / 2 * height
        ];
        const pixelTorsoHeight = calculateDistance(shoulderMid, hipMid);
        const torsoHeight = (pixelTorsoHeight * distance) / F;

        const currentMeasurements: MeasurementData = {
          distance,
          shoulderWidth,
          torsoHeight,
          predictedSize: estimateSize(shoulderWidth + 2, torsoHeight)
        };
        setMeasurements(currentMeasurements);

        // Display measurements on canvas
        ctx.fillStyle = 'lime';
        ctx.font = '18px Arial';
        ctx.fillText(`Distance: ${Math.round(distance)} cm`, 20, 30);
        ctx.fillText(`Shoulder: ${shoulderWidth.toFixed(1)} cm`, 20, 60);
        ctx.fillText(`Torso: ${torsoHeight.toFixed(1)} cm`, 20, 90);
        ctx.fillStyle = 'orange';
        ctx.fillText(`Temp Size: ${currentMeasurements.predictedSize}`, 20, 120);

        // Show countdown
        if (countdown > 0) {
          ctx.fillStyle = 'yellow';
          ctx.font = 'bold 24px Arial';
          ctx.fillText(`⏱️ Locking in: ${countdown}s`, 20, 150);
        }
      }
    }

    ctx.restore();
  };

  const startCamera = async () => {
    if (!videoRef.current) {
      setError('Video element not found');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      // Reset all states
      isLockedRef.current = false;
      setIsStable(false);
      setFinalMeasurements(null);
      setMeasurements(null);
      setShowResultDialog(false);
      setCountdown(Math.ceil(LOCK_DURATION / 1000));

      console.log('Initializing MediaPipe Pose...');

      // Initialize Pose
      const pose = new Pose({
        locateFile: (file) => {
          console.log('Loading file:', file);
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      pose.onResults(onResults);
      poseRef.current = pose;

      console.log('Starting camera...');

      // Initialize Camera
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && poseRef.current && !isLockedRef.current) {
            try {
              await poseRef.current.send({ image: videoRef.current });
            } catch (error) {
              console.error('Error processing frame:', error);
            }
          }
        },
        width: 640,
        height: 480
      });

      await camera.start();
      cameraRef.current = camera;
      setIsActive(true);
      setIsLoading(false);

      console.log('Camera started successfully');

      // Start countdown timer
      startTimeRef.current = Date.now();
      
      // Update countdown every second
      countdownIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, LOCK_DURATION - elapsed);
        const secondsLeft = Math.ceil(remaining / 1000);
        setCountdown(secondsLeft);
      }, 100);

      // Set the main lock timer
      lockTimerRef.current = setTimeout(() => {
        console.log('5-second lock triggered - locking measurements');
        
        // Set locked state
        isLockedRef.current = true;
        
        // Use current measurements
        if (measurements) {
          setFinalMeasurements(measurements);
        } else {
          // Fallback if no measurements available
          const fallbackData: MeasurementData = {
            distance: 0,
            shoulderWidth: 0,
            torsoHeight: 0,
            predictedSize: 'M'
          };
          setFinalMeasurements(fallbackData);
        }
        
        setIsStable(true);
        setShowResultDialog(true);
        
        // Stop camera processing
        stopCameraProcessing();
        
      }, LOCK_DURATION);

    } catch (error) {
      console.error('Error starting camera:', error);
      setError(`Failed to start camera: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
      setIsActive(false);
    }
  };

  const reset = () => {
    console.log('Resetting pose detection...');
    stopCameraProcessing();
    
    // Reset all states
    isLockedRef.current = false;
    setIsActive(false);
    setIsStable(false);
    setFinalMeasurements(null);
    setMeasurements(null);
    setShowResultDialog(false);
    setCountdown(0);
    setError('');
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const handleTryAgain = () => {
    setShowResultDialog(false);
    setTimeout(() => {
      reset();
    }, 300);
  };

  const handleUseSize = () => {
    setShowResultDialog(false);
    console.log('Using size:', finalMeasurements?.predictedSize);
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopCameraProcessing();
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CameraIcon className="w-5 h-5" />
            Camera-Based Size Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">Error: {error}</span>
              </div>
            </div>
          )}

          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-w-2xl mx-auto"
              style={{ display: isActive ? 'block' : 'none' }}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{ display: isActive ? 'block' : 'none' }}
            />

            {!isActive && (
              <div className="bg-muted rounded-lg p-12 text-center min-h-[300px] flex items-center justify-center">
                <div>
                  <CameraIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    {isLoading ? 'Starting camera...' : 'Click below to start camera-based size detection'}
                  </p>
                  {isLoading && (
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-center">
            {!isActive ? (
              <Button 
                onClick={startCamera} 
                size="lg" 
                disabled={isLoading}
              >
                <CameraIcon className="w-4 h-4 mr-2" />
                {isLoading ? 'Starting...' : 'Start Camera Detection'}
              </Button>
            ) : (
              <Button onClick={reset} variant="outline" size="lg">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
          </div>

          {isActive && countdown > 0 && (
            <div className="text-center">
              <Badge variant="secondary" className="text-lg py-2 px-4 animate-pulse">
                ⏱️ Locking in: {countdown}s
              </Badge>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Stand facing the camera with arms at your sides</li>
              <li>• Make sure your full torso is visible (shoulders to hips)</li>
              <li>• Measurements will automatically lock after 5 seconds</li>
              <li>• Move back if you see a warning message</li>
              <li>• Ensure good lighting for better detection</li>
            </ul>
          </div>

          {measurements && !isStable && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{Math.round(measurements.distance)}</div>
                <div className="text-sm text-muted-foreground">Distance (cm)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{measurements.shoulderWidth.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Shoulder (cm)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{measurements.torsoHeight.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Torso (cm)</div>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className="text-lg py-1 px-3">
                  {measurements.predictedSize}
                </Badge>
                <div className="text-sm text-muted-foreground">Temp Size</div>
              </div>
            </div>
          )}

          <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-primary text-xl">
                  <Trophy className="w-6 h-6" />
                  Perfect! Your Size is Ready
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="text-center py-6 bg-primary/5 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">Your Recommended Size</div>
                  <Badge className="text-3xl py-3 px-6 bg-primary text-primary-foreground">
                    {finalMeasurements?.predictedSize}
                  </Badge>
                </div>

                {finalMeasurements && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{Math.round(finalMeasurements.distance)}</div>
                      <div className="text-xs text-muted-foreground">Distance (cm)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{finalMeasurements.shoulderWidth.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">Shoulder (cm)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{finalMeasurements.torsoHeight.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">Torso (cm)</div>
                    </div>
                  </div>
                )}

                <p className="text-center text-sm text-muted-foreground">
                  Measurements locked after 5 seconds of detection.
                </p>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={handleTryAgain} className="flex-1">
                  <TryAgainIcon className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={handleUseSize} className="flex-1">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Use This Size
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default PoseDetection;
