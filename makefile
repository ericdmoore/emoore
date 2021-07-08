INSPECTOR = npx graphql-inspector introspect
LINTER = npx graphql-schema-linter
TESTS = npx jest tests/*.test.ts tests/**/*.test.ts --coverage


test:
	npx jest tests/ --coverage

tests: test

pwd: 
	pwd

build-rm:
	rm -rf build/

build-cloud: 
	cd cloud; pwd; npm ci; npm run build; npx cdk synth

line-count:
	npx ts-node tools/linecount.ts -- src/**/*.ts

build-code:
	pwd; npx tsc

build: build-code build-cloud
	@echo Built Application Code And Cloud Comps

cloud-install: 
	cd cloud; npm i

deploy:
	cd cloud; pwd; npm run cdk deploy
	
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
	@echo 
	cat makefile | grep ":" | tail -r | awk 'NR>2{ print }' | tail -r
	@echo 
	@echo 