import type { SVGProps } from "react";

export function AaboLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M12 2L1 21h22L12 2zm0 4.55L18.07 19H5.93L12 6.55z" />
      <path d="M11 10h2v5h-2z" />
    </svg>
  );
}
