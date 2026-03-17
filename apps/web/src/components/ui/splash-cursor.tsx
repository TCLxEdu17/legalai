'use client';

import { useEffect, useRef } from 'react';

interface SplashCursorProps {
  SIM_RESOLUTION?: number;
  DYE_RESOLUTION?: number;
  DENSITY_DISSIPATION?: number;
  VELOCITY_DISSIPATION?: number;
  PRESSURE?: number;
  PRESSURE_ITERATIONS?: number;
  CURL?: number;
  SPLAT_RADIUS?: number;
  SPLAT_FORCE?: number;
  COLOR_UPDATE_SPEED?: number;
  BACK_COLOR?: { r: number; g: number; b: number };
  TRANSPARENT?: boolean;
}

export function SplashCursor({
  SIM_RESOLUTION = 128,
  DYE_RESOLUTION = 1440,
  DENSITY_DISSIPATION = 3.5,
  VELOCITY_DISSIPATION = 2,
  PRESSURE = 0.1,
  PRESSURE_ITERATIONS = 20,
  CURL = 3,
  SPLAT_RADIUS = 0.2,
  SPLAT_FORCE = 6000,
  COLOR_UPDATE_SPEED = 10,
  BACK_COLOR = { r: 0, g: 0, b: 0 },
  TRANSPARENT = false,
}: SplashCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;

    // ─── WebGL helpers ────────────────────────────────────────────────
    function getWebGLContext(canvas: HTMLCanvasElement) {
      const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
      let gl = canvas.getContext('webgl2', params) as WebGL2RenderingContext | null;
      const isWebGL2 = !!gl;
      if (!isWebGL2) gl = (canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params)) as WebGL2RenderingContext | null;
      if (!gl) return null;
      let halfFloat: any, supportLinearFiltering: boolean;
      if (isWebGL2) {
        (gl as WebGL2RenderingContext).getExtension('EXT_color_buffer_float');
        supportLinearFiltering = !!(gl as WebGL2RenderingContext).getExtension('OES_texture_float_linear');
      } else {
        halfFloat = gl.getExtension('OES_texture_half_float');
        supportLinearFiltering = !!gl.getExtension('OES_texture_half_float_linear');
      }
      gl.clearColor(0, 0, 0, 1);
      const halfFloatTexType = isWebGL2 ? (gl as WebGL2RenderingContext).HALF_FLOAT : halfFloat?.HALF_FLOAT_OES;
      let formatRGBA: any, formatRG: any, formatR: any;
      if (isWebGL2) {
        formatRGBA = getSupportedFormat(gl, (gl as any).RGBA16F, gl.RGBA, halfFloatTexType);
        formatRG   = getSupportedFormat(gl, (gl as WebGL2RenderingContext).RG16F, (gl as WebGL2RenderingContext).RG, halfFloatTexType);
        formatR    = getSupportedFormat(gl, (gl as WebGL2RenderingContext).R16F, (gl as WebGL2RenderingContext).RED, halfFloatTexType);
      } else {
        formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        formatRG   = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        formatR    = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      }
      return { gl, ext: { formatRGBA, formatRG, formatR, halfFloatTexType, supportLinearFiltering } };
    }

    function getSupportedFormat(gl: WebGLRenderingContext, internalFormat: number, format: number, type: number) {
      if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
        switch (internalFormat) {
          case (gl as any).R16F: return getSupportedFormat(gl, (gl as any).RG16F, (gl as any).RG, type);
          case (gl as any).RG16F: return getSupportedFormat(gl, (gl as any).RGBA16F ?? gl.RGBA, gl.RGBA, type);
          default: return null;
        }
      }
      return { internalFormat, format };
    }

    function supportRenderTextureFormat(gl: WebGLRenderingContext, internalFormat: number, format: number, type: number) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      return status === gl.FRAMEBUFFER_COMPLETE;
    }

    if (!canvas) return;
    const ctx = getWebGLContext(canvas);
    if (!ctx) return;
    const { gl, ext } = ctx;

    // ─── Shaders ─────────────────────────────────────────────────────
    const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform vec2 texelSize;
      void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `);

    const copyShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;
      void main () { gl_FragColor = texture2D(uTexture, vUv); }
    `);

    const clearShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;
      void main () { gl_FragColor = value * texture2D(uTexture, vUv); }
    `);

    const displayShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      void main () {
        vec3 C = texture2D(uTexture, vUv).rgb;
        float a = max(C.r, max(C.g, C.b));
        gl_FragColor = vec4(C, a);
      }
    `);

    const splatShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
      }
    `);

    const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform vec2 dyeTexelSize;
      uniform float dt;
      uniform float dissipation;
      vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;
        vec2 iuv = floor(st);
        vec2 fuv = fract(st);
        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
      }
      void main () {
        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
        vec4 result = bilerp(uSource, coord, dyeTexelSize);
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
      }
    `);

    const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `);

    const curlShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
      }
    `);

    const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;
      void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;
        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;
        vec2 vel = texture2D(uVelocity, vUv).xy;
        gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
      }
    `);

    const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
    `);

    const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `);

    function compileShader(type: number, source: string) {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    }

    function createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
      const program = gl.createProgram()!;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      return program;
    }

    function getUniforms(program: WebGLProgram) {
      const uniforms: Record<string, WebGLUniformLocation> = {};
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < count; i++) {
        const info = gl.getActiveUniform(program, i)!;
        uniforms[info.name] = gl.getUniformLocation(program, info.name)!;
      }
      return uniforms;
    }

    // ─── Programs ──────────────────────────────────────────────────────
    const copyProgram        = createProgram(baseVertexShader, copyShader);
    const clearProgram       = createProgram(baseVertexShader, clearShader);
    const splatProgram       = createProgram(baseVertexShader, splatShader);
    const advectionProgram   = createProgram(baseVertexShader, advectionShader);
    const divergenceProgram  = createProgram(baseVertexShader, divergenceShader);
    const curlProgram        = createProgram(baseVertexShader, curlShader);
    const vorticityProgram   = createProgram(baseVertexShader, vorticityShader);
    const pressureProgram    = createProgram(baseVertexShader, pressureShader);
    const gradSubtractProgram = createProgram(baseVertexShader, gradientSubtractShader);
    const displayProgram     = createProgram(baseVertexShader, displayShader);

    const copyUniforms        = getUniforms(copyProgram);
    const clearUniforms       = getUniforms(clearProgram);
    const splatUniforms       = getUniforms(splatProgram);
    const advectionUniforms   = getUniforms(advectionProgram);
    const divergenceUniforms  = getUniforms(divergenceProgram);
    const curlUniforms        = getUniforms(curlProgram);
    const vorticityUniforms   = getUniforms(vorticityProgram);
    const pressureUniforms    = getUniforms(pressureProgram);
    const gradSubtractUniforms = getUniforms(gradSubtractProgram);
    const displayUniforms     = getUniforms(displayProgram);

    // ─── Geometry ─────────────────────────────────────────────────────
    const blit = (() => {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
      const iBuf = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuf);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);
      return (target: any, clear = false) => {
        if (target == null) {
          gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        } else {
          gl.viewport(0, 0, target.width, target.height);
          gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        }
        if (clear) { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
      };
    })();

    // ─── FBO helpers ──────────────────────────────────────────────────
    function createFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
      gl.activeTexture(gl.TEXTURE0);
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const texelSizeX = 1 / w;
      const texelSizeY = 1 / h;
      return { texture, fbo, width: w, height: h, texelSizeX, texelSizeY, attach(id: number) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; } };
    }

    function createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
      let fbo1 = createFBO(w, h, internalFormat, format, type, param);
      let fbo2 = createFBO(w, h, internalFormat, format, type, param);
      return {
        width: w, height: h, texelSizeX: fbo1.texelSizeX, texelSizeY: fbo1.texelSizeY,
        get read() { return fbo1; },
        get write() { return fbo2; },
        swap() { [fbo1, fbo2] = [fbo2, fbo1]; },
      };
    }

    function resizeCanvas() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; return true; }
      return false;
    }

    function getResolution(res: number) {
      let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
      if (aspectRatio < 1) aspectRatio = 1 / aspectRatio;
      const max = Math.round(res * aspectRatio);
      const min = Math.round(res);
      return gl.drawingBufferWidth > gl.drawingBufferHeight ? { width: max, height: min } : { width: min, height: max };
    }

    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    resizeCanvas();
    let simRes  = getResolution(SIM_RESOLUTION);
    let dyeRes  = getResolution(DYE_RESOLUTION);

    let velocity  = createDoubleFBO(simRes.width, simRes.height, ext.formatRG.internalFormat,   ext.formatRG.format,   ext.halfFloatTexType, filtering);
    let dye       = createDoubleFBO(dyeRes.width,  dyeRes.height,  ext.formatRGBA.internalFormat, ext.formatRGBA.format, ext.halfFloatTexType, filtering);
    let pressure  = createDoubleFBO(simRes.width, simRes.height, ext.formatR.internalFormat,    ext.formatR.format,    ext.halfFloatTexType, gl.NEAREST);
    let divergence = createFBO(simRes.width, simRes.height, ext.formatR.internalFormat, ext.formatR.format, ext.halfFloatTexType, gl.NEAREST);
    let curl       = createFBO(simRes.width, simRes.height, ext.formatR.internalFormat, ext.formatR.format, ext.halfFloatTexType, gl.NEAREST);

    // ─── Pointer ──────────────────────────────────────────────────────
    const pointers: any[] = [];
    function createPointer() { return { id: -1, texcoordX: 0, texcoordY: 0, prevTexcoordX: 0, prevTexcoordY: 0, deltaX: 0, deltaY: 0, down: false, moved: false, color: [0, 0, 0] }; }
    pointers.push(createPointer());

    function updatePointerDownData(pointer: any, id: number, posX: number, posY: number) {
      pointer.id = id;
      pointer.down = true;
      pointer.moved = false;
      pointer.texcoordX = posX / canvas.width;
      pointer.texcoordY = 1 - posY / canvas.height;
      pointer.prevTexcoordX = pointer.texcoordX;
      pointer.prevTexcoordY = pointer.texcoordY;
      pointer.deltaX = 0;
      pointer.deltaY = 0;
      pointer.color = generateColor();
    }

    function updatePointerMoveData(pointer: any, posX: number, posY: number, color?: number[]) {
      pointer.prevTexcoordX = pointer.texcoordX;
      pointer.prevTexcoordY = pointer.texcoordY;
      pointer.texcoordX = posX / canvas.width;
      pointer.texcoordY = 1 - posY / canvas.height;
      pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
      pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
      pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
      if (color) pointer.color = color;
    }

    function correctDeltaX(delta: number) { const ar = canvas.width / canvas.height; return delta * ar; }
    function correctDeltaY(delta: number) { return delta; }

    function generateColor() {
      const h = Math.random(); const s = 1; const v = 1;
      let r: number, g: number, b: number;
      const i = Math.floor(h * 6);
      const f = h * 6 - i; const p = v * (1 - s); const q = v * (1 - f * s); const t = v * (1 - (1 - f) * s);
      switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        default: r = v; g = p; b = q; break;
      }
      return [r, g, b];
    }

    // ─── Splat ────────────────────────────────────────────────────────
    function splat(x: number, y: number, dx: number, dy: number, color: number[]) {
      gl.useProgram(splatProgram);
      gl.uniform1i(splatUniforms.uTarget, velocity.read.attach(0));
      gl.uniform1f(splatUniforms.aspectRatio, canvas.width / canvas.height);
      gl.uniform2f(splatUniforms.point, x, y);
      gl.uniform3f(splatUniforms.color, dx, dy, 0);
      gl.uniform1f(splatUniforms.radius, correctRadius(SPLAT_RADIUS / 100));
      blit(velocity.write);
      velocity.swap();

      gl.uniform1i(splatUniforms.uTarget, dye.read.attach(0));
      gl.uniform3f(splatUniforms.color, color[0] * 0.3, color[1] * 0.3, color[2] * 0.3);
      blit(dye.write);
      dye.swap();
    }

    function correctRadius(radius: number) {
      const ar = canvas.width / canvas.height;
      return ar > 1 ? radius / ar : radius;
    }

    function multipleSplats(count: number) {
      for (let i = 0; i < count; i++) {
        const color = generateColor().map(c => c * 10) as number[];
        splat(Math.random(), Math.random(), 1000 * (Math.random() - 0.5), 1000 * (Math.random() - 0.5), color);
      }
    }

    // ─── Simulation step ──────────────────────────────────────────────
    let lastUpdateTime = Date.now();
    let colorUpdateTimer = 0;

    function step(dt: number) {
      gl.disable(gl.BLEND);

      // Curl
      gl.useProgram(curlProgram);
      gl.uniform2f(curlUniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(curlUniforms.uVelocity, velocity.read.attach(0));
      blit(curl);

      // Vorticity
      gl.useProgram(vorticityProgram);
      gl.uniform2f(vorticityUniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(vorticityUniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(vorticityUniforms.uCurl, curl.attach(1));
      gl.uniform1f(vorticityUniforms.curl, CURL);
      gl.uniform1f(vorticityUniforms.dt, dt);
      blit(velocity.write);
      velocity.swap();

      // Divergence
      gl.useProgram(divergenceProgram);
      gl.uniform2f(divergenceUniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(divergenceUniforms.uVelocity, velocity.read.attach(0));
      blit(divergence);

      // Clear pressure
      gl.useProgram(clearProgram);
      gl.uniform1i(clearUniforms.uTexture, pressure.read.attach(0));
      gl.uniform1f(clearUniforms.value, PRESSURE);
      blit(pressure.write);
      pressure.swap();

      // Pressure iterations
      gl.useProgram(pressureProgram);
      gl.uniform2f(pressureUniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(pressureUniforms.uDivergence, divergence.attach(0));
      for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressureUniforms.uPressure, pressure.read.attach(1));
        blit(pressure.write);
        pressure.swap();
      }

      // Gradient subtract
      gl.useProgram(gradSubtractProgram);
      gl.uniform2f(gradSubtractUniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gradSubtractUniforms.uPressure, pressure.read.attach(0));
      gl.uniform1i(gradSubtractUniforms.uVelocity, velocity.read.attach(1));
      blit(velocity.write);
      velocity.swap();

      // Advect velocity
      gl.useProgram(advectionProgram);
      gl.uniform2f(advectionUniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform2f(advectionUniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(advectionUniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(advectionUniforms.uSource, velocity.read.attach(0));
      gl.uniform1f(advectionUniforms.dt, dt);
      gl.uniform1f(advectionUniforms.dissipation, VELOCITY_DISSIPATION);
      blit(velocity.write);
      velocity.swap();

      // Advect dye
      gl.uniform2f(advectionUniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
      gl.uniform1i(advectionUniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(advectionUniforms.uSource, dye.read.attach(1));
      gl.uniform1f(advectionUniforms.dissipation, DENSITY_DISSIPATION);
      blit(dye.write);
      dye.swap();
    }

    function render(target: any) {
      if (TRANSPARENT) { gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.BLEND); }
      else gl.disable(gl.BLEND);

      if (!TRANSPARENT) {
        gl.useProgram(clearProgram);
        gl.uniform1i(clearUniforms.uTexture, dye.read.attach(0));
        gl.uniform1f(clearUniforms.value, 1);
        blit(target);
      }

      gl.useProgram(displayProgram);
      gl.uniform1i(displayUniforms.uTexture, dye.read.attach(0));
      blit(target);
    }

    // ─── Animation loop ───────────────────────────────────────────────
    let rafId: number;
    function update() {
      resizeCanvas();
      const now = Date.now();
      let dt = Math.min((now - lastUpdateTime) / 1000, 0.016667);
      lastUpdateTime = now;

      colorUpdateTimer += dt * COLOR_UPDATE_SPEED;
      if (colorUpdateTimer >= 1) {
        colorUpdateTimer = colorUpdateTimer % 1;
        pointers.forEach(p => { p.color = generateColor(); });
      }

      pointers.forEach(p => {
        if (p.moved) {
          p.moved = false;
          splat(p.texcoordX, p.texcoordY, p.deltaX * SPLAT_FORCE, p.deltaY * SPLAT_FORCE, p.color);
        }
      });

      step(dt);
      render(null);
      rafId = requestAnimationFrame(update);
    }

    // ─── Events ───────────────────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      const p = pointers[0];
      if (!p.down) { p.color = generateColor(); }
      updatePointerMoveData(p, e.clientX, e.clientY);
    };
    const onMouseDown = (e: MouseEvent) => { updatePointerDownData(pointers[0], -1, e.clientX, e.clientY); };
    const onMouseUp   = () => { pointers[0].down = false; };

    const onTouchStart = (e: TouchEvent) => {
      const touches = e.targetTouches;
      while (pointers.length - 1 < touches.length) pointers.push(createPointer());
      for (let i = 0; i < touches.length; i++) {
        const t = touches[i];
        updatePointerDownData(pointers[i + 1], t.identifier, t.clientX, t.clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touches = e.targetTouches;
      for (let i = 0; i < touches.length; i++) {
        const t = touches[i];
        const p = pointers[i + 1];
        if (!p) continue;
        updatePointerMoveData(p, t.clientX, t.clientY);
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      const touches = e.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        const p = pointers.find(p => p.id === touches[i].identifier);
        if (p) p.down = false;
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup',   onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd);

    multipleSplats(Math.floor(Math.random() * 20) + 5);
    update();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup',   onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
