INSPECTOR = npx graphql-inspector introspect
LINTER = npx graphql-schema-linter
TESTS = npx jest tests/*.test.ts tests/**/*.test.ts --coverage

tests: test

test: rm-build
	npx jest tests/ --coverage

line-count:
	npx ts-node -P ./node.tsconfig.json tools/linecount.ts -- server/**/*.ts




rm-build:
	rm -rf build/

build-code:
	pwd; npx tsc

build-cloud: 
	cd cloud; pwd; npm ci; npm run build; npx cdk synth;

build: build-code build-cloud
	@echo Built Application Code And Cloud Comps



cloud-install:
	cd cloud; npm i

deploy: preflight build test rm-build postflight
	cd cloud; pwd; npm run cdk deploy




preflight: build show-extras rm-build test line-count

postflight: post-deploy-tests
	@echo "Post Deployment Tests Concluded"




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

post-deploy-tests:
	npx esbuild client/post-deploy-test.ts --platform=node --target=node14 --bundle | node



list:
	@echo 
	@echo Available sub-commands...
	@echo
	@cat makefile | grep ":" | tail -r | awk 'NR>1{ print }' | tail -r
	@echo 
	@echo 