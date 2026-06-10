/**
 * Parser for Golden Venture Art Designer layout format.
 *
 * Decoded layout shape:
 *   "V2" + palette ("a#0000FF-b#01b77a-...") + parts
 * Each part is ">Name<" (or "~Name<") followed by rows separated by "|".
 * A row is a flag ("Z"/"Y" = offset, "X"/"W" = straight), ":", then pieces:
 * piece type letter (A = standard unit, F = hanging, ...), a lowercase
 * palette key, and an optional repeat count.
 */

export function parseGVLayout(encoded) {
  try {
    const decoded = atob(encoded.trim());
    if (!decoded.startsWith('V2')) {
      throw new Error("Unsupported format version");
    }

    const firstPartStart = decoded.indexOf('>');
    // Palette entries look like "a#0000FF" separated by "-"; the exact
    // header prefix varies between exports, so match the pairs directly.
    const colorPalette = {};
    const paletteStr = decoded.substring(0, firstPartStart);
    for (const m of paletteStr.matchAll(/([a-z])(#[0-9A-Fa-f]{6})/g)) {
      colorPalette[m[1]] = m[2];
    }

    const parts = [];
    const partsContent = decoded.substring(firstPartStart);
    const partSections = partsContent.split(/[>~]/).filter(s => s.length > 0);

    partSections.forEach(section => {
      const [name, rowData] = section.split('<');
      if (!rowData) return;

      const rows = rowData.split('|').map(rowStr => {
        if (!rowStr || rowStr.length < 3 || rowStr[1] !== ':') return null;

        const flag = rowStr[0];
        const alignment = (flag === 'Z' || flag === 'Y') ? 'offset' : 'straight';

        const piecesStr = rowStr.substring(2);
        const pieces = [];

        let i = 0;
        while (i < piecesStr.length) {
          const typeChar = piecesStr[i];
          const colorKey = piecesStr[i + 1];
          // Skip anything that doesn't look like "<TYPE><colorkey>"
          // (some exported strings contain stray bytes).
          if (!/[A-Z]/.test(typeChar) || !colorKey || !/[a-z]/.test(colorKey)) {
            i++;
            continue;
          }
          i += 2;
          let countStr = "";
          while (i < piecesStr.length && /\d/.test(piecesStr[i])) {
            countStr += piecesStr[i];
            i++;
          }

          pieces.push({
            type: typeChar, // A, B, C, E, T, G, V
            color: colorPalette[colorKey] || '#ffffff',
            count: parseInt(countStr) || 1
          });
        }

        if (pieces.length === 0) return null;
        return { alignment, pieces, flag };
      }).filter(r => r !== null);

      if (rows.length > 0) parts.push({ name, rows });
    });

    if (parts.length === 0) return null;
    return { colorPalette, parts };
  } catch (e) {
    console.error("Failed to parse GV layout:", e);
    return null;
  }
}
