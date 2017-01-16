SHELL:=/bin/bash
MAKEFLAGS = -j1

export PATH := $(shell pwd)/node_modules/.bin:$(PATH)

.PHONY: clean build

clean:
	@rm -rf packages/*/lib

build: clean
	@for f in packages/*; do \
		babel -d $$f/lib $$f/src; \
	done
