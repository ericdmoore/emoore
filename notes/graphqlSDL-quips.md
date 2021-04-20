GraphQL Quips
=============

1. resuse types within inputs
2. fragments should not be some inert string for string replacement
3. fragments would not be needed, if in some LISP-ish way you could define types inline, for composability.
4. import schemas from other files to build out my schema


``` proposed
# comment
type input TITLE{
  field1: {
      # inlined virtual type
      nestedFa: ''
      nestedFb: 1
  }
}
```

think babel then add a config...

```
{
   // always split the input and type
   useCommentHash:true, false -> means triple quote
   comment
}
```

compos