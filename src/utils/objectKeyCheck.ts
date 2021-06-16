export const hasElements = (...elementList: string[]) => 
    (input:any) => 
        elementList.every(e => input?.[e])