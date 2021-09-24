/* globals test expect */

import { handler } from '../../server/funcs/root'
import { event, ctx } from '../gatewayData'

test('basic root test', async () => {
  const r = await handler(event('GET', '/'), ctx)
  expect(r).toEqual({
    statusCode: 300,
    headers: {
      Location: 'https://im.ericdmoore.com',
      'X-Developer': 'https://github.com/ericdmoore/emoore/wiki'
    }
  })
})
