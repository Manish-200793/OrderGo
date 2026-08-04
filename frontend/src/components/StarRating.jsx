import { Star } from 'lucide-react';
import { useState } from 'react';

export default function StarRating({ rating = 0, onRate, size = 20, readonly = false }) {
  const [hover, setHover] = useState(0);

  return (
    <div style={{ display: 'flex', gap: '4px', cursor: readonly ? 'default' : 'pointer' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || rating);
        return (
          <Star
            key={star}
            size={size}
            fill={filled ? '#f59e0b' : 'transparent'}
            stroke={filled ? '#f59e0b' : '#6b6b8a'}
            style={{ transition: 'all 150ms ease', transform: filled && !readonly ? 'scale(1.1)' : 'scale(1)' }}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
            onClick={() => !readonly && onRate?.(star)}
          />
        );
      })}
    </div>
  );
}
