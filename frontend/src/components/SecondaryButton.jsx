/**
 * SecondaryButton
 * Full-width light blue-gray outline/pill button for secondary actions.
 */
export default function SecondaryButton({
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
      className={`w-full min-h-[52px] flex items-center justify-center gap-2 rounded-pill bg-secondary text-secondary-text text-[16px] font-semibold border border-primary/15 transition-all duration-150 active:scale-[0.98] hover:bg-secondary/80 disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 ${className}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}
