SHELL:=/bin/bash
MAKEFLAGS = -j1

export PATH := $(shell pwd)/node_modules/.bin:$(PATH)

.PHONY: clean build lint lint-fix

clean:
	@rm -rf packages/*/lib

build: clean
	@for f in packages/*; do \
		babel -d $$f/lib $$f/src; \
	done

lint:
	@eslint 'packages/*/src/**.js'

lint-fix:
	@eslint --fix 'packages/*/src/**.js'
