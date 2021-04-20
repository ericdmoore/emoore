INSPECTOR = npx graphql-inspector introspect
LINTER = npx graphql-schema-linter

test: 
	npx jest tests/*.test.ts tests/**/*.test.ts --coverage

tests: test
	
build-cloud: 
	cd cloud ; npx jest tests/**/*.test.ts cloud && npm run cdk synth

build-code: 
	npx tsc

build: build-code build-cloud

schema-gen: 
	npx ts-node src/models/mergeSchemas.ts

schema-lint: schema-gen
	${LINTER} src/models/merged.gen.graphql

schema-inspect: schema-gen
	 ${INSPECTOR} src/models/merged.gen.graphql --comments true

schema-check: schema-lint schema-inspect
	@echo Schema Linted and Introspected

list:
	@echo Listing the make commands...
	cat makefile | grep ":" | tail -r | awk 'NR>2{ print }' | tail -r