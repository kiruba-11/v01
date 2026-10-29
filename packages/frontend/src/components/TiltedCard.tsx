import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './TiltedCard.css';

interface TiltedCardProps {
  imageSrc?: string;
  altText?: string;
  captionText?: string;
  containerHeight?: string | number;
  containerWidth?: string | number;
  imageHeight?: string | number;
  imageWidth?: string | number;
  scaleOnHover?: number;
  rotateAmplitude?: number;
  showTooltip?: boolean;
  overlayContent?: React.ReactNode;
  displayOverlayContent?: boolean;
  glare?: number;
  shadow?: number;
  radius?: number;
  perspective?: number;
  smoothness?: number;
  intro?: boolean;
  gyroscope?: boolean;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function TiltedCard({
  imageSrc,
  altText = 'Tilted card image',
  captionText = '',
  containerHeight = '240px',
  containerWidth = '100%',
  imageHeight = '240px',
  imageWidth = '100%',
  scaleOnHover = 1.02,
  rotateAmplitude = 6,
  showTooltip = true,
  overlayContent,
  displayOverlayContent = false,
  glare = 0.12,
  shadow = 0.25,
  radius = 14,
  perspective = 900,
  smoothness: _smoothness = 0.7,
  intro: _intro = true,
  gyroscope: _gyroscope = false,
  children,
  onClick,
  className = '',
  style = {},
}: TiltedCardProps) {
  const ref = useRef<HTMLElement>(null);

  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [scale, setScale] = useState(1);
  const [opacity, setOpacity] = useState(0);
  const [glareX, setGlareX] = useState(50);
  const [glareY, setGlareY] = useState(50);

  const handleMouse = (e: React.MouseEvent<HTMLElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXPos = e.clientX - rect.left;
    const mouseYPos = e.clientY - rect.top;

    const rX = ((mouseYPos / height) * 2 - 1) * -rotateAmplitude;
    const rY = ((mouseXPos / width) * 2 - 1) * rotateAmplitude;

    setRotateX(rX);
    setRotateY(rY);

    setGlareX((mouseXPos / width) * 100);
    setGlareY((mouseYPos / height) * 100);
  };

  const handleMouseEnter = () => {
    setScale(scaleOnHover);
    setOpacity(glare);
  };

  const handleMouseLeave = () => {
    setScale(1);
    setRotateX(0);
    setRotateY(0);
    setOpacity(0);
  };

  // reference unused variables to satisfy compiler/linter if needed
  void _smoothness;
  void _intro;
  void _gyroscope;

  return (
    <figure
      ref={ref}
      className={`tilted-card-figure ${className}`}
      style={{
        width: containerWidth,
        height: containerHeight,
        borderRadius: `${radius}px`,
        boxShadow: `0 10px 30px rgba(0, 0, 0, ${shadow})`,
        ...style,
      }}
      onClick={onClick}
      onMouseMove={handleMouse}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="tilted-card-inner"
        style={{
          transformStyle: 'preserve-3d',
          transform: `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
          transition: 'transform 0.1s ease-out',
          borderRadius: `${radius}px`,
        }}
      >
        {imageSrc ? (
          <motion.img
            src={imageSrc}
            alt={altText}
            className="tilted-card-img"
            style={{ width: imageWidth, height: imageHeight }}
          />
        ) : (
          <div className="tilted-card-content-box" style={{ width: imageWidth, height: imageHeight }}>
            {children}
          </div>
        )}

        {showTooltip && captionText && (
          <figcaption className="tilted-card-caption">{captionText}</figcaption>
        )}

        <div
          className="tilted-card-glare"
          style={{
            opacity,
            borderRadius: `${radius}px`,
            background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,${glare * 2}) 0%, rgba(255,255,255,0) 80%)`,
          }}
        />

        {displayOverlayContent && overlayContent && (
          <div className="tilted-card-overlay">{overlayContent}</div>
        )}
      </motion.div>
    </figure>
  );
}
