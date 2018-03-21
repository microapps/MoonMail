// import * as fs from 'fs'; //todo: integrate certificate
import * as jwt from 'jsonwebtoken';
import { httpErrors } from './api-utils'

async function decryptToken(authToken) {
  try {
    if (!authToken) throw httpErrors.tokenNotProvided
    const tokenWithoutBearer = authToken.split(' ')[1];
    return await jwt.verify(tokenWithoutBearer, 'cert')
  } catch (e) {
    throw e
  }
}

async function createToken(payload) {
  try {
    return await jwt.sign(payload, 'cert')
  } catch (e) {
    throw e
  }
}

module.exports = {
  decryptToken,
  createToken
}