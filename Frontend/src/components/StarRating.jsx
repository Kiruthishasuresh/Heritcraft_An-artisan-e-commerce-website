import { FiStar } from 'react-icons/fi';

const StarRating = ({ rating = 5, onRate, size = 20, readonly = false }) => {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRate && onRate(star)}
          className={`star ${star <= rating ? 'filled' : 'empty'}`}
        >
          <FiStar size={size} className={star <= rating ? 'fill-[var(--gold)] text-[var(--gold)]' : ''} />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
