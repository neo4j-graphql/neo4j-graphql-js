import jwt from 'jsonwebtoken';
import driver from './driver';
import { JWT_SECRET } from './config';

export default function context({ req }) {
  let token = req.headers.authorization || '';
  token = token.replace('Bearer ', '');
  const jwtSign = payload => jwt.sign(payload, JWT_SECRET);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { ...decoded, jwtSign, driver };
  } catch (e) {
    return { jwtSign, driver };
  }
}
