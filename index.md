---
title: Interactive Boid Text
scripts:
  - https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.js
  - https://cdn.jsdelivr.net/npm/chart.js@3.5.1/dist/chart.min.js
styles: |
  h1 {
    text-align: center;  
  }
  canvas {
    max-width: 100%;
    height: auto;
  }
  #p5-canvas {
    position: absolute;
    pointer-events: none;
  }
---

# My ?[Interactive](interactive-word) Page

This is a demonstration of an ?[interactive](i) chart with boid text effect. Hover over the bars to see the magic!

<div id="p5-canvas"></div>
<canvas id="charts"></canvas>

```javascript
// @run
// Chart setup
const canvas = document.querySelector('#charts');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const interactiveWord = document.querySelector('[data-id="interactive-word"]');

const colors = [
  'rgb(255, 99, 132)',
  'rgb(54, 162, 235)',
  'rgb(255, 206, 86)',
  'rgb(75, 192, 192)',
  'rgb(153, 102, 255)',
  'rgb(255, 159, 64)'
];

const chart = new Chart(canvas.getContext('2d'), {
  type: 'bar',
  data: {
    labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
    datasets: [{
      label: '# of Votes',
      data: [12, 19, 3, 5, 2, 3],
      backgroundColor: colors,
      borderColor: colors,
      borderWidth: 1
    }]
  },
  options: {
    animation: {
      duration: 0
    },
    responsive: true,
    onHover: (event, activeElements) => {
      if (activeElements && activeElements.length > 0) {
        const dataIndex = activeElements[0].index;
        startBoidAnimation(colors[dataIndex]);
      } else {
        stopBoidAnimation();
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
});

// p5.js setup
let boid;
let isAnimating = false;
let targetColor;

new p5(p => {
  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.style('pointer-events', 'none');
    boid = new Boid(p, 0, 0);
  };

  p.draw = () => {
    p.clear();
    if (isAnimating) {
      boid.update();
      boid.display();
    }
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };

  class Boid {
    constructor(p, x, y) {
      this.p = p;
      this.position = p.createVector(x, y);
      this.velocity = p.createVector();
      this.acceleration = p.createVector();
      this.maxSpeed = 5;
      this.maxForce = 0.2;
    }

    update() {
      this.velocity.add(this.acceleration);
      this.velocity.limit(this.maxSpeed);
      this.position.add(this.velocity);
      this.acceleration.mult(0);
    }

    applyForce(force) {
      this.acceleration.add(force);
    }

    seek(target) {
      let desired = p5.Vector.sub(target, this.position);
      desired.setMag(this.maxSpeed);
      let steer = p5.Vector.sub(desired, this.velocity);
      steer.limit(this.maxForce);
      this.applyForce(steer);
    }

    display() {
      this.p.fill(targetColor);
      this.p.noStroke();
      this.p.textSize(24);
      this.p.textAlign(this.p.CENTER, this.p.CENTER);
      this.p.text('Interactive', this.position.x, this.position.y);
    }
  }
}, 'p5-canvas');

function startBoidAnimation(color) {
  if (!isAnimating) {
    const rect = interactiveWord.getBoundingClientRect();
    boid.position.x = rect.left + rect.width / 2;
    boid.position.y = rect.top + rect.height / 2;
    interactiveWord.style.color = color;
    document.querySelector('[data-id="i"]').style.color = color;
  }
  isAnimating = true;
  targetColor = color;
}

function stopBoidAnimation() {
  isAnimating = false;
  interactiveWord.style.opacity = '1';
}
```