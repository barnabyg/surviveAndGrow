/** The state crest shown beside the country's name. It is decoration and carries no meaning. */
export function Crest({ size }: { readonly size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <path
        d="M18,3 L31,8 V18 C31,26 25,31 18,33 C11,31 5,26 5,18 V8Z"
        fill="#232c35"
        stroke="#f2b33d"
        strokeWidth="1.5"
      />
      <circle cx="18" cy="16" r="5" fill="#f2b33d" />
      <path d="M10,25 H26" stroke="#f2b33d" strokeWidth="1.5" />
    </svg>
  );
}
