const paths={right:'M4 12h16m-6-6 6 6-6 6',left:'M20 12H4m6-6-6 6 6 6',up:'M12 20V4m-6 6 6-6 6 6',down:'M12 4v16m-6-6 6 6 6-6'};
export const arrowPattern=/[↗→←↑↓]\uFE0F?/g;
export function arrowMarkup(glyph='→'){const direction={'↗':'right','→':'right','←':'left','↑':'up','↓':'down'}[glyph[0]]||'right';return `<svg class="ui-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths[direction]}"/></svg>`;}
export function staticIcons(html){return html.replace(/>([^<>]*)</g,(match,text)=>'>'+text.replace(arrowPattern,arrowMarkup)+'<');}
