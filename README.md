# mdxish

[![NPM Version](https://img.shields.io/npm/v/mdxish.svg?style=flat)](https://www.npmjs.com/package/mdxish)
[![NPM License](https://img.shields.io/npm/l/all-contributors.svg?style=flat)](https://github.com/jasonjmcghee/mdxish/blob/master/LICENSE)

Write high-quality, interactive blog posts in markdown, live.

## In a nutshell
- write in markdown optionally including html
- start a codeblock with `// @run` to auto-execute
- optionally specify title and head block (e.g. custom styles or scripts outside of core post)

## Checkout an example

Blog Post (directly from a gist):

https://mdxish.com/jasonjmcghee/cba64163600fa90a3ea5d2ea099f3b55

(or you can drop the username https://mdxish.com/cba64163600fa90a3ea5d2ea099f3b55)

Source (click "Raw" to see the raw markdown):

https://gist.github.com/jasonjmcghee/cba64163600fa90a3ea5d2ea099f3b55

This is purely for demonstrative purposes - check the [examples](./examples) folder for more recent examples of posts build with mdxish.

## 4-Minute Video Introduction (🔉 Sound on)

https://github.com/user-attachments/assets/cc416a37-5d33-4452-a5b2-7754e6932fad

## Getting started

There are two main ways mdxish can be used.

1. Convert mdxish flavored markdown into static html locally (live or one-off) or in CI/CD.
2. Put a mdxish flavored markdown file called `index.md` in a gist, copy the gist id, and go to `https://mdxish.com/{gistId}`

For example:

```bash
npm run convert examples/falling-sand.md falling-sand.html
```

To launch a live server that will automatically keep HTML up to date with whatever you write in your mdxish flavored markdown:

```bash
npm run server -- -i examples/falling-sand.md
```

Note: this approach completely reloads all html / scripts on any change. You can customize this behavior to do whatever you want with the newly rendered HTML. Here's how to specify [custom hot reload behavior](./TIPS.md#custom-hot-reload-behavior).

## Examples

Check the [examples](./examples) directory. The current best demonstration of capabilities is [naive-gi.md](./examples/naive-gi.md). I strongly recommend using an IDE to view the markdown, as opposed to GitHub's preview.

Wrote a blog with mdxish and want to share it? Awesome! Open a PR and we'll add it to the examples!

## Interactive Blog Tips!

Have suggestions / tips about building interactive blogs?

Add them [here](./TIPS.md)!