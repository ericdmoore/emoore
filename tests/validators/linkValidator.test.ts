import { incomingLongLink, incomingLongLinkFullKind } from '../../src/validators/links'
import {link} from '../../src/entities/links'
import {PathReporter} from 'io-ts/PathReporter'
import * as t from 'io-ts'
import reporters from 'io-ts-reporters'
import {isRight} from 'fp-ts/lib/Either'

const {rotates, geos, hurdles, keepalive, expires} = link.dynamicConfig

test('Long Link Input Exmaple.2', async()=>{
    const link1 = 'https://something.com'
    const isLink = incomingLongLink.is(link1)
    expect(isLink).toBeTruthy()
})

const isCheck = <A>(type:t.Type<A>, obj:unknown)=>isRight(type.decode(obj))

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

    const link2 = {
        long:'http://basicExample.com',
        dynamicConfig: expiringLink
    }
    
    expect( isCheck(incomingLongLinkFullKind, link2)).toBeTruthy()
})

test('Social Config + tags on a Long Link Config', async()=>{
    expect(
        isRight(incomingLongLinkFullKind.decode({
            long: encodeURIComponent('http://basicExample.com'),
            params:{'a':'1'},
            og:{'a':'1'},
            tags:{'a':'a'},
            ownerUacct:'ericdmoore'        
        }))
    ).toBeTruthy()
})

// base
// p2 p1 now f1 f2 

// presumably long0 is zero is first
// 