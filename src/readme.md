1. Make an embarrassingly simple version of a GraphQL API
    2. Query `{hello}` get back `{hello: 'world'}`
2. Deploy
3. Run a Query
4. Setup GraphiQL


## Next Steps

A. Complile a Schema
B. Use a Backend
C. Deal with Type Extensions

## Preview

SchemaStitching vs Federation

1. Schema Merging
    - presumes something builds the schema and runs the singular API
    - https://graphql-compose.github.io/docs/api/SchemaComposer.html
    - https://graphql-modules.com/
1. Schema Stitching 
    - Schema stitching creates a GraphQL gateway schema from multiple underlying GraphQL services.
    - It builds a proxy layer to delegate requests to underlying APIs. (comperable to Apollo Federation)
    - https://www.npmjs.com/package/@graphql-tools/stitch
2. Federation 
    - allows for higher degrees of independence 
    - presumes everyone runs their own GraphQL api 
    - Then a last API "to rule them all" sits on top of the sub APIs 
    - its directs traffic to the underling APIs based on some extra syntax directives
    - https://netflixtechblog.com/how-netflix-scales-its-api-with-graphql-federation-part-2-bbe71aaec44a