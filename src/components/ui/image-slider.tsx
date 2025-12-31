import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ImageSliderProps extends React.HTMLAttributes<HTMLDivElement> {
  images: string[];
  interval?: number;
}

const ImageSlider = React.forwardRef<HTMLDivElement, ImageSliderProps>(
  ({ images, interval = 5000, className, ...props }, ref) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);

    React.useEffect(() => {
      if (images.length <= 1) return;
      
      const timer = setInterval(() => {
        setCurrentIndex((prevIndex) =>
          prevIndex === images.length - 1 ? 0 : prevIndex + 1
        );
      }, interval);

      return () => clearInterval(timer);
    }, [images, interval]);

    if (!images || images.length === 0) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn("relative h-full w-full overflow-hidden", className)}
        {...props}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`Slide ${currentIndex + 1}`}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>

        {images.length > 1 && (
          <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "h-2 w-2 rounded-full transition-all duration-300",
                  currentIndex === index
                    ? "w-6 bg-white"
                    : "bg-white/50 hover:bg-white/80"
                )}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

ImageSlider.displayName = "ImageSlider";

export { ImageSlider };
