export const makeSteppedArray = (iterStep:number) => 
  (iterSize:number, startTime:number = Date.now())=>
    Array.from({length: iterSize}, (_, i) => startTime - (i * iterStep));

export const monthedSteppedArray = (iterSize:number, startTime:number = Date.now())=>{
  const start = new Date(startTime)
  return Array.from({length: iterSize}, (_, i) => {
    const d = new Date(startTime)
    d.setMonth(start.getMonth() - i)
    d.setHours(0,0,0,0)
    return d.getTime()
  });
}

export const minSteppedArray = (iterStep:number = 1)=>(iterSize:number, startTime:number = Date.now())=>{
  const start = new Date(startTime)
  return Array.from({length: iterSize}, (_, i) => {
    const d = new Date(startTime)
    d.setMinutes(start.getMinutes() - (iterStep * i))
    return d.getTime()
  });
}

export const hourSteppedArray = (iterStep:number = 1)=>(iterSize:number, startTime:number = Date.now())=>{
  const start = new Date(startTime)
  return Array.from({length: iterSize}, (_, i) => {
    const d = new Date(startTime)
    d.setHours(start.getHours() - iterStep)
    return d.getTime()
  });
}

export const daySteppedArray = (iterStep:number = 1)=>(iterSize:number, startTime:number = Date.now())=>{
  const start = new Date(startTime)
  return Array.from({length: iterSize}, (_, i) => {
    const d = new Date(startTime)
    d.setDate(start.getDate() - iterStep)
    return d.getTime()
  });
}