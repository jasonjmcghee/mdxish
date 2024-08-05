---
title: "Building Real-Time Global Illumination: Part 1"
scripts:
  - https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js
head: '
  <meta name="description" content="Building Real-Time Global Illumination: Part 1">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <meta property="og:title" content="Building Real-Time Global Illumination: Part 1">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://jason.today/gi">
  <meta property="og:image" content="https://jason.today/img/gi.png">

  <link rel="stylesheet" href="../css/prism.css">
  <link rel="stylesheet" href="../css/normalize.css">
  <link rel="stylesheet" href="../css/main.css">
  <link rel="stylesheet" href="../css/jason-v2.css">
  <script src="../js/three.js"></script>
  <script src="../js/prism.js"></script>
  <style>
  button { border: none; cursor: pointer; }
  .color { max-width: 20px; width: 20px; height: 20px; position: relative; }
  .iconButton {
    margin-left: -1px;
    padding: 0;
    width: 24px;
    height: 24px;
    padding-bottom: 2px;
  }
  a { cursor: pointer; }
  .arrow {
    border: none;
    position: absolute; 
    top: 0;
    left: -18px;
    color: black;
    cursor: auto;
  }
  .hidden { display: none; }
  @media (prefers-color-scheme: dark) {
    .arrow {
      color: white;
    }
  }
  .color-palette {
    display: flex; 
    flex-direction: column; 
    border: solid 1px black; 
    margin: 1px;
  }
  @media (prefers-color-scheme: dark) {
    .color-palette {
      border: solid 1px white;
    }
  }
  </style>
'
---

[//]: # (Note to markdown source readers - I tend to put a bunch of code up front - Just scroll down to the first `#` for the title / start of the post. Also, if you want syntax highlighting, go download `prism.js` from the https://github.com/jasonjmcghee/mdxish repo)

```glsl
// @run id="vertex-shader" type="x-shader/x-vertex"
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

```javascript
// @run
const isMobile = (() => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
})();

const vertexShader = document.querySelector("#vertex-shader").innerHTML;

const resetSvg = `<svg  xmlns="http://www.w3.org/2000/svg"  width="16"  height="16"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="1"  stroke-linecap="round"  stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></svg>`;

const clearSvg = `<svg  xmlns="http://www.w3.org/2000/svg"  width="16"  height="16"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="1"  stroke-linecap="round"  stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M19 20h-10.5l-4.21 -4.3a1 1 0 0 1 0 -1.41l10 -10a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41l-9.2 9.3" /><path d="M18 13.3l-6.3 -6.3" /></svg>`;

const sunMoonSvg = `<svg  xmlns="http://www.w3.org/2000/svg"  width="16"  height="16"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="1"  stroke-linecap="round"  stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9.173 14.83a4 4 0 1 1 5.657 -5.657" /><path d="M11.294 12.707l.174 .247a7.5 7.5 0 0 0 8.845 2.492a9 9 0 0 1 -14.671 2.914" /><path d="M3 12h1" /><path d="M12 3v1" /><path d="M5.6 5.6l.7 .7" /><path d="M3 21l18 -18" /></svg>`

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// This is the html plumbing / structure / controls for little canvases
function intializeCanvas({
 id, canvas, onSetColor, startDrawing, onMouseMove, stopDrawing, clear, reset, toggleSun
}) {
  const clearDom = clear ? `<button id="${id}-clear" class="iconButton">${clearSvg}</button>` : "";
  const resetDom = reset ? `<button id="${id}-reset" class="iconButton">${resetSvg}</button>` : "";
  const sunMoonDom = toggleSun ? `<button id="${id}-sun" class="iconButton">${sunMoonSvg}</button>` : "";
  const thisId = document.querySelector(`#${id}`);
  thisId.innerHTML = `
  <div style="display: flex; gap: 20px;">
    <div id="${id}-canvas-container"></div>
    
    <div style="display: flex; flex-direction: column; justify-content: space-between;">
        <div id="${id}-color-picker" class="color-palette">
          <input type="color" id="${id}-color-input" value="#eb6b6f" style="display: none; width: 0px;" >
          <button id="${id}-color-3" class="color" style="background-color: #fff6d3;"><span class="arrow">&#9654;</span></button>
          <button id="${id}-color-2" class="color" style="background-color: #f9a875;"><span class="arrow hidden">&#9654;</span></button>
          <button id="${id}-color-1" class="color" style="background-color: #eb6b6f;"><span class="arrow hidden">&#9654;</span></button>
          <button id="${id}-color-0" class="color" style="background-color: #7c3f58;"><span class="arrow hidden">&#9654;</span></button>
          <button id="${id}-color-4" class="color" style="background-color: #000000; color: white;"><span class="arrow hidden">&#9654;</span></button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 2px">
      ${sunMoonDom}
      ${clearDom}
      ${resetDom}
      </div>
    </div>
</div>`;
  const colorInput = thisId.querySelector(`#${id}-color-input`);

  function setColor(r, g, b) {
    colorInput.value = rgbToHex(r, g, b);
    onSetColor({r, g, b});
  }

  function setHex(hex) {
    const rgb = hexToRgb(hex);
    setColor(rgb.r, rgb.g, rgb.b);
    const stringifiedColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    thisId.querySelectorAll(".arrow").forEach((node) => {
      if (node.parentNode.style.backgroundColor === stringifiedColor) {
        node.className = "arrow";
      } else {
        node.className = "arrow hidden";
      }
    });
  }

  function updateColor(event) {
    const hex = event.target.value;
    setHex(hex);
  }

  colorInput.addEventListener('input', updateColor);

  ["#7c3f58", "#eb6b6f", "#f9a875", "#fff6d3", "#000000"].forEach((color, i) => {
    const colorSelector = thisId.querySelector(`#${id}-color-${i}`);
    colorSelector.addEventListener('click', () => {
      colorSelector.parentNode.querySelectorAll(".arrow").forEach((node) => {
        node.className = "arrow hidden";
      });
      colorSelector.querySelector(".arrow").className = "arrow";
      setHex(color);
    });
  });
  const container = document.querySelector(`#${id}-canvas-container`);
  container.appendChild(canvas);

  canvas.addEventListener('touchstart', startDrawing);
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('touchmove', onMouseMove);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('touchend', stopDrawing);
  canvas.addEventListener('touchcancel', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  if (clear) {
    document.querySelector(`#${id}-clear`).addEventListener("click", () => {
      clear();
    });
  }

  if (reset) {
    document.querySelector(`#${id}-reset`).addEventListener("click", () => {
      reset();
    });
  }

  if (toggleSun) {
    document.querySelector(`#${id}-sun`).addEventListener("click", () => {
      toggleSun();
    });
  }

  return {container, setHex};
}

// This is the JS side that connects our canvas to three.js, and adds drawing on mobile
// Also deals with interaction (mouse / touch) logic
class PaintableCanvas {
  constructor({width, height, initialColor = 'transparent', radius = 6, friction = 0.1}) {
    [this.canvas, this.context] = this.createCanvas(width, height, initialColor);
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.setupTexture(this.texture);

    this.isDrawing = false;
    this.lastPoint = null;
    this.currentPoint = null;
    this.mouseMoved = false;
    this.currentColor = {r: 255, g: 255, b: 255};
    this.RADIUS = radius;
    this.FRICTION = friction;
    this.width = width;
    this.height = height;

    this.initialColor = initialColor;

    if (this.useFallbackCanvas()) {
      this.currentImageData = new ImageData(this.canvas.width, this.canvas.height);
    }
    this.onUpdateTextures = () => {
    };

    this.drawSmoothLine = (from, to) => {
      throw new Error("Missing implementation");
    }
  }
  
  useFallbackCanvas() {
    return false;
  }

  // Mobile breaks in all kinds of ways
  // Drawing on cpu fixes most of the issues
  drawSmoothLineFallback(from, to) {
    this.drawLine(from, to, this.currentColor, this.context);
    this.updateTexture();
  }

  drawLine(from, to, color, context) {
    const radius = this.RADIUS;

    // Ensure we're within canvas boundaries
    const left = 0;
    const top = 0;
    const right = context.canvas.width - 1;
    const bottom = context.canvas.height - 1;

    let width = right - left + 1;
    let height = bottom - top + 1;

    let imageData = this.currentImageData;
    let data = imageData.data;

    // Bresenham's line algorithm
    let x0 = Math.round(from.x - left);
    let y0 = Math.round(from.y - top);
    let x1 = Math.round(to.x - left);
    let y1 = Math.round(to.y - top);

    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = (x0 < x1) ? 1 : -1;
    let sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    while (true) {
      // Draw the pixel and its surrounding pixels
      this.drawCircle(x0, y0, color, radius);

      if (x0 === x1 && y0 === y1) break;
      let e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }

    // Put the modified image data back to the canvas
    context.putImageData(imageData, left, top);
  }

  drawCircle(x0, y0, color, radius) {
    for (let ry = -radius; ry <= radius; ry++) {
      for (let rx = -radius; rx <= radius; rx++) {
        if (rx * rx + ry * ry <= radius * radius) {
          let x = x0 + rx;
          let y = y0 + ry;
          if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.setPixel(x, y, color);
          }
        }
      }
    }
  }

  setPixel(x, y, color) {
    let index = (y * this.width + x) * 4;
    this.currentImageData.data[index] = color.r;     // Red
    this.currentImageData.data[index + 1] = color.g; // Green
    this.currentImageData.data[index + 2] = color.b; // Blue
    this.currentImageData.data[index + 3] = 255.0;   // Alpha
  }

  createCanvas(width, height, initialColor) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.fillStyle = initialColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return [canvas, context];
  }

  setupTexture(texture) {
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.format = THREE.RGBAFormat;
    texture.type = THREE.FloatType,
      texture.wrapS = THREE.ClampToEdgeWrapping,
      texture.wrapT = THREE.ClampToEdgeWrapping
  }

  updateTexture() {
    this.texture.needsUpdate = true;
    this.onUpdateTextures();
  }

  startDrawing(e) {
    this.isDrawing = true;
    this.currentMousePosition = this.lastPoint = this.currentPoint = this.getMousePos(e);
    try {
      this.onMouseMove(e);
    } catch(e) {
      console.error(e);
    }
    this.mouseMoved = false;
  }

  stopDrawing(e) {
    const wasDrawing = this.isDrawing;
    if (!wasDrawing) {
      return false;
    }
    if (!this.mouseMoved) {
      this.drawSmoothLine(this.currentPoint, this.currentPoint);
    } else {
      try {
        this.onMouseMove(e);
      } catch(e) {
        console.error(e);
      }
    }
    this.isDrawing = false;
    this.mouseMoved = false;
    return true;
  }

  onMouseMove(event) {
    if (!this.isDrawing) return false;
    this.mouseMoved = true;

    this.currentMousePosition = this.getMousePos(event);
    this.doDraw();
    
    return true;
  }
  
  doDraw() {
    const newPoint = this.currentMousePosition;

    // Some smoothing...
    let dist = this.distance(this.currentPoint, newPoint);

    if (dist > 0) {
      let dir = {
        x: (newPoint.x - this.currentPoint.x) / dist,
        y: (newPoint.y - this.currentPoint.y) / dist
      };
      let len = Math.max(dist - this.RADIUS, 0);
      let ease = 1 - Math.pow(this.FRICTION, 1 / 60 * 10);
      this.currentPoint = {
        x: this.currentPoint.x + dir.x * len * ease,
        y: this.currentPoint.y + dir.y * len * ease
      };
    } else {
      this.currentPoint = newPoint;
    }

    this.drawSmoothLine(this.lastPoint, this.currentPoint);
    this.lastPoint = this.currentPoint;
  }

  // I'll be honest - not sure why I can't just use `clientX` and `clientY`
  // Must have made a weird mistake somewhere.
  getMousePos(e) {
    e.preventDefault();

    if (e.touches) {
      return {
        x: e.touches[0].clientX - e.touches[0].target.offsetLeft + window.scrollX,
        y: e.touches[0].clientY - e.touches[0].target.offsetTop + window.scrollY
      };
    }

    return {
      x: e.clientX - e.target.offsetLeft + window.scrollX,
      y: e.clientY - e.target.offsetTop + window.scrollY
    };
  }

  distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  setColor(r, g, b) {
    this.currentColor = {r, g, b};
  }

  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.currentImageData = new ImageData(this.canvas.width, this.canvas.height);
    this.updateTexture();
  }
}

function threeJSInit(width, height, materialProperties, renderer = null, renderTargetOverrides = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({antialiasing: false});
  }
  renderer.setSize(width, height);
  const renderTargetA = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    ...renderTargetOverrides,
  });
  const renderTargetB = renderTargetA.clone();

  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    ...materialProperties,
  });
  plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  return {
    plane,
    canvas: renderer.domElement,
    render: () => {
      renderer.render(scene, camera)
    },
    renderTargets: [renderTargetA, renderTargetB],
    renderer
  }
}
```

```javascript
// @run
// Let's instrument the post with this so we can disable animations while editing.
const disableAnimation = false;
// Draw animations very fast, with a huge loss in accuracy (for testing)
const instantMode = false;
const getFrame = disableAnimation
  ? (fn) => { fn() }
  : requestAnimationFrame;
let rayCount = 32.0;
```

<a href="https://jason.today">jason.today</a>

[//]: # (Start of the actual post!)

# Building Real-Time Global Illumination: Part 1

This is what we will build in **this post**.

Drag around inside. <a id="performance-issues"></a>

Colors on the right - try toggling the sun!

<br />

```html
// @run
<div id="final"></div>
```

<br />

[//]: # (This div isn't rendered until the very end of the post - check there for the code.)

_I'll be using three.js for this post and **everything** we discuss is written from scratch and entirely contained in the post / html. I wrote this with [mdxish](https://github.com/jasonjmcghee/mdxish), so you can read this post [in markdown](https://gist.github.com/jasonjmcghee/e78bc62874059d64ac9592b6b9e01bb2) as well, where all executed code is broken into grokable javascript markdown codeblocks. This post supports desktop and mobile._

Global illumination is about how light interacts with surfaces. When you turn a light on in your room at night, it's not a small glowing orb. It spreads to the walls, the floor, and the ceiling, breathing life into the room. Desks, doors, and objects cast shadows, softening as they stretch away.

Simulating these interactions can make for some beautiful scenes - as we're more closely mimicking real life. Think Pixar, beautiful blender renders, and [hyper-realistic voxel scenes](https://ephtracy.github.io). But historically, it required powerful hardware, time, and/or aesthetic compromises - like noise. There are some fantastic tutorials on various techniques, such as [ray tracing (video)](https://www.youtube.com/watch?v=Qz0KTGYJtUk), which can be used to simulate realistic lighting- but, not in real-time.

Over the last six months or so (at time of writing), a group of folks have been working hard on a new technique that enables real-time global illumination on consumer hardware, without the standard compromises. It's called [Radiance Cascades](https://drive.google.com/file/d/1L6v1_7HY2X-LV3Ofb6oyTIxgEaP4LOI6/view). A fast, noiseless approach to global illumination.

And that's what we _will_ (next post) be building, but doing so requires a foundation of code and conceptual understanding. So we're going to build up our repertoire and knowledge and first build "naive" global illumination. Next time, we'll effectively get the same end result, but much higher resolution and much more efficient.

Let's get started!

### A drawable surface

If we're going to be messing around with lights and shadows, it's incredibly useful to be able to quickly and easily draw on the screen. We'll use it to test things out, understand limitations and issues, and build intuition around the algorithms and techniques we're going to use. If you are anxious to get to the global illumination part of this post, feel free to [jump straight to raymarching](#raymarching).

In general, to get this kind of interface, we just need to place some pixels on the screen in a group and interpolate from the previously drawn point, in case the brush moved within the last frame and is still drawing.

On the GPU side, we can do what we want using an SDF line segment. 

As this is our first shader in the post - this is a fragment shader. The code it executes individually on every pixel. To draw a line (or any shape) you describe it in terms of distance away from the pixel currently being processed by the GPU. `p` here is the position of the pixel in coordinate space, meaning, if it's `vec2(20.0, 20.0)` it's intuitively 20 pixels towards height, and 20 pixels towards width. This is unlike `uv` - more on that in a sec.

What we need to do to represent a line with width (in this case, radius) is describe the distance from our pixel position, to the nearest point on the line, and if that's less than half the width (or `radius` here) set the pixel to be the chosen color.

```glsl
// Draw a line shape!
float sdfLineSquared(vec2 p, vec2 from, vec2 to) {
  vec2 toStart = p - from;
  vec2 line = to - from;
  float lineLengthSquared = dot(line, line);
  float t = clamp(dot(toStart, line) / lineLengthSquared, 0.0, 1.0);
  vec2 closestVector = toStart - line * t;
  return dot(closestVector, closestVector);
}
```

If you've never heard about SDFs (signed distance functions) you can [read about them on Inigo Quilez's blog](https://iquilezles.org/articles/distfunctions2d/) and / or read the section on .
[drawing shapes on the GPU](https://thebookofshaders.com/07/) in the Book of Shaders.

And I know, you're probably saying - but there are no calls to `distance` or `length` - what gives? This doesn't look like the examples. But a neat trick is that we can avoid a `sqrt`, if we use `dot` and keep everything we're comparing squared. To clarify, `distance(a, b)` == `length(a - b)` == `sqrt(dot(a - b, a - b))`. So if we're comparing to `radius` - we can instead just pass in `radius * radius` and not need `sqrt`. (`sqrt` is expensive).

At this point, we can draw our line. _You can also check out how I did the CPU / mobile version of drawing in the source code._

```glsl
void main() {
  vec4 current = texture(inputTexture, vUv);
  // If we aren't actively drawing (or on mobile) no-op!
  if (drawing) {
    vec2 coord = vUv * resolution;
    if (sdfLineSquared(coord, from, to) <= radiusSquared) {
      current = vec4(color, 1.0);
    }
  }
  gl_FragColor = current;
}
```

Any time you see `uv` (or `vUv`), it is the position of the current pixel, but on a scale of 0-1 in both dimensions. So `vec2(0.5, 0.5)` is always the center of the texture. You can pass in the size of the texture as a `uniform` if you want to be able to convert to pixel-space, which we do here.

_ThreeJS uses `vUv`. I believe that first `v` is for [`varying` keyword](https://jameshfisher.com/2017/10/19/glsl-varying/)._

If you want to add some extra polish you can make it feel a bit smoother / paintier by adding easing. Check the source to see how I did it! Spoiler: I cheated and did it on the CPU.

Whichever engine you're using, be it a game engine, webgl, p5.js, three.js, webgpu, (and most others), there will be a way to say, "draw this rgb value at this location", and then it's just expanding that to a radius, from one point to another - or using SDFs as shown above.

And after skimming over some details that aren't the focus of this post, we've got our drawable surface!

<br />

<div id="simpleSurface"></div>

```javascript
// @run
class BaseSurface {
  constructor({ id, width, height, radius = 5 }) {
    // Create PaintableCanvas instances
    this.createSurface(width, height, radius);
    this.width = width;
    this.height = height;
    this.id = id;
    this.initialized = false;
    this.initialize();
  }
  
  createSurface(width, height, radius) {
    this.surface = new PaintableCanvas({ width, height, radius });
  }

  initialize() {
    // Child class should fill this out
  }

  load() {
    // Child class should fill this out
  }

  clear() {
    // Child class should fill this out
  }

  renderPass() {
    // Child class should fill this out
  }

  reset() {
    this.clear();
    this.setHex("#fff6d3");
    new Promise((resolve) => {
      getFrame(() => this.draw(0.0, null, resolve));
    });
  }

  draw(t, last, resolve) {
    if (t >= 10.0) {
      resolve();
      return;
    }

    const angle = (t * 0.05) * Math.PI * 2;

    const {x, y} = {
      x: 100 + 100 * Math.sin(angle + 0.25) * Math.cos(angle * 0.15),
      y: 50 + 100 * Math.sin(angle * 0.7)
    };

    last ??= {x, y};

    this.surface.drawSmoothLine(last, {x, y});
    last = {x, y};

    const step = instantMode ? 5.0 : 0.2;
    getFrame(() => this.draw(t + step, last, resolve));
  }

  buildCanvas() {
    return intializeCanvas({
      id: this.id,
      canvas: this.canvas,
      onSetColor: ({r, g, b}) => {
        this.surface.currentColor = {r, g, b};
        this.plane.material.uniforms.color.value = new THREE.Color(
          this.surface.currentColor.r / 255.0,
          this.surface.currentColor.g / 255.0,
          this.surface.currentColor.b / 255.0
        );
      },
      startDrawing: (e) => this.surface.startDrawing(e),
      onMouseMove: (e) => this.surface.onMouseMove(e),
      stopDrawing: (e) => this.surface.stopDrawing(e),
      clear: () => this.clear(),
      reset: () => this.reset(),
      ...this.canvasModifications()
    });
  }

  canvasModifications() {
    return {}
  }

  observe() {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting === true) {
        this.load();
        observer.disconnect(this.container);
      }
    });

    observer.observe(this.container);
  }

  initThreeJS({ uniforms, fragmentShader, renderTargetOverrides }) {
    return threeJSInit(this.width, this.height, {
      uniforms,
      fragmentShader,
      vertexShader,
      transparent: false,
    }, this.renderer, renderTargetOverrides ?? {}, this.surface)
  }
}

class Drawing extends BaseSurface {
  initializeSmoothSurface() {
    const props = this.initThreeJS({
      uniforms: {
        inputTexture: { value: this.surface.texture },
        color: {value: new THREE.Color(1, 1, 1)},
        from: {value: new THREE.Vector2(0, 0)},
        to: {value: new THREE.Vector2(0, 0)},
        radiusSquared: {value: Math.pow(this.surface.RADIUS, 2.0)},
        resolution: {value: new THREE.Vector2(this.width, this.height)},
        drawing: { value: false },
      },
      fragmentShader: `
uniform sampler2D inputTexture;
uniform vec3 color;
uniform vec2 from;
uniform vec2 to;
uniform float radiusSquared;
uniform vec2 resolution;
uniform bool drawing;
varying vec2 vUv;

float sdfLineSquared(vec2 p, vec2 from, vec2 to) {
vec2 toStart = p - from;
vec2 line = to - from;
float lineLengthSquared = dot(line, line);
float t = clamp(dot(toStart, line) / lineLengthSquared, 0.0, 1.0);
vec2 closestVector = toStart - line * t;
return dot(closestVector, closestVector);
}

void main() {
vec4 current = texture(inputTexture, vUv);
if (drawing) {
  vec2 coord = vUv * resolution;
  if (sdfLineSquared(coord, from, to) <= radiusSquared) {
    current = vec4(color, 1.0);
  }
}
gl_FragColor = current;
}`,
    });

    if (this.surface.useFallbackCanvas()) {
      this.surface.drawSmoothLine = (from, to) => {
        this.surface.drawSmoothLineFallback(from, to);
      }
      this.surface.onUpdateTextures = () => {
        this.renderPass();
      }
    } else {
      this.surface.drawSmoothLine = (from, to) => {
        props.plane.material.uniforms.drawing.value = true;
        props.plane.material.uniforms.from.value = { 
          ...from, y: this.height - from.y 
        };
        props.plane.material.uniforms.to.value = {
          ...to, y: this.height - to.y
        };
        this.renderPass();
        props.plane.material.uniforms.drawing.value = false;
      }
    }

    return props;
  }

  clear() {
    if (this.surface.useFallbackCanvas()) {
      this.surface.clear();
      return;
    }
    if (this.initialized) {
      this.renderTargets.forEach((target) => {
        this.renderer.setRenderTarget(target);
        this.renderer.clearColor();
      });
    }
    this.renderer.setRenderTarget(null);
    this.renderer.clearColor();
  }

  initialize() {
    const {
      plane, canvas, render, renderer, renderTargets
    } = this.initializeSmoothSurface();
    this.canvas = canvas;
    this.plane = plane;
    this.render = render;
    this.renderer = renderer;
    this.renderTargets = renderTargets;
    const { container, setHex } = this.buildCanvas();
    this.container = container;
    this.setHex = setHex;
    this.renderIndex = 0;

    this.innerInitialize();
    
    this.observe();
  }

  innerInitialize() {

  }

  load() {
    this.reset();
    this.initialized = true;
  }

  drawPass() {
    if (this.surface.useFallbackCanvas()) {
      return this.surface.texture;
    } else {
      this.plane.material.uniforms.inputTexture.value = this.renderTargets[this.renderIndex].texture;
      this.renderIndex = 1 - this.renderIndex;
      this.renderer.setRenderTarget(this.renderTargets[this.renderIndex]);
      this.render();
      return this.renderTargets[this.renderIndex].texture;
    }
  }

  renderPass() {
    this.drawPass()
    this.renderer.setRenderTarget(null);
    this.render();
  }
}

const simpleSurface = new Drawing({ id: "simpleSurface", width: 300, height: 300 });
```

<br />

If you're interested in the plumbing, inspect this node in the browser, or go to this section in [the markdown](https://gist.github.com/jasonjmcghee/e78bc62874059d64ac9592b6b9e01bb2)! Right above this dom is where the code that runs, lives.

### Raymarching

At its core, global illumination is going through a scene, looking around at nearby lights, and adjusting how bright that area is based on what we see. But _how_ you do that makes all the difference.

So we're going to start with a naive approach, but the core logic ends up being nearly identical to dramatically more efficient approaches, so we're not wasting time building it. It's called [raymarching](https://michaelwalczyk.com/blog-ray-marching.html). _Link contains spoilers!_

Remember when ten seconds ago I said global illumination is going through a scene and looking around at nearby lights to determine your "[radiance](https://en.wikipedia.org/wiki/Radiance)"? Let's try it out by telling the GPU (for every pixel) to walk in a handful of directions for a larger handful of steps and to average the colors of anything it hits - and to stop walking if it hits something.

Before we proceed, let's define a quick bounds check function we'll use.

```glsl
bool outOfBounds(vec2 uv) {
  return uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0;
}
```

Ok, let's walk through what we just said above, but with glsl.

```glsl
vec4 raymarch() {
```

So first we query our drawn texture. If it's something we drew, there's no need to process this pixel, as it can't receive light. If we were doing [subsurface scattering](https://en.wikipedia.org/wiki/Subsurface_scattering), or reflective or transparent materials, we _would_ need to process them, as they would interact with light.

```glsl
vec4 light = texture(sceneTexture, vUv);

if (light.a > 0.1) {
  return light;
}
```

Now we know we're only dealing with pixels that can receive light. We'll declare two variables. `oneOverRayCount` which we'll use to take the average of all light we see. And `tauOverRayCount` which tells us how much of an angle there is between our rays - which are equally spaced in a circle around the pixel.

We'll also get a random number between 0-1 based on our pixel location. We'll use it to slightly offset the angle of each ray (the random offset is seeded based on our position), so that rays don't all line up across pixels. That means no repeating patterns! 

_If Radiance Cascades didn't exist, I'd probably bring up [blue noise](https://interplayoflight.wordpress.com/2022/03/26/raytraced-global-illumination-denoising/), but the goal is not using noise at all - so any old noise is fine for our purposes._

Finally, we have some `radiance` that we'll add to, if we hit something.

```glsl
float oneOverRayCount = 1.0 / float(rayCount);
float tauOverRayCount = TAU * oneOverRayCount;

// Distinct random value for every pixel
float noise = rand(vUv);

vec4 radiance = vec4(0.0);
```

Now we get to start firing rays!

```glsl
for(int i = 0; i < rayCount; i++) {
```

<p id="for-every-ray">For every ray, calculate the direction to head, and start walking.</p>

Since we know our current position is empty, we can take our first step.
  
```glsl
float angle = tauOverRayCount + (float(i) + noise);
vec2 rayDirectionUv = vec2(cos(angle), -sin(angle)) / size;

// Our current position, plus one step.
vec2 sampleUv = vUv + rayDirectionUv;

for (int step = 0; step < maxSteps; step++) {
```

Now, for every step we take, if we walk out of bounds (or hit `maxSteps`), we're done.

```glsl
if (outOfBounds(sampleUv)) break;
```

If we hit something, collect the radiance, and stop walking. Otherwise, take another step.

```glsl
vec4 sampleLight = texture(sceneTexture, sampleUv);
if (sampleLight.a > 0.1) {
  radiance += sampleLight;
  break;
}

sampleUv += rayDirectionUv;
```

If we hit an end condition, return our collected radiance, averaged over all directions we walked / rays we fired!

```glsl
      }
  }
  return radiance * oneOverRayCount;
}
```

And that's it!

Now we can tweak the code a bit (see source to see how) in order to provide controls over it. This way we can build some intuition around why we did what we did.

```html
// @run
<br />

<div style="display: flex; align-items: center; gap: 4px">
<input type="checkbox" id="noise-raymarch" checked>
<label for="noise-raymarch">Enable Noise</label>
</div>
```

Checkout what happens when we turn off the noise!

```html
// @run
<div style="display: flex; align-items: center; gap: 4px">
<input type="checkbox" id="accumulate-radiance" checked>
<label for="accumulate-radiance">Accumulate Radiance</label>
</div>
```

Checkout what happens when we don't accumulate radiance to see the rays traveling.

```html
// @run
<br />

<div style="display: flex; align-items: center; gap: 8px">
Max Raymarch Steps
<input id="raymarch-steps-slider" class="slider" type="range" min="0" max="512" step="1" value="128" />
</div>
```

<br />

Don't forget you can draw.

```html
// @run
<div id="naive-raymarch"></div>
```

```glsl
// @run id="naive-raymarch-shader" type="x-shader/x-fragment"
uniform sampler2D sceneTexture;
uniform int rayCount;
uniform int maxSteps;
uniform bool showNoise;
uniform bool accumRadiance;
uniform vec2 size;

in vec2 vUv;

const float PI = 3.14159265;
const float TAU = 2.0 * PI;

float rand(vec2 co) {
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec4 raymarch() {
    vec4 light = texture(sceneTexture, vUv);

    if (light.a > 0.1) {
        return light;
    }

    float oneOverRayCount = 1.0 / float(rayCount);
    float tauOverRayCount = TAU * oneOverRayCount;

    // Different noise every pixel
    float noise = showNoise ? rand(vUv) : 0.1;

    vec4 radiance = vec4(0.0);

    // Shoot rays in "rayCount" directions, equally spaced, with some randomness.
    for(int i = 0; i < rayCount; i++) {
        float angle = tauOverRayCount + (float(i) + noise);
        vec2 rayDirectionUv = vec2(cos(angle), -sin(angle)) / size;
        vec2 traveled = vec2(0.0);

        int initialStep = accumRadiance ? 0 : max(0, maxSteps - 1);
        for (int step = initialStep; step < maxSteps; step++) {
            // Go the direction we're traveling (with noise)
            vec2 sampleUv = vUv + rayDirectionUv * float(step);

            if (sampleUv.x < 0.0 || sampleUv.x > 1.0 || sampleUv.y < 0.0 || sampleUv.y > 1.0) {
                break;
            }

            vec4 sampleLight = texture(sceneTexture, sampleUv);
            if (sampleLight.a > 0.5) {
                radiance += sampleLight;
                break;
            }
        }
    }

    // Average radiance
    return radiance * oneOverRayCount;
}

void main() {
    // Bring up all the values to have an alpha of 1.0.
    gl_FragColor = vec4(raymarch().rgb, 1.0);
}
```

```javascript
// @run
const raymarchSlider = document.querySelector("#raymarch-steps-slider");
const showNoiseCheckbox = document.querySelector("#noise-raymarch");
const accumRadianceCheckbox = document.querySelector("#accumulate-radiance");

class NaiveRaymarchGi extends Drawing {
  innerInitialize() {
    const {plane: giPlane, render: giRender, renderTargets: giRenderTargets} = this.initThreeJS({
      uniforms: {
        sceneTexture: {value: this.surface.texture},
        rayCount: {value: 8},
        maxSteps: {value: raymarchSlider.value},
        showNoise: { value: showNoiseCheckbox.checked },
        accumRadiance: { value: accumRadianceCheckbox.checked },
        size: {value: new THREE.Vector2(this.width, this.height)},
      },
      fragmentShader: document.querySelector("#naive-raymarch-shader").innerHTML,
});

    this.giPlane = giPlane;
    this.giRender = giRender;
    this.giRenderTargets = giRenderTargets;
  }

  raymarchPass(inputTexture) {
    this.giPlane.material.uniforms.sceneTexture.value = inputTexture;
    this.renderer.setRenderTarget(null);
    this.giRender();
  }

  clear() {
    if (this.initialized) {
      this.giRenderTargets.forEach((target) => {
        this.renderer.setRenderTarget(target);
        this.renderer.clearColor();
      });
    }
    super.clear();
  }

  renderPass() {
    let out = this.drawPass();
    this.raymarchPass(out);
  }

  load() {
    super.load();
    raymarchSlider.addEventListener("input", () => {
      this.giPlane.material.uniforms.maxSteps.value = raymarchSlider.value;
      this.renderPass();
    });
    showNoiseCheckbox.addEventListener("input", () => {
      this.giPlane.material.uniforms.showNoise.value = showNoiseCheckbox.checked;
      this.renderPass();
    });
    accumRadianceCheckbox.addEventListener("input", () => {
      this.giPlane.material.uniforms.accumRadiance.value = accumRadianceCheckbox.checked;
      this.renderPass();
    });
    getFrame(() => this.reset());
  }

  draw(last, t, isShadow, resolve) {
    if (t >= 10.0) {
      resolve();
      return;
    }

    const angle = (t * 0.05) * Math.PI * 2;

    const {x, y} = isShadow
      ? {
        x: 90 + 12 * t,
        y: 200 + 1 * t,
      }
      : {
        x: 100 + 100 * Math.sin(angle + 0.25) * Math.cos(angle * 0.15),
        y: 50 + 100 * Math.sin(angle * 0.7)
      };

    last ??= {x, y};

    this.surface.drawSmoothLine(last, {x, y});
    last = {x, y};

    const step = instantMode ? 5.0 : (isShadow ? 0.5 : 0.3);
    getFrame(() => this.draw(last, t + step, isShadow, resolve));
  }

  reset() {
    this.clear();
    let last = undefined;
    return new Promise((resolve) => {
      this.setHex("#f9a875");
      getFrame(() => this.draw(last, 0, false, resolve));
    }).then(() => new Promise((resolve) => {
      last = undefined;
      getFrame(() => {
        this.setHex("#000000");
        getFrame(() => this.draw(last, 0, true, resolve));
      });
    }))
      .then(() => {
        this.renderPass();
        getFrame(() => this.setHex("#fff6d3"));
      });
  }
}

const raymarchSurface = new NaiveRaymarchGi({ id: "naive-raymarch", width: 300, height: 300 });
```

<br />

We've done it! Looks pretty similar to the final result at the top.

And we could increase the rays, replicate those features (grain and sun) and call it a day, but it's actually wildly inefficient. Maybe it doesn't even run well on whatever device you're using, maybe it does. But we're only casting 8 rays per pixel and light can only spread 256 pixels away - also that canvas is absolutely tiny and can't be made much bigger and run smoothly, even on more powerful machines.

If we take a moment to think about the core logic of our raymarching, we're doing a lot of repeated work. Think about all the overlapping steps we're taking - hint they are mostly overlapping. So caching right? Well, most of what we're doing is in parallel per-pixel, so the values of other pixels aren't available yet. So we're going to have to come up with another approach.

```html
// @run
<p id="distance-field-definition">
  Remember those distance fields from earlier? Where we were representing shapes in terms of their distance away from any given pixel? Well, if we had a way to tell how far away the nearest filled pixel was, from any given pixel, we'd know the maxiumum safe distance we could jump - in any direction. After we jumped, we could reassess, and again know the maximum safe distance we could jump. This would save a ton of computation during our raymarching process as we're getting to completely ignore large swathes of our surface.
</p>
```

[//]: # (I should include an interactive demo of the sphere casting process, which shows a starting point, choosing a direction, the circle growing to hit a filled pixel, the circle fading to low alpha, then jumping to the rim of the circle. And repeating until we hit a light.)

Now, you might be thinking, alright - so we need a map that shows the nearest filled pixel for every pixel - what are we going to do, shoot rays in all directions and take steps in every direction find the first one? That can't be much more efficient than our current raymarching process! And you'd be right.

But maybe we can get more creative.

### Jump Flood Algorithm

The loose idea here is, if we get the pixel coordinates of every filled pixel in our input / surface texture, and spread them around in the right way, we'll end up with a texture where every pixel from our original image is still just its `uv`, but all the other pixels are whichever `uv` from the original image is the least distance away. If we manage to do that - all we need to do is calculate the distance between the original and newly smeared pixel locations, at each pixel, and we've got a [distance field](#distance-field-definition).

For the "smearing" bit - we can just hierarchically repeat our `vUv` transformed `seed` texture, on top of itself a handful of times.

So first, let's make that `seed` texture, which you can see by going to "1 pass" in the slider. We just multiply the alpha of our drawing texture by the `uv` map. You can see the `uv` map by moving the slider to "No passes". You can also see this as the result of a fragment shader by setting the pixel color to be `vec4(vUv.x, vUv.y, 0.0, 1.0)` - which is frequently used for debugging shaders.

```glsl
float alpha = texture(surfaceTexture, vUv).a;
gl_FragColor = vec4(vUv * alpha, 0.0, 1.0);
```

The Jump Flood Algorithm, JFA, denotes we should use `log(N)` of the largest dimension of our texture. This makes sense given the branching nature of what we're doing.

```javascript
const passes = Math.ceil(Math.log2(Math.max(this.width, this.height)));
```

And then we can execute our JFA. We're using the "ping-pong" technique of having two render targets and swapping between them in order to accumulate the final JFA texture we want. So render, swap, render, swap, etc. `passes` times. We can't just use the same texture / render target as this is all happening in parallel, so you'd be modifying pixels that hadn't been handled yet elsewhere, causing inconsistencies.

```javascript
let currentInput = inputTexture;
let [renderA, renderB] = this.jfaRenderTargets;
let currentOutput = renderA;

for (let i = 0; i < passes; i++) {
  plane.material.uniforms.inputTexture.value = currentInput;
  plane.material.uniforms.uOffset.value = Math.pow(2, passes - i - 1);

  renderer.setRenderTarget(currentOutput);
  render();

  currentInput = currentOutput.texture;
  currentOutput = (currentOutput === renderA) ? renderB : renderA;
}
```

So what about the actual shader? Well, we need to keep track of the nearest filled pixel to us and how far away it is. (I used -2.0 to make sure it was completely out of frame) and a big number for distance.

```glsl
vec4 nearestSeed = vec4(-2.0);
float nearestDist = 999999.9;
```

Then, we just look all around us, offset by `uOffset` over `resolution` (we could totally precalculate that and pass it in) and if it's a filled pixel that's closer to us than what we've found so far, great! And note that we can't break early, because a pixel is "closer" based on the color it represents, not based on how far we've traveled, or something.

```glsl
for (float y = -1.0; y <= 1.0; y += 1.0) {
  for (float x = -1.0; x <= 1.0; x += 1.0) {
    vec2 sampleUV = vUv + vec2(x, y) * uOffset / resolution;
```

Quick bounds check, then we can get the distance based on the red and green pixel values currently stored there, compared with our own. I could have used `distance` but chose to use `dot` because why use the extra `sqrt`? We're only comparing relative distances.

```glsl
if (sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0) { continue; }

vec4 sampleValue = texture(inputTexture, sampleUV);
vec2 sampleSeed = sampleValue.xy;

if (sampleSeed.x != 0.0 || sampleSeed.y != 0.0) {
  vec2 diff = sampleSeed - vUv;
  float dist = dot(diff, diff);
  if (dist < nearestDist) {
    nearestDist = dist;
    nearestSeed = sampleValue;
  }
}
```

And we're done - set ourselves as the `uv` of the nearest filled pixel, ready to be compared to in the next pass (if applicable).
```glsl
  }
}

gl_FragColor = nearestSeed;
```

<br />

Let's check out what this looks like in practice!

<br />

```html
// @run
<div style="display: flex; gap: 8px;">
  No Passes
  <input id="jfa-slider" class="slider" type="range" min="0" max="9" value="5" />
  9 Passes
</div>

<br />

<div id="jfa"></div>
```

```glsl
// @run id="jfa-seed-shader" type="x-shader/x-fragment"
uniform sampler2D surfaceTexture;

in vec2 vUv;

void main() {
    float alpha = texture(surfaceTexture, vUv).a;
    gl_FragColor = vec4(vUv * alpha, vUv * (1.0 - alpha));
}
```

```glsl
// @run id="jfa-shader" type="x-shader/x-fragment"

uniform vec2 oneOverSize;
uniform sampler2D inputTexture;
uniform float uOffset;
uniform bool skip;

in vec2 vUv;

void main() {
    if (skip) {
        gl_FragColor = vec4(vUv, 0.0, 1.0);
    } else {
        vec4 nearestSeed = vec4(0.0);
        float nearestDist = 999999.9;

        for (float y = -1.0; y <= 1.0; y += 1.0) {
            for (float x = -1.0; x <= 1.0; x += 1.0) {
                vec2 sampleUV = vUv + vec2(x, y) * uOffset * oneOverSize;

                // Check if the sample is within bounds
                if (sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0) { continue; }

                vec4 sampleValue = texture(inputTexture, sampleUV);
                vec2 sampleSeed = sampleValue.xy;

                if (sampleSeed.x != 0.0 || sampleSeed.y != 0.0) {
                    vec2 diff = sampleSeed - vUv;
                    float dist = dot(diff, diff);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestSeed.xy = sampleValue.xy;
                    }
                }
            }
        }

        gl_FragColor = nearestSeed;
    }
}
```

```javascript
// @run
const jfaSlider = document.querySelector("#jfa-slider");
jfaSlider.value = window.mdxishState.jfaSlider ?? 5;

class JFA extends Drawing {
  innerInitialize() {
    this.passes = Math.ceil(Math.log2(Math.max(this.width, this.height)));

    const {plane: seedPlane, render: seedRender, renderTargets: seedRenderTargets} = this.initThreeJS({
      uniforms: {
        surfaceTexture: {value: this.surface.texture},
      },
      fragmentShader: document.querySelector("#jfa-seed-shader").innerHTML,
    });
    
    const {plane: jfaPlane, render: jfaRender, renderTargets: jfaRenderTargets} = this.initThreeJS({
      uniforms: {
        inputTexture: {value: this.surface.texture},
        oneOverSize: {value: new THREE.Vector2(1.0 / this.width, 1.0 / this.height)},
        uOffset: {value: Math.pow(2, this.passes - 1)},
        skip: {value: true},
      },
      fragmentShader: document.querySelector("#jfa-shader").innerHTML
    });

    this.seedPlane = seedPlane;
    this.seedRender = seedRender;
    this.seedRenderTargets = seedRenderTargets;

    this.jfaPlane = jfaPlane;
    this.jfaRender = jfaRender;
    this.jfaRenderTargets = jfaRenderTargets;
  }

  seedPass(inputTexture) {
    this.seedPlane.material.uniforms.surfaceTexture.value = inputTexture;
    this.renderer.setRenderTarget(this.seedRenderTargets[0]);
    this.seedRender();
    return this.seedRenderTargets[0].texture;
  }

  jfaPassesCount() {
    return parseInt(jfaSlider.value);
  }

  jfaPass(inputTexture) {
    let currentInput = inputTexture;
    let [renderA, renderB] = this.jfaRenderTargets;
    let currentOutput = renderA;
    this.jfaPlane.material.uniforms.skip.value = true;
    let passes = this.jfaPassesCount();

    for (let i = 0; i < passes || (passes === 0 && i === 0); i++) {

      this.jfaPlane.material.uniforms.skip.value = passes === 0;
      this.jfaPlane.material.uniforms.inputTexture.value = currentInput;
      // This intentionally uses `this.passes` which is the true value
      // In order to properly show stages using the JFA slider.
      this.jfaPlane.material.uniforms.uOffset.value = Math.pow(2, this.passes - i - 1);

      this.renderer.setRenderTarget(currentOutput);
      this.jfaRender();

      currentInput = currentOutput.texture;
      currentOutput = (currentOutput === renderA) ? renderB : renderA;
    }

    return currentInput;
  }

  draw(last, t, isShadow, resolve) {
    if (t >= 10.0) {
      resolve();
      return;
    }

    const angle = (t * 0.05) * Math.PI * 2;

    const {x, y} = isShadow
      ? {
        x: 90 + 12 * t,
        y: 200 + 1 * t,
      }
      : {
        x: 100 + 100 * Math.sin(angle + 0.25) * Math.cos(angle * 0.15),
        y: 50 + 100 * Math.sin(angle * 0.7)
      };

    last ??= {x, y};

    this.surface.drawSmoothLine(last, {x, y});
    last = {x, y};

    const step = instantMode ? 5.0 : (isShadow ? 0.5 : 0.3);
    getFrame(() => this.draw(last, t + step, isShadow, resolve));
  }

  clear() {
    if (this.initialized) {
      this.seedRenderTargets.concat(this.jfaRenderTargets).forEach((target) => {
        this.renderer.setRenderTarget(target);
        this.renderer.clearColor();
      });
    }
    super.clear();
  }

  load() {
    super.load();
    jfaSlider.addEventListener("input", () => {
      this.renderPass();
      // Save the value
      window.mdxishState.jfaSlider = jfaSlider.value;
    });
    getFrame(() => this.reset());
  }

  renderPass() {
    let out = this.drawPass();
    out = this.seedPass(out);
    out = this.jfaPass(out);
    this.renderer.setRenderTarget(null);
    this.jfaRender();
  }

  reset() {
    this.clear();
    let last = undefined;
    return new Promise((resolve) => {
      this.setHex("#f9a875");
      getFrame(() => this.draw(last, 0, false, resolve));
    }).then(() => new Promise((resolve) => {
      last = undefined;
      getFrame(() => {
        this.setHex("#000000");
        getFrame(() => this.draw(last, 0, true, resolve));
      });
    }))
      .then(() => {
        this.renderPass();
        getFrame(() => this.setHex("#fff6d3"));
      });
  }
}

const jfa = new JFA({ id: "jfa", width: 300, height: 300 });
```

<br />

I'm also showing "No Passes" here, which is the UV map of all pixels, without the drawing.

If you haven't been experimenting... you can draw regardless of the settings, and it will appropriately render what _would_ have been rendered if you had drawn on a canvas and that was passed to the GPU. This is how all these canvases are instrumented.

So... we're pretty much there on our precomputed nearest-filled-pixel distance lookup. We just need to do a quick pass with a shader to convert the texture.


## Distance Field

We need to take our JFA texture - which is the `uv` of our filled pixels smeared about hierarchically, and just measure the distance between the stored `rg` (red, green) value and the `uv` itself!

So let's go ahead and do it.

```glsl
vec2 nearestSeed = texture(jfaTexture, vUv).xy;
// Clamp by the size of our texture (1.0 in uv space).
float distance = clamp(distance(vUv, nearestSeed), 0.0, 1.0);

// Normalize and visualize the distance
gl_FragColor = vec4(vec3(distance), 1.0);
```

We also clamped it to make sure things that are further than 1 `uv` away are still just treated as 1.

But that's really it- and now we can dramatically improve the runtime of our raymarching with our fancy jump distance lookup.

Erase / Drag around

```html
// @run
<div id="distance-field-canvas"></div>
```

```glsl
// @run id="dfa-shader" type="x-shader/x-fragment"
uniform sampler2D jfaTexture;
uniform vec2 size;

in vec2 vUv;

void main() {
    vec4 nearestSeed = texture(jfaTexture, vUv);
    // Clamp by the size of our texture (1.0 in uv space).
    float dist = clamp(distance(vUv, nearestSeed.xy), 0.0, 1.0);

    // Normalize and visualize the distance
    gl_FragColor = vec4(vec3(dist), 1.0);
}
```

```javascript
// @run
class DistanceField extends JFA {
  jfaPassesCount() {
    return this.passes;
  }

  innerInitialize() {
    super.innerInitialize();

    const {plane: dfPlane, render: dfRender, renderTargets: dfRenderTargets} = this.initThreeJS({
      uniforms: {
        jfaTexture: {value: this.surface.texture},
        size: {value: new THREE.Vector2(this.width, this.height)},
      },
      fragmentShader: document.querySelector("#dfa-shader").innerHTML,
    });

    this.dfPlane = dfPlane;
    this.dfRender = dfRender;
    this.dfRenderTargets = dfRenderTargets;
  }

  load() {
    this.reset();
    this.initialized = true;
  }

  clear() {
    if (this.initialized) {
      this.dfRenderTargets.forEach((target) => {
        this.renderer.setRenderTarget(target);
        this.renderer.clearColor();
      });
    }
    super.clear();
  }

  dfPass(inputTexture) {
    this.renderer.setRenderTarget(this.dfRenderTargets[0]);
    this.dfPlane.material.uniforms.jfaTexture.value = inputTexture;
    this.dfRender();
    return this.dfRenderTargets[0].texture;
  }

  renderPass() {
    let out = this.drawPass();
    out = this.seedPass(out);
    out = this.jfaPass(out);
    out = this.dfPass(out);
    this.renderer.setRenderTarget(null);
    this.dfRender();
  }
}

const distanceField = new DistanceField({
  id: "distance-field-canvas", width: 300, height: 300
});
```

<br />

Let's update our raymarching logic to use our new distance field!

## Naive Global Illumination

_Yes, this is still naive global illumination, but much better than what we started with!_

I'm going to jump right in. Remember [what our original raymarch approach was doing per-ray](#for-every-ray)?

We're doing _almost_ exactly the same thing, but `maxSteps` can be way smaller - like 32 now, and definitely goes to the edge of the screen. And this new `maxSteps` effectively controls quality and scales with the size of the canvas. Our previous method is a set distance (like 256 steps) so needs to be increased with larger canvases, and is clearly more expensive.

```glsl
// We tested uv already (we know we aren't an object), so skip step 0.
for (int step = 1; step < maxSteps; step++) {
    // How far away is the nearest object?
    float dist = texture(distanceTexture, sampleUv).r;
    
    // Go the direction we're traveling (with noise)
    sampleUv += rayDirection * dist;
    
    if (outOfBounds(sampleUv)) break;
    
    // We hit something! (EPS = small number, like 0.001)
    if (dist < EPS) {
      // Collect the radiance
      radDelta += texture(sceneTexture, sampleUv);
      break;
    }
}
```

And that's all we need to change to get our naive global illumination implementation!

## Playground

Here are a bunch of controls to play with what we've built, and some extra features.

```html
// @run
<div style="display: flex; align-items: center; gap: 4px">
<input type="checkbox" id="noise-toggle" checked>
<label for="noise-toggle">Enable Noise</label>
</div>

<div style="display: flex; align-items: center; gap: 4px">
<input type="checkbox" id="sun-toggle" checked>
<label for="sun-toggle">Enable Sun</label>
- <a href="#make-it-look-like-were-outside">How ?</a>
</div>

<div style="display: flex; align-items: center; gap: 4px">
<input type="checkbox" id="grain-toggle" checked>
<label for="grain-toggle">Enable Angular Noise (Sand Grain)</label>
- <a href="#sand-grain">How ?</a>
</div>

<div style="display: flex; align-items: center; gap: 4px">
<input type="checkbox" id="temporal-toggle">
<label for="temporal-toggle">Enable Temporal Accumulation</label>
- <a href="#temporal-accumulation">How ?</a>
</div>

<br />

<div style="display: flex; align-items: center; gap: 8px">
Max Raymarch Steps
<input id="max-steps-slider" class="slider" type="range" min="0" max="48" step="1" value="32" />
</div>

<br />

<div style="display: flex; align-items: center; gap: 8px">
Sun Angle
<input id="sun-angle-slider" class="slider" type="range" min="0" max="6.2" step="0.1" value="4.2" />
</div>

<br />

<div id="gi"></div>
```


```glsl
// @run id="gi-fragment-shader" type="x-shader/x-fragment"
uniform int rayCount;
uniform float time;
uniform float sunAngle;
uniform bool showNoise;
uniform bool showGrain;
uniform bool useTemporalAccum;
uniform bool enableSun;
uniform vec2 oneOverSize;
uniform int maxSteps;

uniform sampler2D sceneTexture;
uniform sampler2D lastFrameTexture;
uniform sampler2D distanceTexture;

in vec2 vUv;

const float PI = 3.14159265;
const float TAU = 2.0 * PI;
const float ONE_OVER_TAU = 1.0 / TAU;
const float PAD_ANGLE = 0.01;
const float EPS = 0.001f;

const vec3 skyColor = vec3(0.02, 0.08, 0.2);
const vec3 sunColor = vec3(0.95, 0.95, 0.9);
const float goldenAngle = PI * 0.7639320225;

// Popular rand function
float rand(vec2 co) {
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec3 sunAndSky(float rayAngle) {
    // Get the sun / ray relative angle
    float angleToSun = mod(rayAngle - sunAngle, TAU);

    // Sun falloff based on the angle
    float sunIntensity = smoothstep(1.0, 0.0, angleToSun);

    // And that's our sky radiance
    return sunColor * sunIntensity + skyColor;
}

bool outOfBounds(vec2 uv) {
    return uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0;
}

void main() {
    vec2 uv = vUv;

    vec4 light = texture(sceneTexture, uv);

    vec4 radiance = vec4(0.0);

    float oneOverRayCount = 1.0 / float(rayCount);
    float angleStepSize = TAU * oneOverRayCount;

    float coef = useTemporalAccum ? time : 0.0;
    float offset = showNoise ? rand(uv + coef) : 0.0;
    float rayAngleStepSize = showGrain ? angleStepSize + offset * TAU : angleStepSize;

    // Not light source or occluder
    if (light.a < 0.1) {
        // Shoot rays in "rayCount" directions, equally spaced, with some randomness.
        for(int i = 0; i < rayCount; i++) {
            float angle = rayAngleStepSize * (float(i) + offset) + sunAngle;
            vec2 rayDirection = vec2(cos(angle), -sin(angle));

            vec2 sampleUv = uv;
            vec4 radDelta = vec4(0.0);
            bool hitSurface = false;

            // We tested uv already (we know we aren't an object), so skip step 0.
            for (int step = 1; step < maxSteps; step++) {
                // How far away is the nearest object?
                float dist = texture(distanceTexture, sampleUv).r;

                // Go the direction we're traveling (with noise)
                sampleUv += rayDirection * dist;

                if (outOfBounds(sampleUv)) break;

                if (dist < EPS) {
                    vec4 sampleColor = texture(sceneTexture, sampleUv);
                    radDelta += sampleColor;
                    hitSurface = true;
                    break;
                }
            }

            // If we didn't find an object, add some sky + sun color
            if (!hitSurface && enableSun) {
                radDelta += vec4(sunAndSky(angle), 1.0);
            }

            // Accumulate total radiance
            radiance += radDelta;
        }
    } else if (length(light.rgb) >= 0.1) {
        radiance = light;
    }


    // Bring up all the values to have an alpha of 1.0.
    vec4 finalRadiance = vec4(max(light, radiance * oneOverRayCount).rgb, 1.0);
    if (useTemporalAccum && time > 0.0) {
        vec4 prevRadiance = texture(lastFrameTexture, vUv);
        gl_FragColor = mix(finalRadiance, prevRadiance, 0.9);
    } else {
        gl_FragColor = finalRadiance;
    }
}
```

```javascript
// @run

class GI extends DistanceField {
  innerInitialize() {
    super.innerInitialize();
    this.toggle = document.querySelector("#noise-toggle");
    this.grainToggle = document.querySelector("#grain-toggle");
    this.temporalToggle = document.querySelector("#temporal-toggle");
    this.sunToggle = document.querySelector("#sun-toggle");
    this.sunAngleSlider = document.querySelector("#sun-angle-slider");
    this.maxStepsSlider = document.querySelector("#max-steps-slider");

    this.showNoise = true;
    this.showGrain = true;
    this.useTemporalAccum = false;
    this.enableSun = true;
    this.activelyDrawing = false;
    this.accumAmt = 10.0;
    this.maxSteps = this.maxStepsSlider.value;

    const {plane: giPlane, render: giRender, renderTargets: giRenderTargets} = this.initThreeJS({
      uniforms: {
        sceneTexture: {value: this.surface.texture},
        distanceTexture: {value: null},
        lastFrameTexture: {value: null},
        oneOverSize: {value: new THREE.Vector2(1.0 / this.width, 1.0 / this.height)},
        rayCount: {value: rayCount},
        showNoise: { value: this.showNoise },
        showGrain: { value: this.showGrain },
        useTemporalAccum: { value: this.useTemporalAccum },
        enableSun: { value: this.enableSun },
        time: { value: 0.0 },
        // We're using TAU - 2.0 (radians) here b/c it feels like a reasonable spot in the sky
        sunAngle: { value: this.sunAngleSlider.value },
        maxSteps: { value: this.maxSteps }
      },
      fragmentShader: document.querySelector("#gi-fragment-shader").innerHTML,
    });

    this.lastFrame = null;
    this.prev = 0;
    this.drawingExample = false;

    this.giPlane = giPlane;
    this.giRender = giRender;
    this.giRenderTargets = giRenderTargets;
  }

  giPass(distanceFieldTexture) {
    this.giPlane.material.uniforms.distanceTexture.value = distanceFieldTexture;
    this.giPlane.material.uniforms.sceneTexture.value = this.surface.texture;
    if (this.useTemporalAccum && !this.surface.isDrawing && !this.drawingExample) {
      this.giPlane.material.uniforms.lastFrameTexture.value = this.lastFrame ?? this.surface.texture;
      const target = this.prev ? this.giRenderTargets[0] : this.giRenderTargets[1];
      this.prev = (this.prev + 1) % 2;
      this.renderer.setRenderTarget(target);
      this.giRender();
      this.lastFrame = target.texture;
      this.giPlane.material.uniforms.time.value += 1.0;
    } else {
      this.giPlane.material.uniforms.time.value = 0.0;
      this.lastFrame = null;
    }
    this.renderer.setRenderTarget(null);
    this.giRender();
    return this.lastFrame;
  }

  renderPass() {
    const isDone = this.giPlane.material.uniforms.time.value >= this.accumAmt;
    if (isDone || this.surface.isDrawing || this.drawingExample) {
      this.giPlane.material.uniforms.time.value = 0;
    }

    let drawPassTexture = this.drawPass();
    let out = this.seedPass(drawPassTexture);
    out = this.jfaPass(out);
    out = this.dfPass(out);
    this.renderer.setRenderTarget(null);
    this.surface.texture = drawPassTexture;
    out = this.giPass(out);
  }

  animate() {
    const isDone = this.giPlane.material.uniforms.time.value >= this.accumAmt;
    this.renderPass();
    if (isDone || this.surface.isDrawing || this.drawingExample || !this.useTemporalAccum) {
      return;
    }
    getFrame(() => this.animate());
  }

  toggleSun() {
    this.sunToggle.checked = !this.sunToggle.checked
    this.enableSun = !this.enableSun;
    this.giPlane.material.uniforms.enableSun.value = this.enableSun;
    this.animate();
  }

  clear() {
    this.lastFrame = null;
    if (this.initialized) {
      this.giRenderTargets.forEach((target) => {
        this.renderer.setRenderTarget(target);
        this.renderer.clearColor();
      });
    }
    super.clear();
  }

  reset() {
    this.drawingExample = true;
    return super.reset().then(() => {
      this.drawingExample = false;
      this.animate();
    })
  }
  
  showToggleSun() {
    return this.id === "final";
  }

  canvasModifications() {
    return {
      startDrawing: (e) => {
        if (this.drawingExample) {
          return;
        }
        this.lastFrame = null;
        this.giPlane.material.uniforms.time.value = 0.0;
        this.surface.startDrawing(e)
      },
      onMouseMove: (e) => {
        if (this.surface.onMouseMove(e)) {
          this.giPlane.material.uniforms.time.value = 0.0;
        }
      },
      stopDrawing: (e) => {
        if (this.surface.stopDrawing(e)) {
          this.giPlane.material.uniforms.time.value = 0;
          this.animate();
        }
      },
      ...(
        this.showToggleSun() ? {
          toggleSun: () => this.toggleSun()
        } : {}
      )
    }
  }

  stopSliding() {
    this.drawingExample = false;
    this.animate();
  }

  loadAfterReset() {
    this.initialized = true;

    this.toggle.addEventListener("input", () => {
      this.showNoise = this.toggle.checked;
      this.giPlane.material.uniforms.showNoise.value = this.showNoise;
      this.animate();
    });

    this.grainToggle.addEventListener("input", () => {
      this.showGrain = this.grainToggle.checked;
      this.giPlane.material.uniforms.showGrain.value = this.showGrain;
      this.animate();
    });

    this.temporalToggle.addEventListener("input", () => {
      this.useTemporalAccum = this.temporalToggle.checked;
      this.giPlane.material.uniforms.useTemporalAccum.value = this.useTemporalAccum;
      this.animate();
    });

    this.sunToggle.addEventListener("input", () => {
      this.giPlane.material.uniforms.time.value = 0;
      this.enableSun = this.sunToggle.checked;
      this.giPlane.material.uniforms.enableSun.value = this.enableSun;
      this.animate();
    });

    Object.entries({
      "mousedown": () => { this.drawingExample = true; },
      "touchstart": () => { this.drawingExample = true; },
      "touchend": () => { this.stopSliding() },
      "touchcancel": () => { this.stopSliding() },
      "mouseup": () => { this.stopSliding() },
    }).forEach(([event, fn]) => {
      this.sunAngleSlider.addEventListener(event, fn);
      this.maxStepsSlider.addEventListener(event, fn);
    });

    this.sunAngleSlider.addEventListener("input", () => {
      this.giPlane.material.uniforms.sunAngle.value = this.sunAngleSlider.value;
      this.renderPass();
      window.mdxishState.sunAngleSlider = this.sunAngleSlider.value;
    });

    this.maxStepsSlider.addEventListener("input", () => {
      this.giPlane.material.uniforms.maxSteps.value = this.maxStepsSlider.value;
      this.renderPass();
      window.mdxishState.maxSteps = this.maxSteps.value;
    });
  }

  load() {
    this.reset().then(() => {
      this.loadAfterReset();
    });
  }
}

const gi = new GI({ id: "gi", width: 300, height: 400 });

let finalWidth = 300;
let giFinal = new GI({ id: "final", width: finalWidth, height: 400 });

if (!isMobile) {
  let performanceMode = true;
  let perfDiv = document.querySelector("#performance-issues");
  perfDiv.textContent = "Want a bigger canvas?";
  perfDiv.addEventListener("click", () => {
    document.querySelector("#final").innerHtml = "";
    performanceMode = !performanceMode;
    finalWidth = performanceMode ? 300 : document.querySelector("#content").clientWidth - 64;
    perfDiv.textContent = performanceMode ? "Want a bigger canvas?" : "Performance issues?";
    giFinal = new GI({id: "final", width: finalWidth, height: 400});
  });
}
```

<br />

## Bonus Material

Oh, you're still here? Cool. Let's peel back the demo above then!

Each control has a "How?" link which jumps to the explanation, and there's a "Jump back to playground" at the end of each section. No need to read in order!

### Make it look like we're outside

So if we want to make it look like we're outside, we need to record when we hit a surface, because if we didn't, we want to add extra radiance from the sun / sky.

```glsl
if (dist < EPS) {
  radDelta += texture(sceneTexture, sampleUv);
  // Record that we hit something!
  hitSurface = true;
  break;
}
```

It's important we record that we hit something because if we _didn't_, then we want to add some sun/sky look and feel (radiance). And then we can just take a literal slice of the sky, and cast rays from that direction 

```glsl
if (!hitSurface) {
  radDelta += vec4(sunAndSky(angle), 1.0);
}
```

So, let's define the key radiance calculation.

First, choose some colors which represent what color and how much of an impact the "sky color" and "sun color" will have on the final render. The "sky color" will always be the same, while the "sun color" will be applied based on its angle. I chose to make the sun matter a lot more, be near white, and for the sky to be much dimmer with a blue hue. But these can be whatever you want!

```glsl
const vec3 skyColor = vec3(0.02, 0.08, 0.2);
const vec3 sunColor = vec3(0.95, 0.95, 0.9);

vec3 sunAndSky(vec2 angle) {
```

First, we get the sun's relative angle to our ray, and `mod` with `TAU` to keep it in our unit circle.

```glsl
float angleToSun = mod(rayAngle - sunAngle, TAU);
```

Then we calculate what the sun's intensity is, based on that angle, making use of [`smoothstep`](https://thebookofshaders.com/glossary/?search=smoothstep) to add some smoothing.

```glsl
float sunIntensity = smoothstep(1.0, 0.0, angleToSun);
```

And finally, we apply the intensity to the sun color and add the sky color.

```glsl
return sunColor * sunIntensity + skyColor;
```

That's it! Every time I've come across "sky radiance" in the wild, it's always some crazy set of equations I barely understand, and/or "copied from <so and so's> shadertoy". Maybe I'm way over simplifying things, but, this approach is what I landed on when thinking it through myself.

<a href="#playground">Jump back to playground.</a>

### Sand grain

So I was playing with noise, and happened on pixels "catching the light" by adding our same noise to how much we **increase** the angle by each iteration, adding some noisy overlap. So certain pixels get double the radiance.

```glsl
float rayAngleStepSize = angleStepSize + offset * TAU;
```

And in our core ray loop, where `i` is our ray index, I added the `sunAngle` to it, so the light would catch (overlap would happen) in the same direction as the sun.

```glsl
float angle = rayAngle * (float(i) + offset) + sunAngle;
```

<a href="#playground">Jump back to playground.</a>

### Temporal accumulation

This is pretty straightforward, but there's a lot you can do with it to customize it. I didn't mention it earlier because Radiance Cascades doesn't require temporal accumulation, which is basically a hack to deal with noise.

All we need to do to get temporal accumulation is, add a time component to our noise seed, so it varies over time, and mix with the last frame as an additional texture (ping-pong buffer).

Anywhere you use `rand` and what it to get smoothed, just add time.

```glsl
rand(uv + time)
```

And when you return the final radiance, just mix it with the previous frame.

```glsl
vec4 prevRadiance = texture(lastFrameTexture, vUv);
gl_FragColor = mix(finalRadiance, prevRadiance, 0.9);
```

On the CPU side, just update the loop to include / store the previous texture, and add a stopping condition. If the time reaches, say, 10 frames, stop mixing. `prev` is just `0` or `1` - initialized to `0` somewhere.

```javascript
plane.material.uniforms.lastFrameTexture.value = lastFrame ?? surface.texture;
renderer.setRenderTarget(giRenderTargets[prev]);
render();
prev = 1 - prev;
lastFrame = target.texture;
plane.material.uniforms.time.value += 1.0;
```

I also opted to pause temporal accumulation while drawing. It impacts performance as it needs to set a new render target each frame and adds a texture lookup.

<a href="#playground">Jump back to playground.</a>

<br />

## GI Falling Sand

<div style="display: flex; align-items: center; gap: 4px">
<button id="sand-mode-button">Sand Mode</button>
<button id="solid-mode-button">Solid Mode</button>
<button id="empty-mode-button">Empty Mode</button>
</div>

<br/>

<div id="falling-sand-canvas"></div>

<br />

```javascript
// @run
class Particle {
  constructor(color, empty = false) {
    this.color = color;
    this.empty = empty;
    this.maxSpeed = 8;
    this.acceleration = 0.4;
    this.velocity = 0;
    this.modified = false;
  }

  update() {
    if (this.maxSpeed === 0) {
      this.modified = false;
      return;
    }
    this.updateVelocity();
    this.modified = this.velocity !== 0;
  }

  updateVelocity() {
    let newVelocity = this.velocity + this.acceleration;
    if (Math.abs(newVelocity) > this.maxSpeed) {
      newVelocity = Math.sign(newVelocity) * this.maxSpeed;
    }
    this.velocity = newVelocity;
  }

  resetVelocity() {
    this.velocity = 0;
  }

  getUpdateCount() {
    const abs = Math.abs(this.velocity);
    const floored = Math.floor(abs);
    const mod = abs - floored;
    return floored + (Math.random() < mod ? 1 : 0);
  }
}

class Sand extends Particle {
  constructor(color) {
    super(color);
  }
}

class Solid extends Particle {
  constructor(color) {
    super(color);
    this.maxSpeed = 0;
  }

  update() {
    this.modified = true;
  }
}

class Empty extends Particle {
  constructor() {
    super({ r: 0, g: 0, b: 0 }, true);
    this.maxSpeed = 0;
  }

  update() {
    this.modified = true;
  }
}

class FallingSandSurface extends PaintableCanvas {
  constructor(options) {
    super(options);
    this.grid = new Array(this.width * this.height).fill(null).map(() => new Empty());
    this.tempGrid = new Array(this.width * this.height).fill(null).map(() => new Empty());
    this.colorGrid = new Array(this.width * this.height * 3).fill(0);
    this.modifiedIndices = new Set();
    this.cleared = false;
    this.rowCount = Math.floor(this.grid.length / this.width);
    requestAnimationFrame(() => this.updateSand());
    this.mode = Sand;

    document.querySelector("#sand-mode-button").addEventListener("click", () => {
      this.mode = Sand;
    });

    document.querySelector("#solid-mode-button").addEventListener("click", () => {
      this.mode = Solid;
    });

    document.querySelector("#empty-mode-button").addEventListener("click", () => {
      this.mode = Empty;
    });
  }

  onMouseMove(event) {
    if (!this.isDrawing) return false;
    this.mouseMoved = true;
    this.currentMousePosition = this.getMousePos(event);
    return true;
  }

  varyColor(color) {
    const hue = color.h;
    let saturation = color.s + Math.floor(Math.random() * 20) - 20;
    saturation = Math.max(0, Math.min(100, saturation));
    let lightness = color.l + Math.floor(Math.random() * 10) - 5;
    lightness = Math.max(0, Math.min(100, lightness));
    return this.hslToRgb(hue, saturation, lightness);
  }

  hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4))
    };
  }

  rgbToHsl(rgb) {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  drawSmoothLineFallback(from, to) {
    this.drawParticleLine(from, to, this.mode);
    this.updateTexture();
  }

  drawParticleLine(from, to, ParticleType) {
    const radius = this.RADIUS;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    for (let i = 0; i <= steps; i++) {
      const t = (steps === 0) ? 0 : i / steps;
      const x = Math.round(from.x + dx * t);
      const y = Math.round(from.y + dy * t);

      for (let ry = -radius; ry <= radius; ry++) {
        for (let rx = -radius; rx <= radius; rx++) {
          if (rx * rx + ry * ry <= radius * radius) {
            const px = x + rx;
            const py = y + ry;
            if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
              const index = py * this.width + px;
              const variedColor = this.varyColor(this.rgbToHsl(this.currentColor));
              this.setParticle(index, new ParticleType(variedColor));
            }
          }
        }
      }
    }
  }

  updateSand() {
    if (this.isDrawing) {
      this.doDraw();
    }
    
    this.cleared = false;
    this.modifiedIndices = new Set();

    for (let row = this.rowCount - 1; row >= 0; row--) {
      const rowOffset = row * this.width;
      const leftToRight = Math.random() > 0.5;
      for (let i = 0; i < this.width; i++) {
        const columnOffset = leftToRight ? i : -i - 1 + this.width;
        let index = rowOffset + columnOffset;
        const particle = this.grid[index];

        particle.update();

        if (!particle.modified) {
          continue;
        }

        this.modifiedIndices.add(index);

        for (let v = 0; v < particle.getUpdateCount(); v++) {
          const newIndex = this.updatePixel(index);

          if (newIndex !== index) {
            index = newIndex;
          } else {
            particle.resetVelocity();
            break;
          }
        }
      }
    }

    this.updateCanvasFromGrid();
    this.updateTexture();
    requestAnimationFrame(() => this.updateSand());
  }

  updatePixel(i) {
    const particle = this.grid[i];
    if (particle instanceof Empty) return i;

    const below = i + this.width;
    const belowLeft = below - 1;
    const belowRight = below + 1;
    const column = i % this.width;

    if (this.isEmpty(below)) {
      this.swap(i, below);
      return below;
    } else if (this.isEmpty(belowLeft) && belowLeft % this.width < column) {
      this.swap(i, belowLeft);
      return belowLeft;
    } else if (this.isEmpty(belowRight) && belowRight % this.width > column) {
      this.swap(i, belowRight);
      return belowRight;
    }

    return i;
  }

  swap(a, b) {
    if (this.grid[a] instanceof Empty && this.grid[b] instanceof Empty) {
      return;
    }
    [this.grid[a], this.grid[b]] = [this.grid[b], this.grid[a]];
    this.modifiedIndices.add(a);
    this.modifiedIndices.add(b);
  }

  setParticle(i, particle) {
    this.grid[i] = particle;
    this.modifiedIndices.add(i);
  }

  isEmpty(i) {
    return this.grid[i] instanceof Empty;
  }

  updateCanvasFromGrid() {
    const imageData = this.context.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;

    this.modifiedIndices.forEach((i) => {
      const index = i * 4;
      const particle = this.grid[i];
      if (!(particle instanceof Empty)) {
        data[index] = particle.color.r;
        data[index + 1] = particle.color.g;
        data[index + 2] = particle.color.b;
        data[index + 3] = 255; // Full opacity
      } else {
        data[index + 3] = 0; // Set alpha to 0 for empty spaces
      }
    });

    this.context.putImageData(imageData, 0, 0);
  }

  clear() {
    super.clear();
    this.grid.fill(new Empty());
    this.tempGrid.fill(new Empty());
    this.colorGrid.fill(0);
    this.cleared = true;
  }

  setColor(r, g, b) {
    super.setColor(r, g, b);
  }

  needsUpdate() {
    return this.cleared || this.modifiedIndices.size > 0;
  }

  useFallbackCanvas() {
    return true;
  }
}

class FallingSandDrawing extends GI {
  createSurface(width, height, radius) {
    this.surface = new FallingSandSurface({ width, height, radius });
  }

  showToggleSun() {
    return true;
  }

  reset() {
    this.clear();
    let last = undefined;
    return new Promise((resolve) => {
      this.setHex("#f9a875");
      getFrame(() => this.draw(last, 0, false, resolve));
    }).then(() => new Promise((resolve) => {
      last = undefined;
      getFrame(() => {
        this.surface.mode = Solid;
        this.setHex("#000000");
        getFrame(() => this.draw(last, 0, true, resolve));
      });
    }))
      .then(() => {
        this.renderPass();
        getFrame(() => this.setHex("#fff6d3"));
        this.surface.mode = Sand;
      });
  }
}

const fallingSand = new FallingSandDrawing({ id: "falling-sand-canvas", width: 300, height: 300 });
```

<br />

Curious how to make this? Checkout [Making a falling sand simulator](https://jason.today/falling-sand).

<br />