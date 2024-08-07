# mdxish

[![NPM Version](https://img.shields.io/npm/v/mdxish.svg?style=flat)](https://www.npmjs.com/package/mdxish)
[![NPM License](https://img.shields.io/npm/l/all-contributors.svg?style=flat)](https://github.com/jasonjmcghee/mdxish/blob/master/LICENSE)

Write high-quality, interactive blog posts in markdown, live.

[See this readme rendered with mdxish instead](https://mdxish.com/jasonjmcghee/f3cfbd700db8f5115c40adbe07ca1bcf)

## In a nutshell
- write in markdown optionally including html / codeblocks
- start a codeblock with `// @run` as the first line to render directly instead of as `pre`. 
  - javascript / glsl become `<script>`, html renders, etc. 
  - Attributes can be specified for scripts like `// @run id="foo" type="bar"`.
- optionally specify title and head block (e.g. custom styles or scripts outside of core post)
- All headers are automatically given an `id` of their contents lowercase and hyphenated for easy linking - which can be done in markdown like `[some text](#in-a-nutshell)`.

## Checkout an example

Blog Post (directly from a gist):

https://mdxish.com/jasonjmcghee/cba64163600fa90a3ea5d2ea099f3b55

(or you can drop the username https://mdxish.com/cba64163600fa90a3ea5d2ea099f3b55)

Source (click "Raw" to see the raw markdown):

https://gist.github.com/jasonjmcghee/cba64163600fa90a3ea5d2ea099f3b55

This is purely for demonstrative purposes - check the [examples](./examples) folder for more recent examples of posts build with mdxish.

# Installation

```bash
npm install -g mdxish
```

Or you can clone the repo and use `npm run`.

## Getting started

There are two main ways mdxish can be used.

1. Convert mdxish flavored markdown into static html locally (live or one-off) or in CI/CD.
2. Put a mdxish flavored markdown file called `index.md` in a gist, copy the gist id, and go to `https://mdxish.com/{gistId}`

For example:

```bash
mdxish convert examples/falling-sand.md
```

To launch a live server that will automatically keep HTML up to date with whatever you write in your mdxish flavored markdown:

```bash
mdxish live examples/falling-sand.md
```

Note: this approach completely reloads all html / scripts on any change. You can customize this behavior to do whatever you want with the newly rendered HTML. Here's how to specify [custom hot reload behavior](./TIPS.md#custom-hot-reload-behavior).

## Examples

Check the [examples](./examples) directory. The current best demonstration of capabilities is [naive-gi.md](./examples/naive-gi.md). I strongly recommend using an IDE to view the markdown, as opposed to GitHub's preview.

Wrote a blog with mdxish and want to share it? Awesome! Open a PR and we'll add it to the examples!


## Video Introduction (🔉 Sound on)

https://github.com/user-attachments/assets/cc416a37-5d33-4452-a5b2-7754e6932fad


## Interactive Blog Tips!

Have suggestions / tips about building interactive blogs?

Add them [here](./TIPS.md)!