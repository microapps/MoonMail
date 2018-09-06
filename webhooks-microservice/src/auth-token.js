'use strict';

import { verify, sign } from 'jsonwebtoken'
import { httpErrors } from './api-utils'
import { S3 } from 'aws-sdk'

export async function decryptToken(authToken) {
  try {
    const cert = await getObj()
    if (!authToken) throw httpErrors.tokenNotProvided
    const tokenWithoutBearer = authToken.split(' ')[1]
    return await verify(tokenWithoutBearer, cert.Body, { algorithms: ['RS256'] })
  } catch (e) {
    throw e
  }
}

export async function createToken(payload) {
  try {
    return await sign(payload, 'cert')
  } catch (e) {
    throw e
  }
}

const getObj = async () => {
  const s3 = new S3()

  const params = {
    Bucket: process.env.PEMBUCKETNAME,
    Key: process.env.PEMFILENAME
  }

  return await s3.getObject(params).promise()
}

// const sign2 = async () => {
//   console.log(await createToken({ sub: 'email|5ac39cfba6803a91912493cb' }))
// }

// sign2().then()