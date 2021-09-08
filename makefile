INSPECTOR = npx graphql-inspector introspect
LINTER = npx graphql-schema-linter
TESTS = npx jest tests/*.test.ts tests/**/*.test.ts --coverage

test:
	npx jest tests/ --coverage

tests: test

rm-build:
	rm -rf build/

build-cloud: 
	cd cloud; pwd; npm ci; npm run build; npx cdk synth

line-count:
	npx ts-node tools/linecount.ts -- server/**/*.ts

build-code:
	pwd; npx tsc

build: build-code build-cloud
	@echo Built Application Code And Cloud Comps

cloud-install: 
	cd cloud; npm i

deploy:
	cd cloud; pwd; npm run cdk deploy

preflight: build show-extras rm-build test

postflight: 
	npx jest tests-post-deploy

schema-gen: 
	npx ts-node server/models/mergeSchemas.ts

schema-lint: schema-gen
	${LINTER} server/models/merged.gen.graphql

schema-inspect: schema-gen
	 ${INSPECTOR} server/models/merged.gen.graphql --comments true

schema-check: schema-lint schema-inspect
	@echo Schema Linted and Introspected

show-extras: code-show-todos tests-show-todo tests-show-skip

code-show-todos:
	find ./server -name "*.ts" -exec grep -Hin "@todo" {} \;
	find ./server -name "*.ts" -exec grep -Hin "@todo" {} \; | wc -l

tests-show-todo:
	@echo "##TODOs"
	find ./tests -name "*.test.ts" -exec grep -Hin "test.todo" {} \;
	find ./tests -name "*.test.ts" -exec grep -Hin "test.todo" {} \; | wc -l;

tests-show-skip:
	@echo "##Skipped"
	find ./tests -name "*.test.ts" -exec grep -Hin "test.skip" {} \;
	find ./tests -name "*.test.ts" -exec grep -Hin "test.skip" {} \; | wc -l;

tests-show-more: tests-show-todo tests-show-skip
	@echo ""
	@echo "> #Showing All Unfinished Tests"

test-post-deploy:
	npx esbuild --bundle client/post-deploy-test.ts | node

list:
	@echo 
	@echo Available sub-commands...
	@echo
	@cat makefile | grep ":" | tail -r | awk 'NR>1{ print }' | tail -r
	@echo 
	@echo 