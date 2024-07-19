---
title: Making a falling sand simulator
font: https://fonts.googleapis.com/css2?family=Roboto&display=swap
scripts:
  - https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/prism.min.js
  - https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/components/prism-javascript.min.js
  - https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.1/p5.js"
head: |
  <link rel="stylesheet" href="prism.css">
  <link rel="stylesheet" href="normalize.css">
  <link rel="stylesheet" href="main.css">
  <link rel="stylesheet" href="jason.css">
---

```javascript
// @run type="application/javascript"
// Our Library
window.darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
window.background = window.darkMode ? "#0d1014" : "#f6f6f6";

// Things we should do at the beginning of every draw call, for all steps
function before(p) {
  p.background(background);
}

// Things we should do at the end of every draw call, for all steps
function after(p) {
}

// Simplify with some boilerplate
function make(id, width, height, zoom, fn, webgl = false) {
  return new p5((p) => {
    p.isWEBGL = webgl;

    p.setup_ = () => {};
    p.setup = function () {
      // Disable context menu
      for (let element of document.getElementsByClassName("p5Canvas")) {
        element.addEventListener("contextmenu", (e) => e.preventDefault());
        element.addEventListener("touchstart", (e) => e.preventDefault());
        element.addEventListener("touchend", (e) => e.preventDefault());
        element.addEventListener("touchmove", (e) => e.preventDefault());
      }

      // 60 FPS
      p.frameRate(60);

      // Ignore pixel density (Hi-DPI)
      p.pixelDensity(1);

      // Zoom canvas
      const canvas = p.createCanvas(width, height, zoom, p.isWEBGL ? p.WEBGL : p.P2D);
      canvas.elt.style.width = `${canvas.width * zoom}px`;
      canvas.elt.style.height = `${canvas.height * zoom}px`;
      p.setup_();
      p.loadPixels();
      p.noCursor();
    };

    p.draw_ = () => {};
    p.update = () => {};

    p.onLeftClick = (x, y) => {};
    p.onRightClick = (x, y) => {};

    p.draw = function () {
      before(p);
      p.update();

      if (p.mouseActivated()) {
        if ((p.touches.length && p.touches.length < 2) || p.mouseButton === p.LEFT) {
          p.onLeftClick(p.getMousePixelX(), p.getMousePixelY());
        } else {
          p.onRightClick(p.getMousePixelX(), p.getMousePixelY());
        }
      }
      p.draw_();

      p.drawMouse();
      after(p);
    };

    p.mouseXInBounds = () => p.mouseX > 0 && p.mouseX < p.width - 1;
    p.mouseYInBounds = () => p.mouseY > 0 && p.mouseY < p.height - 1;
    p.mouseInBounds = () => p.mouseXInBounds() && p.mouseYInBounds();

    p.mouseActivated = () => (p.mouseIsPressed) && p.mouseInBounds();

    p.getMouseX = () => p.isWEBGL ? p.mouseX - p.width / 2 : p.constrain(p.mouseX, 0, p.width - 1);
    p.getMouseY = () => p.isWEBGL ? p.mouseY - p.height / 2 : p.constrain(p.mouseY, 0, p.height - 1);
    p.getMousePixelX = () => p.floor(p.getMouseX());
    p.getMousePixelY = () => p.floor(p.getMouseY());

    p.drawMouse = () => p.drawMousePixel(1, 1);

    p.drawMousePixel = (width, height) => {
      if (p.mouseInBounds()) {
        p.fill(SAND_COLOR);
        p.noStroke();
        p.rect(p.getMousePixelX(), p.getMousePixelY(), width, height);
      }
    }

    p.drawMouseCircle = (radius) => {
      if (p.mouseInBounds()) {
        p.fill(SAND_COLOR);
        p.noStroke();
        p.circle(p.getMousePixelX(), p.getMousePixelY(), 2 * radius);
      }
    }

    if (fn) {
      fn(p);
    }
  }, id);
}

// Draw a pixel - don't forget to update when done!
function setPixel(p, i, color) {
  const index = 4 * i;
  p.pixels[index] = p.red(color);
  p.pixels[index + 1] = p.green(color);
  p.pixels[index + 2] = p.blue(color);
  p.pixels[index + 3] = p.alpha(color);
}

// Add some lightness variation to the color
function varyColor(p, color) {
  let hue = p.floor(p.hue(color));
  let saturation = p.constrain(p.saturation(color) + p.floor(p.random(-20, 0)), 0, 100);
  let lightness = p.constrain(p.lightness(color) + p.floor(p.random(-10, 10)), 0, 100);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

class Grid {
  initialize(width, height) {
    this.width = width;
    this.height = height;
    this.grid = new Array(width * height).fill(0);
  }

  clear() {
    this.grid = new Array(this.width * this.height).fill(0);
  }

  set(x, y, color) {
    this.grid[y * this.width + x] = color;
  }

  swap(a, b) {
    const temp = this.grid[a];
    this.grid[a] = this.grid[b];
    this.grid[b] = temp;
  }

  isEmpty(index) {
    return this.grid[index] === 0;
  }

  setCircle(x, y, colorFn, radius = 2, probability = 1.0) {
    let radiusSq = radius * radius;
    for(let y1 = -radius; y1 <= radius; y1++) {
      for (let x1 = -radius; x1 <= radius; x1++) {
        if (x1 * x1 + y1 * y1 <= radiusSq && Math.random() < probability) {
          this.set(x + x1, y + y1, colorFn());
        }
      }
    }
  }
}

class Logic {
  logic(p, grid) {}
}

function makeLogic(logic, mapType) {
  return (p) => new logic().logic(p, new mapType());
}

window.SAND_COLOR = "#dcb159";
```

# Making a falling sand simulator

*This post is part of a series. Be sure to check the bottom of the article for the next post!*

Over the years there have been a number of projects focusing on building systems of particle materials that interact with one another. The first I saw was called "Powder Game", which had all kinds of features and was written in Java. More recently there has been [Sandspiel](https://sandspiel.club/) and an entire roguelike game (ignoring the [Berlin Interpretation](https://web.archive.org/web/20220416113035/http://www.roguebasin.com/index.php?title=Berlin_Interpretation) for a moment) built on the idea that the entire environment is made of particle materials similar to falling sand games, called [Noita](https://noitagame.com/) (which is pretty fantastic and you should give it a try!).

A fun exercise is implementing one of these falling material particle systems.

In this post, we'll just implement the most basic material, "sand".

This will be the final product for this post (drag around inside):

<div id="final"></div>

Let's get started!

## Drawing pixels to the screen

So first things first, we need a way to draw some pixels on the screen and keep track of their positions. Here we're using p5.js with a bit of abstraction to simplify things. If you want to implement this yourself, feel free to check the source code for all the details I'm skipping over. I'm hoping I gave enough here that you could pick up another engine and implement this without issue.

We can build a Grid class to represent our pixels with the functions we need to interact with it.

```javascript
class Grid {
  initialize(width, height) {
    this.width = width;
    this.height = height;
    this.grid = new Array(width * height).fill(0);
  }

  // Allow us to clear the canvas
  clear() {
    this.grid = new Array(this.width * this.height).fill(0);
  }

  // Allow us to set a specific particle
  set(x, y, color) {
    this.grid[y * this.width + x] = color;
  }

  // Allow us to swap two particles (or space)
  swap(a, b) {
    const temp = this.grid[a];
    this.grid[a] = this.grid[b];
    this.grid[b] = temp;
  }

  // Check if a particle exists in a space
  isEmpty(index) {
    return this.grid[index] === 0;
  }
}
```

Now we need a way to actually place particles on the screen. We'll assume there's a left-click method available, and use this to set that particle in our grid.

```javascript
p.onLeftClick = (x, y) => {
  // Vary the color slightly for aesthetics
  let color = varyColor(p, SAND_COLOR);
  grid.set(x, y, color);
};
```

We also added some variation to the color to make it feel a bit higher quality. All we're doing is adding some randomness to the saturation and lightness.

```javascript
function varyColor(p, color) {
  let hue = p.floor(p.hue(color));
  let saturation = p.saturation(color) + p.floor(p.random(-20, 0));
  saturation = p.constrain(saturation, 0, 100);
  let lightness = p.lightness(color) + p.floor(p.random(-10, 10));
  lightness = p.constrain(lightness, 0, 100);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
```

And now we can just iterate through the grid and set the corresponding pixels each loop of our draw call.

```javascript
// This happens every frame
this.grid.forEach((color, index) => {
  setPixel(p, index, color || background);
})
```

Nice, now we can click, drag, and draw some particles. It's not great, but it's something!
<div id="drawing"></div>
Awesome! Let's add gravity.

```javascript
// @run
class DrawingGrid extends Grid {
  draw(p) {
    this.grid.forEach((color, index) => {
      setPixel(p, index, color || background);
    })
    p.updatePixels();
  }
}

class DrawingLogic extends Logic {
  // Our main logic for this step!
  logic(p, grid) {
    p.setup_ = () => {
      grid.initialize(p.width, p.height);
      grid.setCircle(10, 10, () => varyColor(p, SAND_COLOR));
    };

    p.onLeftClick = (x, y) => {
      // Vary the color slightly for aesthetics
      let color = varyColor(p, SAND_COLOR);
      grid.set(x, y, color);
    };

    p.onRightClick = () => grid.clear();

    p.draw_ = () => grid.draw(p);
  }
}

make('drawing', 40, 20, 8, makeLogic(DrawingLogic, DrawingGrid));
```

## Adding gravity

Before we implement our first rule, it's worth stating explicitly that all rules will be applied once per frame. This gives all particles equal opportunity to fulfill their rule, before another particle gets to apply their rule a second time.
Our first rule: *gravity*.

The rule is as follows: if the space below a particle is empty, swap it with the empty space.

```javascript
updatePixel(i) {
  const below = i + this.width;
  // If there are no pixels below, move it down.
  if (this.isEmpty(below)) {
    this.swap(i, below)
  }
}

update() {
  // Go through each pixel one by one and apply the rule
  for (let i = 0; i < this.grid.length - this.width - 1; i++) {
    this.updatePixel(i);
  }
}
```

Try drawing a bit on the canvas!

<div id="falling-1"></div>

Hm... Something isn't working quite right! We don't actually see the particles falling! They just instantly appear.

Let's take a crack at fixing that!

```javascript
// @run
class FallingGrid extends DrawingGrid {
  updatePixel(i) {
    const below = i + this.width;
    // If there are no pixels below, move it down.
    if (this.isEmpty(below)) {
      this.swap(i, below)
    }
  }
  // Draw from the beginning of the list to the end
  update() {
    for (let i = 0; i < this.grid.length - this.width - 1; i++) {
      this.updatePixel(i);
    }
  }
}

// Our main logic for this step!
class FallingLogic extends DrawingLogic {
  logic(p, grid) {
    super.logic(p, grid);
    p.update = () => grid.update();
  }
}

make('falling-1', 40, 20, 8, makeLogic(FallingLogic, FallingGrid));
```

## Fixing gravity

What's going on here?

Well, if we take another look at our update method and what one pixel is doing, we'll realize: we're starting from the first pixel, and if it can fall, it swaps with the pixel below it. That means, we'll actually see that pixel again later and apply its rule again! This means, in a single pass of the list of particles, a particle could get to the bottom of the screen!

Fortunately, it's an easy fix - we just start from the end!

```javascript
update() {
  // Draw from the end of the list to the beginning
  for (let i = this.grid.length - this.width - 1; i > 0; i--) {
    this.updatePixel(i);
  }
}
```

Trying drawing again - you should see the particles falling now!

<div id="falling-2"></div>

Can we always iterate from back to front? (What if our particle was smoke?)

Our sand doesn't really look like sand still - it's making little towers, which is neat, but not what we want.

It's time for rule #2!

```javascript
// @run
class FallingGrid2 extends FallingGrid {
  // Draw from the end of the list to the beginning
  update() {
    for (let i = this.grid.length - this.width - 1; i > 0; i--) {
      this.updatePixel(i);
    }
  }
}

make('falling-2', 40, 20, 8,  makeLogic(FallingLogic, FallingGrid2));
```

## Settling behavior

Consider the way sand behaves. It doesn't just fall straight down - it'll roll to the side and down if there's space to. We need to integrate this into our system.

We need to check not only directly below, but below and to the left, and below and to the right.

```javascript
updatePixel(i) {
  // Get the indices of the pixels directly below
  const below = i + this.width;
  const belowLeft = below - 1;
  const belowRight = below + 1;

  // If there are no pixels below, including diagonals, move it accordingly.
  if (this.isEmpty(below)) {
    this.swap(i, below);
  } else if (this.isEmpty(belowLeft)) {
    this.swap(i, belowLeft);
  } else if (this.isEmpty(belowRight)) {
    this.swap(i, belowRight);
  }
}
```

If we try drawing on the canvas, we can see that the sand properly settles now, instead of making little towers!

<div id="settling-1"></div>

How might this rule differ for some other materials - like water or smoke?

```javascript
// @run
class SettlingGrid extends FallingGrid2 {
  updatePixel(i) {
    const below = i + this.width;
    const belowLeft = below - 1;
    const belowRight = below + 1;

    // If there are no pixels below, including diagonals, move it accordingly.
    if (this.isEmpty(below)) {
      this.swap(i, below);
    } else if (this.isEmpty(belowLeft)) {
      this.swap(i, belowLeft);
    } else if (this.isEmpty(belowRight)) {
      this.swap(i, belowRight);
    }
  }
}

class SettlingLogic extends FallingLogic {
  logic(p, grid) {
    super.logic(p, grid);
    p.setup_ = () => {
      grid.initialize(p.width, p.height);
      grid.setCircle(10, 10, () => varyColor(p, SAND_COLOR), 4);
    };
  }
}

make('settling-1', 40, 20, 8, makeLogic(SettlingLogic, SettlingGrid))
```

## Some final polish
We're just about done! But let's add some final touches.

We can improve the experience of adding sand by drawing a filled circle, instead of a single granule, when we interact with the canvas. We can make it feel even a bit more natural by aerating it a bit- that is, only drawing each granule with some probability.

```javascript
p.onLeftClick = (x, y) => {
  grid.setCircle(
      x,
      y,
      () => varyColor(p, SAND_COLOR), // Color
      2, // Radius
      0.5 // Probability
  );
};
```

And we've arrived at the same canvas that we saw at the very beginning!

<div id="settling-2"></div>

```javascript
// @run
class SettlingLogic2 extends SettlingLogic {
  logic(p, grid) {
    super.logic(p, grid);
    p.setup_ = () => {
      grid.initialize(p.width, p.height);
      grid.setCircle(20, 20, () => varyColor(p, SAND_COLOR), 6, 0.5);
    };
    p.onLeftClick = (x, y) => {
      grid.setCircle(x, y, () => varyColor(p, SAND_COLOR), 2, 0.5);
    };
    p.drawMouse = () => p.drawMouseCircle(2);
  }
}

make('settling-2', 80, 40, 4, makeLogic(SettlingLogic2, SettlingGrid));
make('final', 80, 40, 4, makeLogic(SettlingLogic2, SettlingGrid));
```

That's it for now! If this was interesting, feel free to reach out to me! I'm considering making this a series, highlighting different materials and the emergent behavior that can arise. Another aspect is performance. Our current approach will not scale very well, but there are both lower-level approaches and tricks we can use to improve it!

(2022-05-15) Check out the next post in the series, [Improving the foundation of our falling sand simulator](https://jason.today/falling-improved)!