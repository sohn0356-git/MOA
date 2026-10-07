import type { SVGProps } from 'react';
export type FaithIconName = "back" | "bookmark-filled" | "bookmark" | "brand-app" | "brand-mark" | "calendar" | "check" | "chevron-right" | "close" | "comment" | "edit" | "font-size" | "heart-filled" | "heart" | "home" | "lock" | "logout" | "more" | "music" | "photo" | "play" | "plus" | "prayer-filled" | "prayer" | "question" | "scripture" | "search" | "send" | "settings" | "user";
// spriteUrl must be a bundler-resolved asset URL, including /MOA/ base path.
export function FaithIcon({name, spriteUrl, label, ...props}: SVGProps<SVGSVGElement> & {name:FaithIconName; spriteUrl:string; label?:string}) {
 return <svg width={24} height={24} viewBox="0 0 24 24" focusable="false" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} {...props}><use href={`${spriteUrl}#faith-${name}`} /></svg>;
}
