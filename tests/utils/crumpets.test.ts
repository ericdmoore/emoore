/* globals test */
import crumpet from '../../server/utils/crumpetBakery'

test('JSON', async () => {
  crumpet.create('federa.co', 'my little secret', { key: '1' }).toJSON()
})
