import { brotliCompress } from 'zlib'
// import { promisify } from 'util'

const corpus = `I'm baby kinfolk put a bird on it listicle heirloom brooklyn everyday carry cold-pressed tbh brunch crucifix gluten-free freegan la croix church-key. Tattooed pop-up tote bag kickstarter vice taxidermy. Williamsburg heirloom drinking vinegar vice portland, tumblr godard sriracha ugh food truck chicharrones twee. Thundercats vinyl DIY flannel hell of, tattooed squid godard deep v you probably haven't heard of them truffaut. Gentrify fam swag coloring book hot chicken chambray bespoke letterpress bushwick banjo vinyl disrupt ethical. Yuccie tumblr photo booth, synth shaman literally church-key slow-carb you probably haven't heard of them DIY enamel pin humblebrag. Occupy snackwave unicorn williamsburg, messenger bag cloud bread trust fund cray meh craft beer poke godard.
Yuccie la croix pop-up hoodie. Echo park keffiyeh affogato hot chicken, pork belly mixtape helvetica XOXO slow-carb normcore raw denim. Sustainable chicharrones truffaut bitters DIY austin. Hammock listicle artisan flexitarian aesthetic, chartreuse succulents before they sold out bespoke next level keffiyeh air plant retro. Lyft man braid edison bulb kitsch, franzen thundercats artisan DIY cray live-edge church-key hell of tousled small batch. Flexitarian narwhal raw denim, shoreditch DIY art party activated charcoal tumblr fashion axe pabst kinfolk palo santo slow-carb celiac. Edison bulb scenester palo santo leggings glossier godard.
Jean shorts air plant retro meditation semiotics heirloom. Forage lyft fam kinfolk pabst, cloud bread etsy VHS. Brooklyn bushwick la croix, gentrify crucifix biodiesel cliche asymmetrical ennui palo santo street art four loko lumbersexual. La croix chambray four dollar toast, offal echo park small batch 90's schlitz. Salvia XOXO heirloom, unicorn yr four loko 90's. Kickstarter neutra jean shorts edison bulb la croix celiac yuccie trust fund 8-bit squid.
Scenester hammock taxidermy small batch tilde. La croix live-edge 90's, green juice gluten-free PBR&B pitchfork man braid thundercats lomo chambray normcore. Salvia you probably haven't heard of them lumbersexual chia, brunch street art banjo ethical tilde keffiyeh poutine sartorial tattooed authentic palo santo. Pitchfork selvage austin four loko hot chicken, schlitz mixtape blue bottle everyday carry seitan kombucha vinyl biodiesel.
Selfies humblebrag vaporware DIY tattooed. Gluten-free vinyl celiac vice health goth truffaut. Subway tile seitan franzen live-edge, twee roof party shabby chic. Organic williamsburg butcher, wolf venmo copper mug poutine. Poutine vinyl jean shorts subway tile. Truffaut tacos lyft, unicorn affogato direct trade iceland iPhone kogi chillwave 90's disrupt. Biodiesel subway tile distillery edison bulb ethical pok pok umami.
Disrupt vexillologist deep v, try-hard twee cardigan pug tacos drinking vinegar austin hexagon williamsburg. Yuccie post-ironic PBR&B williamsburg roof party, echo park lumbersexual copper mug forage freegan pickled farm-to-table fingerstache. Post-ironic live-edge drinking vinegar etsy dreamcatcher, normcore seitan cronut bicycle rights vinyl. Cliche flexitarian lomo hoodie synth. IPhone mumblecore hoodie, bespoke direct trade kitsch DIY squid etsy meditation fanny pack. Flannel asymmetrical pop-up put a bird on it celiac bicycle rights. Gluten-free actually air plant, mixtape bitters viral pug.
Jianbing shaman cray tilde, vape copper mug lumbersexual small batch thundercats kickstarter. Umami whatever gentrify, semiotics retro readymade direct trade austin. Lo-fi twee air plant, gochujang meh leggings banjo stumptown. Locavore narwhal etsy kale chips vice brunch hot chicken hashtag four loko beard la croix truffaut shoreditch ramps. Selvage readymade cold-pressed butcher live-edge neutra. Etsy stumptown af godard taiyaki cred mustache celiac keffiyeh. Helvetica DIY meditation retro.
You probably haven't heard of them jianbing tousled locavore quinoa. Actually gochujang food truck ugh vexillologist vice hot chicken ennui edison bulb art party cloud bread. Tacos seitan heirloom man braid aesthetic, bicycle rights +1 mumblecore sustainable. Yr thundercats yuccie, narwhal kinfolk DIY pug food truck vice migas dreamcatcher wolf. Polaroid austin af, crucifix direct trade pop-up iceland master cleanse iPhone stumptown pok pok chillwave.
Lyft chambray literally put a bird on it, fingerstache neutra brunch ethical artisan poutine twee meh shabby chic fashion axe. Paleo actually vape portland. Vegan try-hard meggings listicle wayfarers narwhal hella +1 taiyaki pickled. Cornhole blog quinoa drinking vinegar, air plant hashtag pok pok food truck knausgaard. Bespoke live-edge snackwave tbh ramps. Meditation gastropub echo park ugh tousled post-ironic poutine DIY tofu yuccie butcher.
XOXO four loko sustainable coloring book, PBR&B letterpress normcore forage poutine pickled cray. Intelligentsia chambray kogi forage cray drinking vinegar. Tbh chicharrones street art ennui wayfarers pinterest, vinyl art party locavore waistcoat. Occupy sriracha church-key hexagon, distillery keffiyeh letterpress hell of DIY selvage. Locavore la croix banh mi lomo keytar offal. Letterpress knausgaard YOLO quinoa, mumblecore narwhal flannel heirloom live-edge etsy echo park hella green juice street art single-origin coffee.`

const corpusLen = corpus.length

const randSegOf = (n:number)=>{
    const spreadfactor = corpusLen - n
    const start = Math.random() * spreadfactor
    const ret = corpus.slice(start,start + n)
    // console.log({ret})
    return ret
}

const timeIt = async <T>(fn:(()=>Promise<T>))=>{
    const start = Date.now()
    const r = await fn()
    return { r, t: Date.now() - start }
}

const brotliP = (b:Buffer): Promise<TestResult> => new Promise((resolve, reject)=>{
    brotliCompress(b,(er, compressedData)=>{
        er ? reject(er): resolve({
            in: b.toString('base64'),
            out : compressedData.toString('base64'),
            factor: compressedData.length / b.length
        })
    })
})

;(async()=>{

    const testSetup = (numTests: number) => (numChars:number) => Promise.all(
        Array(numTests)
        .fill(0)
        .map(async () =>{
            return timeIt(()=> brotliP(Buffer.from(randSegOf(numChars))))
        })
    )

    const t = testSetup(30) 
    const setup = [
        [100,t],
        [200,t],  
        [400,t],
        [600,t],
        [800,t],
        [1000,t],
        [1500,t],
        [2000,t],
        [2500,t],
        [3000,t],
        [4000,t],
        [5000,t]
    ] as ArgFuncTuple[]


    const rank = <T>(n:number)=>(arr:T[])=>{
        return arr[Math.floor(n/100 * arr.length)]
    }

    

    const descStats = (prior:{}, elem: TimedTestResultSet, i: number, arr: TimedTestResultSet[]):Dict<IResultsDescStats>=>{
        return {
            ...prior,
            [elem.charN]: {
                factor:{
                    min: Math.min(...elem.res.map(v=>v.r.factor)),
                    p50: rank(50)(elem.res.map(v=>v.r.factor).sort()),
                    avg: elem.res.reduce((p,c)=> p + c.r.factor,0) / elem.res.length,
                    p90: rank(90)(elem.res.map(v=>v.r.factor).sort()),
                    p99: rank(99)(elem.res.map(v=>v.r.factor).sort()),
                    max: Math.max(...elem.res.map(v=>v.r.factor)),
                },
                timeElapsed:{
                    min: Math.min(...elem.res.map(v=>v.t)),
                    p50: rank(50)(elem.res.map(v=>v.t).sort()),
                    avg: elem.res.reduce((p,c)=> p + c.t,0) / elem.res.length,
                    p90: rank(90)(elem.res.map(v=>v.t).sort()),
                    p99: rank(99)(elem.res.map(v=>v.t).sort()),
                    max: Math.max(...elem.res.map(v=>v.t)),
                }
            } as IResultsDescStats
        } 
    }

    const results = await Promise.all(
        setup.map( async ([charN, runTestsWithCharSize]):Promise<TimedTestResultSet> => ({ charN, res: await runTestsWithCharSize(charN) }) )
    )

    // console.log( JSON.stringify(results.slice(0,2),null,2) )
    const descS = results.reduce(descStats, {} as {[s:string]:IResultsDescStats})
    
    console.log(
        JSON.stringify([
                Object.keys(descS).map(v=>parseInt(v)),
                Object.values(descS).map(v=>v.factor.p90),
                Object.values(descS).map(v=>v.timeElapsed.p90)
            ], null, 2)    
    )

})()

// #region interfaces
type Dict<T> = {[s:string]:T}
type IFunc = (n:number)=>Promise<TimedTestResult[]>
type ArgFuncTuple = [number, IFunc]

interface IDescriptitveStats{
    min:number,
    p50:number,
    avg:number,
    p90:number,
    p99:number,
    max:number
}

interface IResultsDescStats{
    factor: IDescriptitveStats
    timeElapsed: IDescriptitveStats
}


interface TimedTestResultSet{
    charN: number
    res: TimedTestResult[]
}

interface TimedTestResult{
    t: number
    r: TestResult
}

interface TestResult{
    factor: number
    in: string
    out: string
}
// #endregion interfaces