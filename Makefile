publish: build
	vsce publish --allow-all-proposed-apis
build:
	vsce package