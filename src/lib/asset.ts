/** Prefix public/ asset paths with the GitHub Pages base path (empty for user sites and custom domains). */
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
