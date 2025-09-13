W = {
  _state: null,
  _getState(gl){
    if (this._state) return this._state;

    // Create program once
    const vs = gl.createShader(35633);
    gl.shaderSource(vs, `#version 300 es\nprecision lowp float;in vec4 c,p,u;uniform mat4 M,m;out vec4 C,P,U;void main(){gl_Position=M*p;P=m*p;C=c;U=u;}`);
    gl.compileShader(vs);

    const fs = gl.createShader(35632);
    gl.shaderSource(fs, `#version 300 es\nprecision lowp float;uniform vec3 c,d,a;in vec4 C,P,U;out vec4 o;uniform sampler2D s;void main(){float n=max(dot(d,-normalize(cross(dFdx(P.xyz),dFdy(P.xyz)))),0.);o=mix(texture(s,U.xy),vec4(c*C.rgb*n+a*C.rgb,1.),C.a);}`);
    gl.compileShader(fs);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Lookups
    const attrib_p = gl.getAttribLocation(program, 'p');
    const attrib_u = gl.getAttribLocation(program, 'u');
    const attrib_c = gl.getAttribLocation(program, 'c');
    const uni_M = gl.getUniformLocation(program, 'M');
    const uni_m = gl.getUniformLocation(program, 'm');
    const uni_c = gl.getUniformLocation(program, 'c');
    const uni_d = gl.getUniformLocation(program, 'd');
    const uni_a = gl.getUniformLocation(program, 'a');
    const uni_s = gl.getUniformLocation(program, 's');

    // Reusable buffers
    const posBuffer = gl.createBuffer();
    const uvBuffer = gl.createBuffer();

    // Geometry cache
    const modelCache = new Map();

    // Texture cache (keyed by image element)
    const textureCache = new WeakMap();

    // Global state
    gl.enable(2929); // DEPTH_TEST
    gl.blendFunc(770, 771);
    gl.activeTexture(33984);
    gl.pixelStorei(37441, 1);
    gl.pixelStorei(37440, 1);

    this._state = { gl, program, attrib_p, attrib_u, attrib_c, uni_M, uni_m, uni_c, uni_d, uni_a, uni_s, posBuffer, uvBuffer, modelCache, textureCache };
    return this._state;
  },

  _getModelVerts(name){
    // Returns [vertices, uvs]
    if (name === 'plane') return cube(); // front face is first 6 verts; we will draw 6 only
    return cube();
  },

  reset: () => {
    this._state = null;
  },

  render: (scene, gl, aspectratio) => {
    const s = W._getState(gl);
    gl.useProgram(s.program);

    // Clear and lights
    gl.clearColor(...scene.b.c);
    gl.clear(16640);
    gl.uniform3f(s.uni_c, ...scene.d.c);
    gl.uniform3f(s.uni_d, ...scene.d.p);
    gl.uniform3f(s.uni_a, ...scene.a.c);

    for (const i of scene.o) {
      // Geometry (cache by model)
      let geo = s.modelCache.get(i.m);
      if (!geo) {
        geo = W._getModelVerts(i.m);
        s.modelCache.set(i.m, geo);
      }
      const [vertices, uv] = geo;

      // Position buffer
      gl.bindBuffer(34962, s.posBuffer);
      gl.bufferData(34962, new Float32Array(vertices), 35044);
      gl.vertexAttribPointer(s.attrib_p, 3, 5126, 0, 0, 0);
      gl.enableVertexAttribArray(s.attrib_p);

      // UV buffer
      gl.bindBuffer(34962, s.uvBuffer);
      gl.bufferData(34962, new Float32Array(uv), 35044);
      gl.vertexAttribPointer(s.attrib_u, 2, 5126, 0, 0, 0);
      gl.enableVertexAttribArray(s.attrib_u);

      // Model matrix
      const modelMatrix = new DOMMatrix().translate(...(i.p||[0,0,0])).rotate(...(i.r||[0,0,0])).scale(...(i.s||[1,1,1]));
      gl.uniformMatrix4fv(s.uni_m, 0, modelMatrix.toFloat32Array());

      // Color or texture
      if (i.c) {
        gl.vertexAttrib4f(s.attrib_c, i.c[0], i.c[1], i.c[2], 1);
      } else {
        gl.vertexAttrib4f(s.attrib_c, 0, 0, 0, 0);
        if (i.t) {
          let tex = s.textureCache.get(i.t);
          if (!tex) {
            tex = gl.createTexture();
            gl.bindTexture(3553, tex);
            gl.texParameteri(3553, 10241, 9987); // MIN_FILTER = LINEAR_MIPMAP_LINEAR
            gl.texParameteri(3553, 10240, 9729); // MAG_FILTER = LINEAR
            gl.texImage2D(3553, 0, 6408, 6408, 5121, i.t);
            gl.generateMipmap(3553);
            s.textureCache.set(i.t, tex);
          }
          gl.bindTexture(3553, tex);
          gl.uniform1i(s.uni_s, 0);
        }
      }

      // MVP matrix
      const M = new DOMMatrix([
        1.8 / aspectratio, 0, 0, 0,
        0, 1.8, 0, 0,
        0, 0, -1.001, -1,
        0, 0, -.2, 0,
      ]).rotate(...scene.c.r).translate(...scene.c.p).multiply(modelMatrix).toFloat32Array();
      gl.uniformMatrix4fv(s.uni_M, 0, M);

      // Draw
      gl.enable(3042);
      gl.drawArrays(4, 0, i.m == 'plane' ? 6 : vertices.length / 3);
    }
  }
}

// Declare a cube (2x2x2)
// Returns [vertices, uvs)] 
//
//    v6----- v5
//   /|      /|
//  v1------v0|
//  | |   x | |
//  | |v7---|-|v4
//  |/      |/
//  v2------v3

cube = () => [

  [
    1, 1, 1,  -1, 1, 1,  -1,-1, 1, // front
    1, 1, 1,  -1,-1, 1,   1,-1, 1,
    1, 1,-1,   1, 1, 1,   1,-1, 1, // right
    1, 1,-1,   1,-1, 1,   1,-1,-1,
    1, 1,-1,  -1, 1,-1,  -1, 1, 1, // up
    1, 1,-1,  -1, 1, 1,   1, 1, 1,
   -1, 1, 1,  -1, 1,-1,  -1,-1,-1, // left
   -1, 1, 1,  -1,-1,-1,  -1,-1, 1,
   -1, 1,-1,   1, 1,-1,   1,-1,-1, // back
   -1, 1,-1,   1,-1,-1,  -1,-1,-1,
    1,-1, 1,  -1,-1, 1,  -1,-1,-1, // down
    1,-1, 1,  -1,-1,-1,   1,-1,-1
  ],
  
  [
    1, 1,   0, 1,   0, 0, // front
    1, 1,   0, 0,   1, 0,            
    1, 1,   0, 1,   0, 0, // right
    1, 1,   0, 0,   1, 0, 
    1, 1,   0, 1,   0, 0, // up
    1, 1,   0, 0,   1, 0,
    1, 1,   0, 1,   0, 0, // left
    1, 1,   0, 0,   1, 0,
    1, 1,   0, 1,   0, 0, // back
    1, 1,   0, 0,   1, 0,
    1, 1,   0, 1,   0, 0, // down
    1, 1,   0, 0,   1, 0
  ]
];
