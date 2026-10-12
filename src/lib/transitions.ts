// View-transition names shared by a gallery tile and its component page
// (docs/decisions/0012-gallery-view-transitions.md). One source for both
// sides, so a rename cannot break the match silently.

/** The tile preview on /ui and the hero on /ui/<name>. */
export const previewName = (name: string) => `tile-preview-${name}`;

/** The tile title on /ui and the heading on /ui/<name>. */
export const titleName = (name: string) => `tile-title-${name}`;
