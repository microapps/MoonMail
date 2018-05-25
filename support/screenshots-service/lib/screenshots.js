import path from 'path';
import fs from 'fs';
import childProcess from 'child_process';
import cuid from 'cuid';
import Promise from 'bluebird';
import AWS from 'aws-sdk';
import s3Url from 's3-public-url';
import { logger } from './logger';
import { thumbnail } from 'easyimage';

const s3 = new AWS.S3({
  params: {
    Bucket: process.env.SCREENSHOTS_S3_BUCKET
  }
});

const Screenshots = {
  takeScreenshot(url) {
    return captureUrl(url)
      .then(filePath => createThumbnail(filePath))
      .then(filePath => uploadToS3(filePath));
  },

  takeScreenshotFromHtml(htmlBody) {
    return buildHtmlFile(htmlBody)
      .then(filePath => this.takeScreenshot(`file://${filePath}`));
  }
};

function buildHtmlFile(htmlBody) {
  return new Promise((resolve, reject) => {
    const filePath = '/tmp/index.html';
    fs.writeFile(filePath, htmlBody, (err) => {
      if (err) return reject(err);
      return resolve(filePath);
    });
  });
}

function resolveLambdaPath(relativePath) {
  return path.resolve(process.env.LAMBDA_TASK_ROOT, '_optimize', process.env.AWS_LAMBDA_FUNCTION_NAME, relativePath);
}

function captureUrl(url) {
  return new Promise((resolve, reject) => {
    const phantomjsBinPath = resolveLambdaPath('./bin/phantomjs');
    const scriptPath = resolveLambdaPath('./bin/screenshot_script.jss');

    const filename = `sc-${cuid()}.png`;
    const filePath = `/tmp/${filename}`;

    const phantomjs = childProcess.spawn(phantomjsBinPath, [scriptPath], {
      env: {
        URL: url,
        FILEPATH: filePath
      }
    });

    phantomjs.stdout.on('data', data => logger().debug(`phantomjs stdout: ${data}`));

    phantomjs.stderr.on('data', data => logger().error(`phantomjs stderr: ${data}`));

    phantomjs.on('error', err => reject(err));
    phantomjs.on('close', () => resolve(filePath));
  });
}

function createThumbnail(filePath) {
  return thumbnail({
    src: filePath,
    width: 400,
    height: 400,
  }).then(thumbInfo => thumbInfo.path);
}

function uploadToS3(filePath) {
  const body = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  const base64Body = new Buffer(body, 'binary');

  return s3.putObject({ Key: filename, Body: base64Body }).promise()
    .then(() => getPublicUrl(process.env.SCREENSHOTS_S3_BUCKET, filename))
    .then(url => ({ url }));
}

function getPublicUrl(bucket, key) {
  return s3Url.getHttps(bucket, key, process.env.AWS_REGION);
}

export default Screenshots;
