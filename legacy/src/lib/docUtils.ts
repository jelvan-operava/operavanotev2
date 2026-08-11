// Bolek Docs Utility Helper for compilation and file exports
import { DocFootnote } from '../types';

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const getPaperDimensions = (paperSize: string, orientation: string) => {
  const size = paperSize === 'a4'
    ? { width: 595.28, height: 841.89 }
    : paperSize === 'legal'
      ? { width: 612, height: 1008 }
      : paperSize === 'a5'
        ? { width: 419.53, height: 595.28 }
        : paperSize === 'executive'
          ? { width: 522, height: 756 }
          : { width: 612, height: 792 };

  return orientation === 'landscape'
    ? { width: size.height, height: size.width }
    : size;
};

const escapePdfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const wrapText = (text: string, maxChars: number) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
};

const markdownToPlainText = (content: string) => {
  const stripHtml = (value: string) => {
    if (typeof document === 'undefined') return value;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = value;
    return wrapper.textContent || wrapper.innerText || '';
  };

  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (/^#{1,6}\s+/.test(trimmed)) return trimmed.replace(/^#{1,6}\s+/, '').toUpperCase();
      if (/^[-*]\s+/.test(trimmed)) return `• ${trimmed.replace(/^[-*]\s+/, '')}`;
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        return trimmed
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim())
          .filter(Boolean)
          .join('  ');
      }
      return trimmed
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/_(.*?)_/g, '$1')
        .replace(/\[\^(\d+)\]/g, '[$1]');
    })
    .map((line) => stripHtml(line))
    .join('\n');
};

const createTextPdfBlob = (title: string, lines: string[], paperSize: string, orientation: string) => {
  const { width, height } = getPaperDimensions(paperSize, orientation);
  const margin = 48;
  const fontSize = 12;
  const lineHeight = 14;
  const maxChars = Math.max(40, Math.floor((width - margin * 2) / 6));
  const linesPerPage = Math.max(24, Math.floor((height - margin * 2) / lineHeight));

  const wrappedLines = lines.flatMap((line) => (line ? wrapText(line, maxChars) : ['']));
  const pages: string[][] = [];
  for (let i = 0; i < wrappedLines.length; i += linesPerPage) {
    pages.push(wrappedLines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push(['']);

  const objects: string[] = [];
  const pageCount = pages.length;
  const pageObjectNumbers = pages.map((_, idx) => 4 + idx * 2);
  const contentObjectNumbers = pages.map((_, idx) => 5 + idx * 2);

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageCount} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  pages.forEach((pageLines, idx) => {
    const pageNum = pageObjectNumbers[idx];
    const contentNum = contentObjectNumbers[idx];
    const startY = height - margin - fontSize;
    const streamLines = [
      'BT',
      `/F1 ${fontSize} Tf`,
      `${lineHeight} TL`,
      `1 0 0 1 ${margin} ${startY} Tm`,
      ...pageLines.map((line, lineIdx) => lineIdx === 0 ? `(${escapePdfText(line)}) Tj` : [`T*`, `(${escapePdfText(line)}) Tj`]).flat(),
      'ET',
    ];

    objects[pageNum] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width.toFixed(2)} ${height.toFixed(2)}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNum} 0 R >>`;
    objects[contentNum] = `<< /Length ${streamLines.join('\n').length} >>\nstream\n${streamLines.join('\n')}\nendstream`;
  });

  const header = '%PDF-1.4\n%1234\n';
  let body = '';
  const offsets: number[] = [0];
  objects.forEach((obj, idx) => {
    if (!obj) return;
    offsets[idx] = header.length + body.length;
    body += `${idx} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = header.length + body.length;
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) {
    const offset = offsets[i] || 0;
    xref += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info << /Title (${escapePdfText(title)}) >> >>\nstartxref\n${xrefStart}\n%%EOF`;
  const pdf = `${header}${body}${xref}${trailer}`;
  return new Blob([pdf], { type: 'application/pdf' });
};

export function convertMarkdownToHtml(md: string): string {
  let html = md;
  
  // Escape HTML characters
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
  
  // Lists
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  
  // Footnotes [^1]
  html = html.replace(/\[\^(\d+)\]/g, '<sup>[$1]</sup>');
  
  // Table Parsing
  const lines = html.split('\n');
  let inTable = false;
  let tableHtml = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableHtml = '<table style="width:100%; border-collapse:collapse; margin:12px 0;">';
      }
      
      // Skip separator
      if (line.includes('---') || line.includes(':::')) {
        continue;
      }
      
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      const isHeader = i === 0 || (lines[i-1] && !lines[i-1].trim().startsWith('|'));
      
      tableHtml += '<tr>';
      cells.forEach(cell => {
        if (isHeader) {
          tableHtml += `<th style="border:1px solid #cccccc; padding:8px; background-color:#f3f4f6; font-weight:bold; text-align:left;">${cell}</th>`;
        } else {
          tableHtml += `<td style="border:1px solid #cccccc; padding:8px; text-align:left;">${cell}</td>`;
        }
      });
      tableHtml += '</tr>';
    } else {
      if (inTable) {
        inTable = false;
        tableHtml += '</table>';
        lines[i] = tableHtml + '\n' + lines[i];
      }
    }
  }
  
  if (inTable) {
    tableHtml += '</table>';
    lines.push(tableHtml);
  }
  
  html = lines.join('\n');
  
  // Paragraphs
  html = html.split('\n\n').map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<table') || trimmed.startsWith('<tr') || trimmed.startsWith('<li') || trimmed.startsWith('<block')) {
      return trimmed;
    }
    return `<p style="margin-bottom:10pt; line-height:1.5;">${trimmed.replace(/\n/g, '<br/>')}</p>`;
  }).join('\n');
  
  return html;
}

interface ExportParams {
  docTitle: string;
  docSubtitle: string;
  docAuthor: string;
  content: string;
  paperSize: string;
  orientation: string;
  marginTop: number;
  marginLeft: number;
  lineSpacing: number;
  textAlign: string;
  fontSize: number;
  fontFamily: string;
  showCoverPage: boolean;
  footnotes: DocFootnote[];
}

export function compileDocumentHtml({
  docTitle,
  docSubtitle,
  docAuthor,
  content,
  paperSize,
  orientation,
  marginTop,
  marginLeft,
  lineSpacing,
  textAlign,
  fontSize,
  fontFamily,
  showCoverPage,
  footnotes
}: ExportParams): string {
  const formattedHtml = convertMarkdownToHtml(content);
  
  const fontStack = fontFamily === 'font-serif' 
    ? 'Georgia, serif' 
    : fontFamily === 'font-mono' 
      ? 'Courier New, monospace' 
      : 'Arial, sans-serif';

  const paperStyles = paperSize === 'letter' 
    ? 'size: 8.5in 11.0in;' 
    : paperSize === 'a4' 
      ? 'size: 21.0cm 29.7cm;' 
      : paperSize === 'legal' 
        ? 'size: 8.5in 14.0in;' 
        : paperSize === 'a5' 
          ? 'size: 14.8cm 21.0cm;' 
          : 'size: 7.25in 10.5in;';

  return `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <!--[if gte mso 9]>
    <xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
      </w:WordDocument>
    </xml>
    <![endif]-->
    <meta charset="utf-8">
    <title>${docTitle}</title>
    <style>
      @page WordSection1 {
        ${paperStyles}
        margin: ${marginTop}in ${marginLeft}in ${marginTop}in ${marginLeft}in;
        mso-header-margin: 0.5in;
        mso-footer-margin: 0.5in;
        mso-paper-source: 0;
      }
      div.WordSection1 {
        page: WordSection1;
      }
      body {
        font-family: ${fontStack};
        font-size: ${fontSize}pt;
        line-height: ${lineSpacing};
        color: #1c1917;
        text-align: ${textAlign};
      }
      h1 {
        font-size: 24pt;
        font-weight: bold;
        color: #111111;
        margin-bottom: 12pt;
        font-family: Arial, sans-serif;
      }
      h2 {
        font-size: 18pt;
        font-weight: bold;
        color: #222222;
        margin-top: 18pt;
        margin-bottom: 6pt;
        font-family: Arial, sans-serif;
      }
      h3 {
        font-size: 14pt;
        font-weight: bold;
        color: #333333;
        margin-top: 14pt;
        margin-bottom: 4pt;
        font-family: Arial, sans-serif;
      }
      p {
        margin-bottom: 10pt;
      }
      blockquote {
        border-left: 3px solid #d6d3d1;
        padding-left: 12pt;
        color: #78716c;
        font-style: italic;
        margin: 12pt 0;
      }
      .cover {
        text-align: center;
        page-break-after: always;
        padding: 2in 0;
      }
      .cover h1 {
        font-size: 32pt;
        margin-bottom: 18pt;
      }
      .cover p.subtitle {
        font-size: 16pt;
        color: #78716c;
        margin-bottom: 30pt;
      }
      .cover p.author {
        font-size: 12pt;
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <div class="WordSection1">
      ${showCoverPage ? `
      <div class="cover">
        <h1 style="text-transform: uppercase;">${docTitle}</h1>
        <p class="subtitle" style="font-style: italic;">${docSubtitle}</p>
        <hr style="width: 1.5in; margin: 24pt auto; border: 0; border-top: 3px solid #ea580c;"/>
        <p class="author">Lead Author: ${docAuthor}</p>
        <p style="font-size: 10pt; color: #78716c;">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      ` : ''}
      
      ${formattedHtml}
      
      ${footnotes.length > 0 ? `
      <hr style="margin-top: 36pt; border: 0; border-top: 1px solid #e7e5e4;"/>
      <h3 style="font-size: 12pt; color: #78716c; text-transform: uppercase;">References & Footnotes</h3>
      <ol style="font-size: 9pt; color: #57534e;">
        ${footnotes.map(fn => `<li>${fn.text}</li>`).join('')}
      </ol>
      ` : ''}
    </div>
  </body>
  </html>
  `;
}

export function exportAsWord(params: ExportParams): void {
  const htmlContent = compileDocumentHtml(params);
  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
  downloadBlob(blob, `${params.docTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.docx`);
}

export function exportAsPages(params: ExportParams): void {
  const htmlContent = compileDocumentHtml(params);
  // Pages can open rich HTML/MSWord layouts directly, so downloading it with a .pages dual extension 
  // or compatible application header ensures seamless import by Apple Pages
  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/x-iwork-pages-sffpages' });
  downloadBlob(blob, `${params.docTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pages`);
}

export function exportAsHtml(params: ExportParams): void {
  const htmlContent = compileDocumentHtml(params);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, `${params.docTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.html`);
}

export function exportAsPdf(params: ExportParams): void {
  const plainText = markdownToPlainText(params.content);
  const lines = [
   params.docTitle.toUpperCase(),
   params.docSubtitle,
   `Author: ${params.docAuthor}`,
   '',
   ...plainText.split('\n'),
   '',
   ...params.footnotes.map((fn) => `[${fn.number}] ${fn.text}`),
  ];
  const blob = createTextPdfBlob(params.docTitle, lines, params.paperSize, params.orientation);
  downloadBlob(blob, `${params.docTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`);
}
