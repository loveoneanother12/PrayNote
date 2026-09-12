import Image from "next/image";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-mark ${className}`.trim()} aria-hidden="true">
      <Image src="/icons/icon.svg" alt="" width={512} height={512} priority />
    </span>
  );
}
