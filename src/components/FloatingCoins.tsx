import { useEffect, useState } from 'react';

interface Coin {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export default function FloatingCoins({ count = 12 }: { count?: number }) {
  const [coins, setCoins] = useState<Coin[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: count }, (_entry, index) => ({
      id: index,
      left: Math.random() * 100,
      size: 20 + Math.random() * 24,
      duration: 4 + Math.random() * 6,
      delay: Math.random() * 5,
      opacity: 0.3 + Math.random() * 0.5,
    }));
    setCoins(generated);
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {coins.map((coin) => (
        <div
          key={coin.id}
          className="floating-coin"
          style={{
            left: `${coin.left}%`,
            bottom: '-60px',
            width: `${coin.size}px`,
            height: `${coin.size}px`,
            fontSize: `${coin.size * 0.45}px`,
            animationDuration: `${coin.duration}s`,
            animationDelay: `${coin.delay}s`,
            opacity: coin.opacity,
          }}
        >
          ₹
        </div>
      ))}
    </div>
  );
}
