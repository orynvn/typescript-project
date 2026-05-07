import Image, { type ImageProps } from 'next/image';

type Props = ImageProps & {
  fallbackSrc?: string;
};

export function AppImage({ fallbackSrc = '/placeholder.png', alt, ...props }: Props): JSX.Element {
  return (
    <Image
      alt={alt}
      {...props}
      onError={(event) => ((event.currentTarget as HTMLImageElement).src = fallbackSrc)}
    />
  );
}
