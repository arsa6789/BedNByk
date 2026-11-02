"use client";

// The primary action of a unified item (see lib/feed.js):
//   bikes -> a button (opens the details sheet, which holds the booking link)
//   hotels / cars -> a link to the booking page; onBook is called so it can be added to History
// Items with nothing to open render a plain element.
export default function ItemAction({ item, onOpen, onBook, className, children, ...rest }) {
  if (item.kind === "bike") {
    return <button type="button" className={className} onClick={() => onOpen?.(item)} {...rest}>{children}</button>;
  }
  if (item.href) {
    return (
      <a className={className} href={item.href} target="_blank" rel="noopener noreferrer" onClick={() => onBook?.(item)} {...rest}>
        {children}
      </a>
    );
  }
  return <div className={className}>{children}</div>;
}
