import fetch, { FormData, Blob } from 'node-fetch';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';

/**
 * @see https://gotenberg.dev/docs/routes#page-properties-chromium
 */
export type ChromiumPagePoperties = {
  /** Define whether to print the entire content in one single page. */
  singlePage?: boolean;
  /** Paper width, in inches. */
  paperWidth?: number;
  /** Paper height, in inches. */
  paperHeight?: number;
  /** Top margin, in inches. */
  marginTop?: number;
  /** Bottom margin, in inches. */
  marginBottom?: number;
  /** Left margin, in inches. */
  marginLeft?: number;
  /** Right margin, in inches. */
  marginRight?: number;
  /** Define whether to prefer page size as defined by CSS. */
  preferCssPageSize?: boolean;
  /** Print the background graphics. */
  printBackground?: boolean;
  /** Hide the default white background and allow generating PDFs with transparency. */
  omitBackground?: boolean;
  /** Set the paper orientation to landscape. */
  landscape?: boolean;
  /** The scale of the page rendering. */
  scale?: number;
  /** Page ranges to print, e.g., '1-5, 8, 11-13' - empty means all pages. */
  nativePageRanges?: string;
};

export async function convertHtmlToPdf(html: string, properties?: ChromiumPagePoperties) {
  const formData = new FormData();
  formData.append('files', new Blob([html], { type: 'text/html' }), 'index.html');
  return await fetchGotenberg('/forms/chromium/convert/html', formData, properties);
}

export async function convertMultipleHtmlToPdfs(
  htmlPages: string[],
  options?: ChromiumPagePoperties,
  maxParallel = 5,
): Promise<Buffer[]> {
  let active = 0;
  let currentIndex = 0;
  const buffers: Buffer[] = [];

  return new Promise((resolve, reject) => {
    const processNext = () => {
      if (currentIndex >= htmlPages.length && active === 0) {
        resolve(buffers);
        return;
      }
      while (active < maxParallel && currentIndex < htmlPages.length) {
        const html = htmlPages[currentIndex++]!;
        active++;
        convertHtmlToPdf(html, options)
          .then(buffer => {
            buffers.push(buffer);
            active--;
            processNext();
          })
          .catch(error => {
            reject(error);
          });
      }
    };

    processNext();
  });
}

export type MergePdfsProperties = {
  /** Convert the resulting PDF into the given PDF/A format. */
  pdfa: 'PDF/A-1b' | 'PDF/A-2b' | 'PDF/A-3b';
  /** Enable PDF for Universal Access for optimal accessibility. */
  pdfua?: boolean;
};

export async function mergePdfs(buffers: Buffer[], properties?: MergePdfsProperties) {
  const formData = new FormData();
  const padLength = Math.ceil(Math.log10(buffers.length));
  for (let i = 0; i < buffers.length; i++) {
    const suffix = String(i).padStart(padLength, '0'); // Files are sorted alphanumerically
    formData.append('files', new Blob([buffers[i]!], { type: 'application/pdf' }), `file-${suffix}.pdf`);
  }

  return fetchGotenberg('/forms/pdfengines/merge', formData, properties);
}

async function fetchGotenberg(path: string, formData: FormData, properties?: Record<string, any>) {
  if (properties != null) {
    for (const [key, value] of Object.entries(properties)) {
      formData.append(key, String(value));
    }
  }

  const res = await fetch(process.env.GOTENBERG_URL + path, {
    method: 'POST',
    body: formData,
  });
  if (res.status !== 200) {
    const data: Record<string, any> = {};
    if (res.headers.get('content-type')?.includes('application/json')) {
      data['json'] = await res.json();
    } else {
      data['text'] = await res.text();
    }

    const e = new HttpError('PDF generation failed', res.status);
    sentryErr(e, { path, formData: Object.fromEntries(formData.entries()), data });
    throw e;
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
