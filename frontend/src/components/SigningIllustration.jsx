/**
 * SigningIllustration
 * Flat illustration of two people signing to each other, with hand-sign
 * "translated" bubbles above their hands (icon + printed word) standing in
 * for spoken-word speech bubbles.
 */
export default function SigningIllustration() {
  return (
    <svg
      viewBox="0 0 340 260"
      className="w-full h-auto"
      role="img"
      aria-label="Illustration of two people signing to each other, with translated hand-sign bubbles reading HELLO and THANK YOU above their hands"
    >
      {/* Backdrop blob */}
      <ellipse cx="170" cy="150" rx="150" ry="95" fill="#E4E9FA" />
      <circle cx="60" cy="55" r="16" fill="#D7E0FB" />
      <circle cx="292" cy="70" r="10" fill="#C7D3FA" />

      {/* Ground shadow */}
      <ellipse cx="105" cy="232" rx="46" ry="8" fill="#C9D2F2" opacity="0.7" />
      <ellipse cx="240" cy="232" rx="46" ry="8" fill="#C9D2F2" opacity="0.7" />

      {/* --- Left figure --- */}
      <g>
        <ellipse cx="103" cy="150" rx="40" ry="52" fill="#1E3FCC" />
        <path d="M75 175 Q103 200 133 175 L133 225 Q103 236 75 225 Z" fill="#152C99" />
        <circle cx="103" cy="96" r="26" fill="#F6C9A0" />
        <path d="M79 92a24 24 0 0148-2c-8 4-32 4-48 2z" fill="#2B2320" />
        {/* raised signing arm */}
        <path
          d="M126 132c14-6 24-20 26-34"
          stroke="#F6C9A0"
          strokeWidth="13"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="154" cy="96" r="10" fill="#F6C9A0" />
      </g>

      {/* --- Right figure --- */}
      <g>
        <ellipse cx="237" cy="150" rx="40" ry="52" fill="#4B65E0" />
        <path d="M209 175 Q237 200 267 175 L267 225 Q237 236 209 225 Z" fill="#2F49B8" />
        <circle cx="237" cy="96" r="26" fill="#E9B48A" />
        <path d="M212 90a24 24 0 0150 2c-14 5-36 4-50-2z" fill="#241B14" />
        {/* raised signing arm */}
        <path
          d="M214 132c-14-6-24-20-26-34"
          stroke="#E9B48A"
          strokeWidth="13"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="186" cy="96" r="10" fill="#E9B48A" />
      </g>

      {/* --- Translated hand-sign bubble: left figure --- */}
      <g transform="translate(118 24)">
        <rect x="0" y="0" width="76" height="46" rx="16" fill="white" stroke="#1E3FCC" strokeWidth="2" />
        <path d="M14 46l-8 12 16-8z" fill="white" stroke="#1E3FCC" strokeWidth="2" />
        {/* hand-sign glyph */}
        <path
          d="M14 15v10a3 3 0 006 0v-7a2 2 0 014 0v8a3 3 0 006 0v-6a2 2 0 014 0v9a6 6 0 01-6 6h-6a7 7 0 01-6-3l-4-6"
          fill="none"
          stroke="#1E3FCC"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x="46" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1E3FCC" fontFamily="Inter, sans-serif">
          HELLO
        </text>
      </g>

      {/* --- Translated hand-sign bubble: right figure --- */}
      <g transform="translate(150 6)">
        <rect x="0" y="0" width="94" height="46" rx="16" fill="#1E3FCC" />
        <path d="M78 46l8 12-16-8z" fill="#1E3FCC" />
        <path
          d="M14 14v11a3 3 0 006 0v-8a2 2 0 014 0v9a3 3 0 006 0v-7a2 2 0 014 0v10a6 6 0 01-6 6h-6a7 7 0 01-6-3l-4-6"
          fill="none"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x="58" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="white" fontFamily="Inter, sans-serif">
          THANK YOU
        </text>
      </g>
    </svg>
  )
}
