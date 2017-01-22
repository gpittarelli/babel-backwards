SHELL:=/bin/bash
MAKEFLAGS = -j1

export PATH := $(shell pwd)/node_modules/.bin:$(PATH)

.PHONY: clean build lint lint-fix

clean:
	@rm -rf packages/*/lib

clean-deps:
	@rm -rf packages/*/lib packages/*/node_modules node_modules

build: clean
	@for f in packages/*; do \
		babel -d $$f/lib $$f/src; \
	done

watch: clean
	@for f in packages/*; do \
		babel -w -d $$f/lib $$f/src & \
	done; \
	wait

lint:
	@eslint 'packages/*/src/**.js'

lint-fix:
	@eslint --fix 'packages/*/src/**.js'

test:
	@mocha runtests.js

publish: build
	@lerna publish
