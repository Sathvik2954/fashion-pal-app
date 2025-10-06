import { useRef, useEffect, useState } from 'react';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { estimateSize } from '@/data/sizeChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Camera as CameraIcon, RotateCcw, CheckCircle, Trophy, RotateCcw as TryAgainIcon } from 'lucide-react';

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
  const [stabilityBuffer, setStabilityBuffer] = useState<number[]>([]);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const lastMovementTimeRef = useRef(Date.now());
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const lastTempSizeRef = useRef<string | null>(null);
  const sameTempSizeCountRef = useRef<number>(0);

  const F = 500;
  const REAL_EYE_DIST = 6.3;
  const SCALING_FACTOR = 1.48;
  const STABILITY_TOLERANCE = 3.0;
  const STABILITY_DURATION = 5000;

  const checkStability = (measurements: number[], tolerance = STABILITY_TOLERANCE): boolean => {
    if (measurements.length < 8) return false;

    const recent = measurements.slice(-8);
    const avg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / recent.length;
    const stdDev = Math.sqrt(variance);

    return stdDev < tolerance;
  };

  const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
    return Math.sqrt(Math.pow(point1[0] - point2[0], 2) + Math.pow(point1[1] - point2[1], 2));
  };

  const onResults = (results: any) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    if (results.poseLandmarks && !isStable) {
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

      const leftEyePos: [number, number] = [leftEye.x * width, leftEye.y * height];
      const rightEyePos: [number, number] = [rightEye.x * width, rightEye.y * height];
      const pixelEyeDistance = calculateDistance(leftEyePos, rightEyePos);

      if (pixelEyeDistance === 0) {
        ctx.restore();
        return;
      }

      const distance = (REAL_EYE_DIST * F) / pixelEyeDistance;

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

      const quantizedShoulder = Math.round(shoulderWidth * 2) / 2;
      const newBuffer = [...stabilityBuffer, quantizedShoulder].slice(-10);
      setStabilityBuffer(newBuffer);

      if (checkStability(newBuffer)) {
        const now = Date.now();
        const timeSinceLastMovement = now - lastMovementTimeRef.current;
        const remaining = Math.max(0, STABILITY_DURATION - timeSinceLastMovement);
        setTimeRemaining(remaining);

        if (timeSinceLastMovement > STABILITY_DURATION) {
          const predictedSize = estimateSize(shoulderWidth + 2, torsoHeight);
          const finalData: MeasurementData = {
            distance,
            shoulderWidth,
            torsoHeight,
            predictedSize
          };
          setFinalMeasurements(finalData);
          setIsStable(true);
          setShowResultDialog(true);
        }
      } else {
        lastMovementTimeRef.current = Date.now();
        setTimeRemaining(STABILITY_DURATION);
        sameTempSizeCountRef.current = 0;
        lastTempSizeRef.current = null;
      }

      const currentMeasurements: MeasurementData = {
        distance,
        shoulderWidth,
        torsoHeight,
        predictedSize: estimateSize(shoulderWidth, torsoHeight)
      };
      setMeasurements(currentMeasurements);

      const tempSize = currentMeasurements.predictedSize;
      if (lastTempSizeRef.current === tempSize) {
        sameTempSizeCountRef.current += 1;

        if (sameTempSizeCountRef.current >= 5) {
          const predictedSize = estimateSize(shoulderWidth + 2, torsoHeight);
          const finalData: MeasurementData = {
            distance,
            shoulderWidth,
            torsoHeight,
            predictedSize
          };
          setFinalMeasurements(finalData);
          setIsStable(true);
          setShowResultDialog(true);
        }
      } else {
        lastTempSizeRef.current = tempSize;
        sameTempSizeCountRef.current = 1;
      }

      ctx.fillStyle = 'lime';
      ctx.font = '18px Arial';
      ctx.fillText(`Distance: ${Math.round(distance)} cm`, 20, 30);
      ctx.fillText(`Shoulder: ${shoulderWidth.toFixed(1)} cm`, 20, 60);
      ctx.fillText(`Torso: ${torsoHeight.toFixed(1)} cm`, 20, 90);
      ctx.fillStyle = 'orange';
      ctx.fillText(`Temp Size: ${currentMeasurements.predictedSize}`, 20, 120);

    } else if (isStable && finalMeasurements) {
      ctx.fillStyle = 'lime';
      ctx.font = '18px Arial';
      ctx.fillText(`Distance: ${Math.round(finalMeasurements.distance)} cm`, 20, 30);
      ctx.fillText(`Shoulder: ${finalMeasurements.shoulderWidth.toFixed(1)} cm`, 20, 60);
      ctx.fillText(`Torso: ${finalMeasurements.torsoHeight.toFixed(1)} cm`, 20, 90);
      ctx.fillStyle = 'orange';
      ctx.fillText(`Predicted Size: ${finalMeasurements.predictedSize}`, 20, 120);
      ctx.fillStyle = 'yellow';
      ctx.fillText('✅ Locked after stillness', 20, 150);
    }

    ctx.restore();
  };

  const startCamera = async () => {
    if (!videoRef.current) return;

    try {
      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
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

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) {
            await pose.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });

      await camera.start();
      setIsActive(true);
    } catch (error) {
      console.error('Error starting camera:', error);
    }
  };

  const reset = () => {
    setIsStable(false);
    setFinalMeasurements(null);
    setMeasurements(null);
    setStabilityBuffer([]);
    setShowResultDialog(false);
    lastMovementTimeRef.current = Date.now();
    setTimeRemaining(STABILITY_DURATION);
    lastTempSizeRef.current = null;
    sameTempSizeCountRef.current = 0;
  };

  const handleTryAgain = () => {
    setShowResultDialog(false);
    reset();
  };

  const handleUseSize = () => {
    setShowResultDialog(false);
  };

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
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-w-2xl mx-auto rounded-lg"
              style={{ display: isActive ? 'block' : 'none' }}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{ display: isActive ? 'block' : 'none' }}
            />

            {!isActive && (
              <div className="bg-muted rounded-lg p-12 text-center">
                <CameraIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Click below to start camera-based size detection
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-center">
            {!isActive ? (
              <Button onClick={startCamera} size="lg">
                <CameraIcon className="w-4 h-4 mr-2" />
                Start Camera Detection
              </Button>
            ) : (
              <Button onClick={reset} variant="outline" size="lg">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Stand facing the camera with arms at your sides</li>
              <li>• Make sure your full torso is visible (shoulders to hips)</li>
              <li>• Stay still for 5 seconds to lock in measurements</li>
              <li>• Move back if you see a warning message</li>
              {timeRemaining > 0 && timeRemaining < STABILITY_DURATION && (
                <li className="text-primary font-semibold">
                  • Hold still for {Math.ceil(timeRemaining / 1000)} more seconds...
                </li>
              )}
              {measurements && sameTempSizeCountRef.current > 0 && (
                <li className="text-primary font-semibold">
                  • Size consistency: {sameTempSizeCountRef.current}/5 times
                </li>
              )}
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

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">{finalMeasurements ? Math.round(finalMeasurements.distance) : 0}</div>
                    <div className="text-xs text-muted-foreground">Distance (cm)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">{finalMeasurements?.shoulderWidth.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">Shoulder (cm)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">{finalMeasurements?.torsoHeight.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">Torso (cm)</div>
                  </div>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Measurements locked after detecting stillness for 5 seconds.
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
