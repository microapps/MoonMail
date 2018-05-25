import respond from './action';

export default function handler(evt, ctx) {
  respond(evt, (err, res) => ctx.done(err && JSON.stringify(err), res));
}
