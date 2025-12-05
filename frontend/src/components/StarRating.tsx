import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import "../styles/StarRating.css";

type StarRatingProps = {
  value?: number | null;
  max?: number;
  disabled?: boolean;
  label?: string;
  hint?: string;
  onChange?: (value: number) => void;
};

const clampRating = (value: number, max: number) =>
  Math.min(Math.max(Math.round(value), 0), max);

export default function StarRating({
  value = 0,
  max = 5,
  disabled = false,
  label,
  hint,
  onChange,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const safeValue = useMemo(() => clampRating(value ?? 0, max), [value, max]);
  const displayValue = hovered ?? safeValue;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, newValue: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect(newValue);
    }
  };

  const handleSelect = (newValue: number) => {
    if (disabled) return;
    onChange?.(newValue);
  };

  return (
    <div
      className={`star-rating ${disabled ? "is-disabled" : ""}`}
      onMouseLeave={() => setHovered(null)}
    >
      {label ? <p className="star-rating__label">{label}</p> : null}
      <div
        className="star-rating__stars"
        role="radiogroup"
        aria-label={label || "Valoración"}
      >
        {Array.from({ length: max }).map((_, idx) => {
          const starValue = idx + 1;
          const active = displayValue >= starValue;

          return (
            <button
              key={starValue}
              type="button"
              className={`star-rating__star ${active ? "is-active" : ""}`}
              role="radio"
              aria-checked={safeValue === starValue}
              aria-label={`${starValue} estrella${starValue !== 1 ? "s" : ""}`}
              tabIndex={0}
              disabled={disabled}
              onMouseEnter={() => setHovered(starValue)}
              onFocus={() => setHovered(starValue)}
              onBlur={() => setHovered(null)}
              onClick={() => handleSelect(starValue)}
              onKeyDown={(event) => handleKeyDown(event, starValue)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.785 1.402 8.174L12 18.896l-7.336 3.874 1.402-8.174L.132 9.211l8.2-1.193z" />
              </svg>
            </button>
          );
        })}
      </div>
      {hint ? <p className="star-rating__hint">{hint}</p> : null}
    </div>
  );
}
