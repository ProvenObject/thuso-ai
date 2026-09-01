/**
 * RoundedInput
 * Rounded, bordered text field with a subtle leading icon and a real
 * <label> (never placeholder-only) so it stays accessible. `error` renders
 * as an icon + text pairing, never color alone.
 */
export default function RoundedInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon = null,
  trailing = null,
  error = '',
  autoComplete,
  inputMode,
  required = false,
}) {
  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-[13px] font-semibold text-ink-soft mb-1.5 ml-1">
        {label}
      </label>
      <div
        className={`flex items-center gap-2.5 min-h-[52px] px-4 rounded-2xl bg-white border ${
          error ? 'border-warning' : 'border-ink-faint/25'
        } focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-colors`}
      >
        {icon && <span className="text-ink-faint shrink-0" aria-hidden="true">{icon}</span>}
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-ink placeholder:text-ink-faint py-3"
        />
        {trailing && <span className="shrink-0">{trailing}</span>}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 ml-1 flex items-center gap-1.5 text-[13px] font-medium text-warning">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16.5" r="1.1" fill="currentColor" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
