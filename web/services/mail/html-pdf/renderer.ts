import { CustomFile } from 'mailgun.js';
import { convertHtmlToPdf } from '../../pdf.js';

/**
 * Renders html to pdf. Returns a mailgun custom file;
 */
export async function renderHtmlToPdfCustomFile(name: string, html: string) {
  const buffer = await convertHtmlToPdf(html);
  return {
    data: buffer,
    filename: `${name}.pdf`,
    contentType: 'application/pdf',
    knownLength: buffer.length,
  } as const satisfies CustomFile;
}
