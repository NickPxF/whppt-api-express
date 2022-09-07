import { Router } from 'express';
import { parseImageFormat } from '../context/gallery/image';
import { ContextType } from '../context/Context';
import { GalleryItem } from '../context/gallery/GalleryItem';

const cache = require('express-cache-headers');
const multer = require('multer');
// const fetch = require('node-fetch');

const router = Router();

const oneDay = 60 * 60 * 24;
const sixMonths = oneDay * 30 * 6;

const storage = multer.memoryStorage();
const upload = multer({ storage }).single('file');

module.exports = ({ $gallery, $mongo: { $db } }: ContextType) => {
  if (!$gallery) throw new Error('Gallery is required');

  router.post('/gallery/upload', upload, (req: any, res: any) => {
    const { file } = req;
    const { domainId, type } = req.body;

    if (!file) return { message: 'File not found' };

    return $gallery
      .upload({ file, domainId, type })
      .then(galleryItem => {
        return res.json(galleryItem);
      })
      .catch(err => {
        res.status(err.http_code || 500).send(err);
      });
  });

  router.get(`/gallery/image/:imageId`, cache({ ttl: sixMonths }), (req, res) => {
    const { accept } = req.headers;
    const format = parseImageFormat(req.query);

    return $gallery
      .fetchImage({ itemId: req.params.imageId, format, accept })
      .then((response: any) => {
        if (!response) return res.status(404).send('Image not found');

        res.type(response.ContentType).send(response.Body);
      })
      .catch((err: any) => res.status(404).send(err));
  });

  router.get(`/gallery/svg/:svgId`, cache({ ttl: sixMonths }), (req, res) => {
    return $gallery
      .fetchOriginal({ itemId: req.params.svgId, type: 'svg' })
      .then((response: any) => {
        if (!response) return res.status(404).send('SVG not found');

        res.type(response.ContentType).send(response.Body);
      })
      .catch((err: any) => res.status(404).send(err));
  });

  router.get(`/gallery/video/:videoId`, cache({ ttl: sixMonths }), (req, res) => {
    return $gallery
      .fetchOriginal({ itemId: req.params.videoId, type: 'video' })
      .then((response: any) => {
        if (!response) return res.status(404).send('Video not found');

        res.type(response.ContentType).send(response.Body);
      })
      .catch((err: any) => res.status(404).send(err));
  });

  router.get('/gallery/file/:id/:name', cache({ ttl: sixMonths }), (req: any, res) => {
    return $gallery
      .fetchOriginal({ itemId: req.params.id, type: 'doc' })
      .then((fileBuffer: any) => {
        if (!fileBuffer) return res.status(500).send('File not found');
        return res.type(fileBuffer.ContentType).send(fileBuffer.Body);
      })
      .catch((err: any) => {
        res.status(500).send(err);
      });
  });

  router.get('/gallery/file/:id', (req, res) => {
    const { id } = req.params;

    return $db
      .collection('gallery')
      .findOne<GalleryItem>({ _id: id })
      .then(item => {
        res.redirect(`/gallery/file/${id}/${item?.fileInfo?.originalname}?utm_medium=website&utm_campaign=website&utm_content=${item?.fileInfo?.originalname}`);
      });
  });

  return router;
};

// const trackEvent = (medium: string, campaign: string, fileName: string) => {
//   const trackingId = process.env.GA_TRACKING_ID;
//   if (!trackingId || !trackingId.length) return Promise.resolve();
//   if (!medium || !campaign || !fileName) return Promise.resolve();
//   const data = {
//     v: '1',
//     tid: trackingId,
//     cm: medium,
//     cc: fileName,
//     cn: campaign,
//   };

//   return fetch('http://www.google-analytics.com/debug/collect', {
//     params: data,
//   });
// };
