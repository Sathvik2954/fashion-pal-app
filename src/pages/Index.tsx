import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ruler, Palette, Sparkles } from "lucide-react";
import fashionHero from "@/assets/fashion-hero.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden min-h-screen">
        <div className="absolute inset-0 bg-gradient-hero opacity-95" />
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${fashionHero})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center'
          }}
        />

        <div className="relative z-10 container mx-auto px-4 py-16 sm:py-24 lg:py-32">
          <div className="text-center text-primary-foreground">
            <div className="flex justify-center mb-4 sm:mb-6">
              <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-luxury-gold animate-pulse" />
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-8xl font-bold mb-4 sm:mb-6 tracking-tight">
              Fashion
              <span className="bg-gradient-luxury bg-clip-text text-transparent"> Forward</span>
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl font-light opacity-90 max-w-2xl mx-auto px-4">
              Discover your perfect fit and colors with our AI-powered fashion technology
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 lg:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            <Card className="group hover:shadow-luxury transition-all duration-500 transform hover:-translate-y-2 bg-card border-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-fashion opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
              <CardHeader className="relative z-10 text-center pb-6">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                    <Ruler className="w-12 h-12 text-primary group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">
                  Perfect Fit Finder
                </CardTitle>
                <CardDescription className="text-base sm:text-lg text-muted-foreground mt-2">
                  Get your ideal t-shirt size with our advanced AI sizing technology
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 text-center pb-8">
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Say goodbye to ill-fitting clothes. Our smart sizing algorithm analyzes your measurements
                  and preferences to recommend the perfect t-shirt size every time.
                </p>
                <Link to="/size-prediction">
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-semibold"
                  >
                    Find My Size
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-luxury transition-all duration-500 transform hover:-translate-y-2 bg-card border-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-luxury opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
              <CardHeader className="relative z-10 text-center pb-6">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors duration-300">
                    <Palette className="w-12 h-12 text-accent group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">
                  Color Harmony
                </CardTitle>
                <CardDescription className="text-base sm:text-lg text-muted-foreground mt-2">
                  Discover your personal color palette that makes you look stunning
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 text-center pb-8">
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Unlock the colors that complement your skin tone, eye color, and hair. Our personal
                  color analysis reveals your perfect palette.
                </p>
                <Link to="/color-analysis">
                  <Button
                    size="lg"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-3 text-lg font-semibold"
                  >
                    Discover My Colors
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            © 2024 Fashion Forward. Elevating your style with technology.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
