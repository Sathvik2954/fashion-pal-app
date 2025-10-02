import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Ruler, CheckCircle, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PoseDetection from "@/components/PoseDetection";

const SizePrediction = () => {
  const [measurements, setMeasurements] = useState({
    height: "",
    weight: "",
    chest: "",
    bodyType: ""
  });
  const [predictedSize, setPredictedSize] = useState("");
  const [showResult, setShowResult] = useState(false);
  const { toast } = useToast();

  const handlePredict = () => {
    if (!measurements.height || !measurements.weight || !measurements.bodyType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields to get your size prediction.",
        variant: "destructive",
      });
      return;
    }

    const height = parseInt(measurements.height);
    const weight = parseInt(measurements.weight);
    const chest = parseInt(measurements.chest) || 0;

    let size = "M";
    if (measurements.bodyType === "slim") {
      if (height < 170 && weight < 65) size = "S";
      else if (height >= 170 && weight < 70) size = "M";
      else size = "L";
    } else if (measurements.bodyType === "athletic") {
      if (chest < 95) size = "M";
      else if (chest < 105) size = "L";
      else size = "XL";
    } else if (measurements.bodyType === "regular") {
      if (weight < 70) size = "M";
      else if (weight < 85) size = "L";
      else size = "XL";
    }

    setPredictedSize(size);
    setShowResult(true);

    toast({
      title: "Size Predicted!",
      description: `Based on your measurements, we recommend size ${size}.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Ruler className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">T-Shirt Size Prediction</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-12">
        <div className="max-w-4xl mx-auto">

          <Tabs defaultValue="camera" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="camera" className="gap-2">
                <Camera className="w-4 h-4" />
                Camera Detection
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Ruler className="w-4 h-4" />
                Manual Entry
              </TabsTrigger>
            </TabsList>

            <TabsContent value="camera" className="mt-6">
              <PoseDetection />
            </TabsContent>

            <TabsContent value="manual" className="mt-6">
              {!showResult ? (
                <Card className="shadow-card">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl sm:text-3xl font-bold">Find Your Perfect Fit</CardTitle>
                    <CardDescription className="text-base sm:text-lg">
                      Enter your measurements below and we'll predict your ideal t-shirt size
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="height" className="text-sm font-medium">Height (cm) *</Label>
                        <Input
                          id="height"
                          type="number"
                          placeholder="e.g., 175"
                          value={measurements.height}
                          onChange={(e) => setMeasurements({...measurements, height: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="weight" className="text-sm font-medium">Weight (kg) *</Label>
                        <Input
                          id="weight"
                          type="number"
                          placeholder="e.g., 70"
                          value={measurements.weight}
                          onChange={(e) => setMeasurements({...measurements, weight: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="chest" className="text-sm font-medium">Chest Circumference (cm)</Label>
                      <Input
                        id="chest"
                        type="number"
                        placeholder="e.g., 95 (optional but recommended)"
                        value={measurements.chest}
                        onChange={(e) => setMeasurements({...measurements, chest: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Body Type *</Label>
                      <Select value={measurements.bodyType} onValueChange={(value) => setMeasurements({...measurements, bodyType: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your body type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="slim">Slim/Lean</SelectItem>
                          <SelectItem value="regular">Regular/Average</SelectItem>
                          <SelectItem value="athletic">Athletic/Muscular</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handlePredict}
                      size="lg"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Predict My Size
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-luxury border-primary/20">
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                      <CheckCircle className="w-16 h-16 text-primary" />
                    </div>
                    <CardTitle className="text-3xl sm:text-4xl font-bold text-primary">Your Perfect Size</CardTitle>
                    <CardDescription className="text-base sm:text-lg">
                      Based on your measurements and body type
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="text-center space-y-6">
                    <div className="bg-primary/10 rounded-lg p-6 sm:p-8">
                      <div className="text-4xl sm:text-6xl font-bold text-primary mb-2">{predictedSize}</div>
                      <p className="text-base sm:text-lg text-muted-foreground">Recommended Size</p>
                    </div>

                    <div className="space-y-3 text-left bg-muted/50 rounded-lg p-6">
                      <h3 className="font-semibold text-foreground">Size Recommendation Details:</h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• This size should provide a comfortable, flattering fit</li>
                        <li>• Consider sizing up if you prefer a looser fit</li>
                        <li>• Different brands may vary slightly in sizing</li>
                        <li>• For the most accurate fit, try before purchasing when possible</li>
                      </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        onClick={() => setShowResult(false)}
                        variant="outline"
                        size="lg"
                        className="flex-1"
                      >
                        Try Different Measurements
                      </Button>
                      <Link to="/" className="flex-1">
                        <Button size="lg" className="w-full bg-primary hover:bg-primary/90">
                          Back to Home
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

        </div>
      </div>
    </div>
  );
};

export default SizePrediction;
