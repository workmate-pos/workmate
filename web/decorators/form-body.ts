import { decorator, DecoratorHandler } from '@teifi-digital/shopify-app-express/decorators';
import { text } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

export const FormBodyKey = 'form-body';

/**
 * Add urlencoded and multipart body parsing to the request.
 * Errors if no body/an invalid content type is provided.
 */
export function FormBody() {
  return decorator(FormBodyKey);
}

export const formBodyHandler: DecoratorHandler<undefined> = () => {
  const urlEncodedHandler: RequestHandler = (req, res, next) => {
    if (req.headers['content-type']?.toLowerCase() !== 'application/x-www-form-urlencoded') {
      return next();
    }

    if (typeof req.body !== 'string') {
      throw new HttpError('Invalid body type', 400);
    }

    req.body = new URLSearchParams(req.body);
    next();
  };

  const multipartHandler: RequestHandler = async (req, res, next) => {
    if (req.headers['content-type']?.toLowerCase() !== 'multipart/form-data') {
      return next();
    }

    if (typeof req.body !== 'string') {
      throw new HttpError('Invalid body type', 400);
    }

    const boundary = req.body.slice(2, req.body.indexOf('\r\n'));
    req.body = await new Response(req.body, {
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    }).formData();

    next();
  };

  const fallthroughHandler: RequestHandler = (req, res, next) => {
    if (!req.body) {
      throw new HttpError('Invalid body type', 400);
    }

    next();
  };

  return [
    text({ type: ['application/x-www-form-urlencoded', 'multipart/form-data'] }),
    urlEncodedHandler,
    multipartHandler,
    fallthroughHandler,
  ];
};
