import Image, { type ImageProps } from 'next/image';

export function AppImage(props: ImageProps): JSX.Element {
  return <Image {...props} />;
}
