import zlib from 'zlib';

export function compressString(str) {
  return zlib.gzipSync(str).toString('base64');
}

export function uncompressString(compressedStr) {
  const buff = new Buffer(compressedStr, 'base64');
  return zlib.gunzipSync(buff).toString('utf8');
}
