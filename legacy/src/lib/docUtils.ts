// Bolek Docs Utility Helper for compilation and file exports
import { DocFootnote } from '../types';

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
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${params.docTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.docx`;
  a.click();
}

export function exportAsPages(params: ExportParams): void {
  const htmlContent = compileDocumentHtml(params);
  // Pages can open rich HTML/MSWord layouts directly, so downloading it with a .pages dual extension 
  // or compatible application header ensures seamless import by Apple Pages
  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/x-iwork-pages-sffpages' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${params.docTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pages`;
  a.click();
}
