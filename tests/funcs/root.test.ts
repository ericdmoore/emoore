/* globals test expect */

import { handler } from '../../src/funcs/root'
import { event, ctx } from '../gatewayData'

test('basic root test', async () => {
  const r = await handler(event('GET', '/'), ctx)
  expect(r).toStrictEqual({
    statusCode: 300,
    headers: {
      Location: 'http://im.ericdmoore.com'
    }
  })
})
