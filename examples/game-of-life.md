---
title: "WebGPU: Game of Life"
head: '
<style>
body {
    margin: 0;
    overflow: hidden;
}
p:has(> canvas) {
margin: 0;
}
canvas {
    height: 100vh;
    width: 100vw;
}
</style>
'
---

<canvas id="canvas"></canvas>

```javascript
// @run type="module"
const devicePixelRatio = window.devicePixelRatio;

const GameOptions = {
  width: Math.floor(window.innerWidth / 2),
  height: Math.floor(window.innerHeight / 2),
  workgroupSize: 8,
  timestep: 1,
  background: true
};

const computeShaderCode = `
    @binding(0) @group(0) var<storage, read> size: vec2u;
@binding(1) @group(0) var<storage, read> current: array<u32>;
@binding(2) @group(0) var<storage, read_write> next: array<u32>;

override blockSize = 8;

fn getIndex(x: u32, y: u32) -> u32 {
  let h = size.y;
  let w = size.x;

  return (y % h) * w + (x % w);
}

fn getCell(x: u32, y: u32) -> u32 {
  return current[getIndex(x, y)];
}

fn countNeighbors(x: u32, y: u32) -> u32 {
  return getCell(x - 1, y - 1) + getCell(x, y - 1) + getCell(x + 1, y - 1) + 
         getCell(x - 1, y) +                         getCell(x + 1, y) + 
         getCell(x - 1, y + 1) + getCell(x, y + 1) + getCell(x + 1, y + 1);
}

@compute @workgroup_size(blockSize, blockSize)
fn main(@builtin(global_invocation_id) grid: vec3u) {
  let x = grid.x;
  let y = grid.y;
  let n = countNeighbors(x, y);
  next[getIndex(x, y)] = select(u32(n == 3u), u32(n == 2u || n == 3u), getCell(x, y) == 1u); 
}`;

const vertexShaderCode = `
      struct Out {
  @builtin(position) pos: vec4f,
  @location(0) cell: f32,
  @location(1) uv: vec2f,
}

@binding(0) @group(0) var<uniform> size: vec2u;

@vertex
fn main(@builtin(instance_index) i: u32, @location(0) cell: u32, @location(1) pos: vec2u) -> Out {
  let w = size.x;
  let h = size.y;
  let x = (f32(i % w + pos.x) / f32(w) - 0.5) * 2.0;
  let y = (f32((i - (i % w)) / w + pos.y) / f32(h) - 0.5) * -2.0;
  
  let uv = vec2f(f32(i % w) / f32(w), f32(i / w) / f32(h));

  return Out(vec4f(x, y, 0., 1.), f32(cell), uv);
}`;

const fragmentShaderCode = `
@fragment
fn main(@location(0) cell: f32, @location(1) uv: vec2f) -> @location(0) vec4f {
  if (cell > 0.5) {
    // Use UV coordinates for coloring
    return vec4f(uv.x, uv.y, 1.0 - (uv.x + uv.y) * 0.5, 1.0);
  } else {
    return vec4f(0.0, 0.0, 0.0, 1.0);
  }
}
`;

class LazyWebGPU {
  constructor(props) {
    Object.assign(this, props);
  }

  static async init(selector, lowPower = false) {
    const canvas = document.querySelector(selector);
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: lowPower ? "low-power" : "high-performance"
    });

    if (!adapter) {
      throw Error("No WebGPU support");
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');

    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
      device: device,
      format: presentationFormat,
      alphaMode: 'premultiplied',
    });

    return new LazyWebGPU({
      canvas,
      adapter,
      context,
      device,
      presentationFormat,
      commandEncoder: device.createCommandEncoder(),
    });
  }

  bindGroupLayout(entries, offset = 0) {
    return this.device.createBindGroupLayout({
      entries: entries.map((entry, index) => ({
        binding: offset + index,
        visibility: entry.visibility,
        buffer: {
          type: entry.bufferType,
        },
      })),
    });
  }

  bindGroupLayoutOfVisibility(visibility, bufferTypes, offset = 0) {
    return this.bindGroupLayout(
      bufferTypes.map((bufferType) => ({
        visibility,
        bufferType,
      })),
      offset
    );
  }

  createBuffer(constructor, items, usage, mapped = true) {
    const sizeBuffer = this.device.createBuffer({
      size: items.length * constructor.BYTES_PER_ELEMENT,
      usage,
      mappedAtCreation: mapped,
    });
    if (mapped) {
      new constructor(sizeBuffer.getMappedRange()).set(items);
      sizeBuffer.unmap();
    }
    return sizeBuffer;
  }

  createGroup(bindGroupLayout, buffers, offset = 0) {
    return this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: buffers.map((buffer, i) => (
        {binding: offset + i, resource: {buffer}}
      )),
    });
  }

  createRenderGroupOfVisibility(visibility, entries, offset = 0) {
    const layout = this.bindGroupLayout(
      entries.map((e) => ({...e, visibility})),
      offset
    );
    const group = this.device.createBindGroup({
      layout,
      entries: entries.map(({resource}, i) => (
        {binding: offset + i, resource}
      )),
    });
    return {layout, group};
  }

  basicRenderPass() {
    const view = this.context.getCurrentTexture().createView();
    return {
      colorAttachments: [
        {
          view,
          loadOp: 'clear',
          clearValue: {r: 0.5, g: 0.5, b: 0.5, a: 1.0},
          storeOp: 'store',
        },
      ],
    };
  }

  computePipeline(bindGroupLayoutCompute, computeShader, constants) {
    return this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayoutCompute],
      }),
      compute: {
        module: computeShader,
        constants,
      },
    });
  }

  computePass(computePipeline, bindGroups, workgroup) {
    const passEncoderCompute = this.commandEncoder.beginComputePass();
    passEncoderCompute.setPipeline(computePipeline);
    bindGroups.forEach((group, i) => {
      passEncoderCompute.setBindGroup(i, group);
    });
    passEncoderCompute.dispatchWorkgroups(
      workgroup.x,
      workgroup.y,
      workgroup.z
    );
    passEncoderCompute.end();
  }

  renderPass({renderPipeline, pass}, fn) {
    const passEncoderRender = this.commandEncoder.beginRenderPass(
      pass ?? this.basicRenderPass()
    );
    passEncoderRender.setPipeline(renderPipeline);
    fn(passEncoderRender);
    passEncoderRender.end();
  }

  resetCommandEncoder() {
    this.commandEncoder = this.device.createCommandEncoder();
  }

  basicQueueSubmit() {
    this.device.queue.submit([this.commandEncoder.finish()]);
  }

  shader(code) {
    return this.device.createShaderModule({code});
  }

  renderPipeline(bindGroupLayouts, vertexState, fragmentState, topology = 'triangle-strip') {
    return this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts,
      }),
      primitive: {
        topology,
      },
      vertex: vertexState,
      fragment: fragmentState,
    });
  }

  createVertexBuffers(props) {
    let shaderLocation = 0;
    const layouts = [];

    for (let i = 0; i < props.length; i++) {
      const {stepMode, attributes} = props[i];
      layouts.push(
        this.createVertexBuffer(stepMode, attributes, shaderLocation)
      );
      shaderLocation += attributes.length;
    }

    return layouts;
  }

  createVertexBuffer(stepMode, attributes, shaderLocationStart = 0) {
    const finalAttrs = [];
    let offset = 0;
    attributes.forEach(({type, stride}, i) => {
      finalAttrs.push({
        shaderLocation: shaderLocationStart + i,
        offset,
        format: this.convertToGPUVertexFormat(type, stride),
      });
      offset += stride * type.BYTES_PER_ELEMENT;
    });

    return {
      arrayStride: offset,
      stepMode,
      attributes: finalAttrs
    };
  }

  convertToGPUVertexFormat(type, multiplier) {
    const formats = {
      1: {Uint8Array: 'uint8x2', Uint16Array: 'uint16x2', Uint32Array: 'uint32', Float32Array: 'float32'},
      2: {Uint8Array: 'uint8x2', Uint16Array: 'uint16x2', Uint32Array: 'uint32x2', Float32Array: 'float32x2'},
      3: {Uint8Array: 'uint8x4', Uint16Array: 'uint16x4', Uint32Array: 'uint32x3', Float32Array: 'float32x3'},
      4: {Uint8Array: 'uint8x4', Uint16Array: 'uint16x4', Uint32Array: 'uint32x4', Float32Array: 'float32x4'}
    };
    return formats[multiplier][type.name];
  }
}

const webGPU = await LazyWebGPU.init('canvas', true);

const groupLayoutCompute = webGPU.bindGroupLayoutOfVisibility(
  GPUShaderStage.COMPUTE,
  ['read-only-storage', 'read-only-storage', 'storage']
);

const squareVerticesItems = [0, 0, 0, 1, 1, 0, 1, 1];
const squareBuffer = webGPU.createBuffer(Uint32Array, squareVerticesItems, GPUBufferUsage.VERTEX);

const vertexState = {
  module: webGPU.shader(vertexShaderCode),
  buffers: webGPU.createVertexBuffers([
    {
      stepMode: "instance",
      attributes: [{type: Uint32Array, stride: 1}]
    },
    {
      stepMode: "vertex",
      attributes: [{type: Uint32Array, stride: 2}]
    }
  ])
};

const fragmentState = {
  module: webGPU.shader(fragmentShaderCode),
  targets: [
    {
      format: webGPU.presentationFormat,
    },
  ],
};

const computeShader = webGPU.shader(computeShaderCode);

const state = {
  loopTimes: 0, render: () => {
  }
};

function resetGameData() {
  const computePipeline = webGPU.computePipeline(groupLayoutCompute, computeShader, {
    blockSize: GameOptions.workgroupSize,
  });

  const sizeBuffer = webGPU.createBuffer(Uint32Array, [
    GameOptions.width,
    GameOptions.height,
  ], GPUBufferUsage.STORAGE | GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX);

  const length = GameOptions.width * GameOptions.height;

  const cells = new Array(length).fill(0).map(() => Math.random() < 0.25 ? 1 : 0);
  const buff0 = webGPU.createBuffer(Uint32Array, cells, GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX, true);
  const buff1 = webGPU.createBuffer(Uint32Array, cells, GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX);

  const bindGroup0 = webGPU.createGroup(groupLayoutCompute, [sizeBuffer, buff0, buff1]);
  const bindGroup1 = webGPU.createGroup(groupLayoutCompute, [sizeBuffer, buff1, buff0]);

  const {
    group: uniformBindGroup,
    layout: vertexRenderLayout
  } = webGPU.createRenderGroupOfVisibility(GPUShaderStage.VERTEX, [
    {bufferType: "uniform", resource: {buffer: sizeBuffer}},
  ]);

  const renderPipeline = webGPU.renderPipeline(
    [vertexRenderLayout], vertexState, fragmentState
  );

  const workgroup = {
    x: GameOptions.width / GameOptions.workgroupSize,
    y: GameOptions.height / GameOptions.workgroupSize
  };

  state.loopTimes = 0;
  state.render = () => {
    webGPU.resetCommandEncoder();

    webGPU.computePass(
      computePipeline,
      [state.loopTimes ? bindGroup1 : bindGroup0],
      workgroup
    );
    webGPU.renderPass({renderPipeline}, (encoder) => {
      encoder.setVertexBuffer(0, state.loopTimes ? buff1 : buff0);
      encoder.setVertexBuffer(1, squareBuffer);
      encoder.setBindGroup(0, uniformBindGroup);
      encoder.draw(4, length);
    });

    webGPU.basicQueueSubmit();
  };
}

function wrappedLoop(state, options, onLoop) {
  let wholeTime = 0;
  let animationFrameId = null;
  let isTabActive = true;
  let timestep = 6;

  function loop() {
    if (!isTabActive && !options.background) {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      return;
    }

    if (timestep) {
      if (timestep != options.timestep) {
        timestep = options.timestep;
      }

      wholeTime++;
      if (wholeTime >= timestep) {
        state.render();
        wholeTime -= timestep;
        if (onLoop) {
          onLoop();
        }
      }
    }
    animationFrameId = requestAnimationFrame(loop);
  }

  function activateTab() {
    isTabActive = true;
    timestep = options.timestep;
  }

  // Start the game loop
  animationFrameId = requestAnimationFrame(loop);

  // Event listeners for tab visibility
  document.addEventListener('visibilitychange', () => {
    isTabActive = !document.hidden;
    if (isTabActive && !animationFrameId) {
      activateTab();
      animationFrameId = requestAnimationFrame(loop);
    }
  });

  window.addEventListener('blur', () => {
    isTabActive = false;
  });

  window.addEventListener('focus', () => {
    activateTab();
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(loop);
    }
  });
}

function main() {
  resetGameData();
  wrappedLoop(state, GameOptions, () => {
    state.loopTimes = 1 - state.loopTimes;
  });
}

main();
```