import behch from 'benchmark'
import type {Event} from 'benchmark'
import crumpet from '../../src/utils/crumpetBakery'

const suite = new behch.Suite()

suite.add('create crunmpet', ()=>{
    crumpet
    .create('issuer','secret',[])
})
.add('large addition chain',()=>{
    crumpet
    .create('issuer','secret',[])
    .addCaveats([['k','v'],[]])
})
.on('cycle', function(event:Event){
    console.log(JSON.stringify(event))
    console.log(JSON.stringify(event.target.stats))
    console.log(String(event.target))
})

export default suite

;(async ()=>{
    if(require.main === module){
        suite.run({async:true})
    }
})()
