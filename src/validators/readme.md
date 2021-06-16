Validator Funcs
================


```typescript
(sidecarKey:string) => async (e,c,d)=>{
    //
    // do stuff
    //
    return {
        code: 400,
        reason: 'The Validation Failed is a Bad Reason - What should the caller do to fix it',
        passed: didPass(),
        InvalidDataLoc: '[H>Q>C].authToken',
        InvalidDataValue: someVariable,
        docRef: '#',
        // no sidecar key ; no expensiveData return
        ...(usr ? { expensiveData: { sidecarKey: usr } } : {}) 
    }
}
```
