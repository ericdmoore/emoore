Function Hanlders
======

Principles:

For Each Function / Resource

1. const get | put | post | dele: IFunc
1. export const handler: IFunc = baseHandler({get, put, post, dele})
1. export default handler
1. Break down the handler into two parts - `Fetcher` and `Responder`
    1. Fetcher does it best to get all the parts need for at least validations.
    1. Responder takes care of filtering out data elements based on authZ


JWT Info
