/**
 * PrimaryButton
 * Full-width solid-blue pill button. Always carries a visible text label
 * (never icon-only) and meets the 44px min tap-target requirement.
 */
export default function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  icon = null,
  className = '',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full min-h-[52px] flex items-center justify-center gap-2 rounded-pill bg-primary text-white text-[16px] font-semibold shadow-card transition-all duration-150 active:scale-[0.98] hover:bg-primary-dark disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 ${className}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}
