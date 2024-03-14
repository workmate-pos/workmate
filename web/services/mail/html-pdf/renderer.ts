import puppeteer from 'puppeteer';
import { CustomFile } from 'mailgun.js';

/**
 * Renders html to pdf. Returns a mailgun custom file;
 */
export async function renderHtmlToPdfCustomFile(name: string, html: string) {
  const buffer = await renderHtmlToPdfBuffer(html);
  return {
    data: buffer,
    filename: `${name}.pdf`,
    contentType: 'application/pdf',
    knownLength: buffer.length,
  } as const satisfies CustomFile;
}

async function renderHtmlToPdfBuffer(html: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  const pdf = await page.pdf({ printBackground: true });
  await browser.close();
  return pdf;
}
