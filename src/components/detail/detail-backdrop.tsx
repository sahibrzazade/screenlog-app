import Image from "next/image";

type DetailBackdropProps = {
  /** Full backdrop URL, or null when the title has no backdrop. */
  url: string | null;
};

/** Gradient-faded hero backdrop shown above a movie/show detail page. */
export const DetailBackdrop = ({ url }: DetailBackdropProps) => {
  if (!url) return null;

  return (
    <div className="relative mb-6 h-40 w-full overflow-hidden rounded-md bg-surface sm:h-56 md:h-64">
      <Image
        src={url}
        alt=""
        fill
        sizes="(min-width: 1024px) 1024px, 100vw"
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
};
