# mdxish

mdxish is meant to make it easy to write mixed media and interactive blog posts.

## Checkout an example

Blog Post:

https://mdxish.com/jasonjmcghee/cba64163600fa90a3ea5d2ea099f3b55

(or you can drop the username https://mdxish.com/cba64163600fa90a3ea5d2ea099f3b55)

Source (click "Raw" to see the raw markdown):

https://gist.github.com/jasonjmcghee/cba64163600fa90a3ea5d2ea099f3b55

## Getting started

There are two main ways mdxish can be used.

1. Put a mdxish flavored markdown file called `index.md` in a gist, copy the gist id, and go to `https://mdx.com/{gistId}`

2. Convert mdxish flavored markdown into static html locally / in CI/CD.

For example:

```bash
npm run convert falling-sand.md falling-sand.html
```

You can also launch a live server that will automatically keep HTML up to date with whatever you write in your mdxish flavored markdown.

For example:

```bash
npm run server -i falling-sand.md
```
