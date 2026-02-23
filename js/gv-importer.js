/**
 * Parser for Golden Venture Art Designer layout format.
 */

export function parseGVLayout(encoded) {
  try {
    const decoded = atob(encoded);
    if (!decoded.startsWith('V2a')) {
      throw new Error("Unsupported format version");
    }

    const firstPartStart = decoded.indexOf('>');
    const paletteStr = decoded.substring(3, firstPartStart);
    const colorPalette = {};
    paletteStr.split('-').forEach(p => {
      if (!p) return;
      const key = p[0];
      const color = p.substring(1);
      colorPalette[key] = color;
    });

    const parts = [];
    const partsContent = decoded.substring(firstPartStart);
    const partSections = partsContent.split('>').filter(s => s.length > 0);

    partSections.forEach(section => {
      const [name, rowData] = section.split('<');
      if (!rowData) return;

      // In some models, multiple parts are separated by 'W:' or 'Y:' within the same row string?
      // Actually, looking at the Vase: "|X:Aa3...|Z:AgB...|W:Ad3...|Y:Ba2..."
      // W and Y seem to be alternative row starts, possibly for sub-parts or special alignments.
      // For now, we split by '|' as the primary row separator.
      
      const rows = rowData.split('|').map(rowStr => {
        if (!rowStr || rowStr.length < 2) return null;
        
        // alignment/type flag
        const flag = rowStr[0];
        const alignment = (flag === 'Z' || flag === 'Y') ? 'offset' : 'straight';
        
        const piecesStr = rowStr.substring(2);
        const pieces = [];
        
        let i = 0;
        while (i < piecesStr.length) {
          const typeChar = piecesStr[i];
          const colorKey = piecesStr[i+1];
          let countStr = "";
          i += 2;
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
        
        return { alignment, pieces, flag };
      }).filter(r => r !== null);
      
      parts.push({ name, rows });
    });

    return { colorPalette, parts };
  } catch (e) {
    console.error("Failed to parse GV layout:", e);
    return null;
  }
}
