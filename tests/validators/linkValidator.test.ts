import { incomingLongLink, incomingLongLinkFullKind } from '../../server/validators/links'
import {link} from '../../server/entities/links'
import * as t from 'io-ts'
import {isRight} from 'fp-ts/lib/Either'

// import rpt from 'io-ts-reporters'
// import {PathReporter} from 'io-ts/PathReporter'

const {rotates, geos, hurdles, keepalive, expires} = link.dynamicConfig
const isCheck = <A>(type:t.Type<A>, obj:unknown)=>isRight(type.decode(obj))

test('Long Link Input Exmaple.2', async()=>{
    const link1 = 'https://something.com'
    const isLink = incomingLongLink.is(link1)
    expect(isLink).toBeTruthy()
})

test('Dynamic Long Link Config', async()=>{
    const expiringLink = expires([
        {at:1000, url: keepalive([
            {at:1000, url: geos([
                {at:'US', url: rotates([
                    {at:1, url:'http://rotate1.com'}, 
                    {at:1, url:'http://rotate2.com'},
                    {at:1, url:'http://rotate3.com'}
                    ]) 
                },
                {at:'CAN', url: hurdles([
                    {at:1000, url:'http://hurdle1.com'}, 
                    {at:2000, url:'http://hurdle2.com'},
                    {at:3000, url:'http://hurdle3.com'}
                    ]) 
                }
            ])}
        ])}
    ])

    const link2 = { long:'http://basicExample.com', dynamicConfig: expiringLink }
    expect( isCheck(incomingLongLinkFullKind, link2)).toBeTruthy()
})

test('Social Config + tags on a Long Link Config', async()=>{
    const socialConfig = {
        long: encodeURIComponent('http://basicExample.com'),
        ownerUacct:'ericdmoore',
        metatags : { "og:title" : 'Open Graph Title'},
        params : {'a':'1'},
        tags : {'a':'a'}
    }
    expect(isCheck(incomingLongLinkFullKind, socialConfig)).toBeTruthy()
})

