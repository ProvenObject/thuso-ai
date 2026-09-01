/**
 * PaginationDots
 * Small dot indicators for onboarding carousels.
 */
export default function PaginationDots({ count, active }) {
  return (
    <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Onboarding progress">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          role="tab"
          aria-selected={i === active}
          aria-label={`Step ${i + 1} of ${count}`}
          className={`h-2 rounded-pill transition-all duration-200 ${
            i === active ? 'w-6 bg-primary' : 'w-2 bg-primary/20'
          }`}
        />
      ))}
    </div>
  )
}
