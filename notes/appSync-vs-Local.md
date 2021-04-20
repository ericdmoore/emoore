## Setup
file1.ts -> export {schema, resolvers }
file2.ts -> export {schema, resolvers}
file3.ts -> export {schema, resolvers}



## Local Dev
import all /path/file*.ts 

- merge schemas
- merge resolvers
- make Schema Executable or similar
- launch local process

## Cloud Deploy

Strategy1. Each file wraps itself in a Lambda Function? But that likely introduces a build step and thus adds a time step. AKA Async Process - likely no problem

But make sure build step can incorporate ENV values too


