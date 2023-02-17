"use strict";

let canv, gl;
let animState;
let maxx, maxy
let midx, midy;

let widthHandle, heightHandle;
let mousePosHandle;
let paletteShiftHandle, paletteShift;
let mousePos = {};

const mrandom =  Math.random;
const mfloor = Math.floor;
const mround = Math.round;
const mceil = Math.ceil;
const mabs = Math.abs;
const mmin = Math.min;
const mmax = Math.max;

const mPI = Math.PI;
const mPIS2 = Math.PI / 2;
const m2PI = Math.PI * 2;
const msin = Math.sin;
const mcos = Math.cos;
const matan2 = Math.atan2;

const mhypot = Math.hypot;
const msqrt = Math.sqrt;

//-----------------------------------------------------------------------------
// miscellaneous functions
//-----------------------------------------------------------------------------

  function alea (min, max) {
// random number [min..max[ . If no max is provided, [0..min[

    if (typeof max == 'undefined') return min * mrandom();
    return min + (max - min) * mrandom();
  }

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  function intAlea (min, max) {
// random integer number [min..max[ . If no max is provided, [0..min[

    if (typeof max == 'undefined') {
      max = min; min = 0;
    }
    return mfloor(min + (max - min) * mrandom());
  } // intAlea

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function distance (p0, p1) {

/* distance between points */

    return mhypot (p0[0] - p1[0], p0[1] - p1[1]);

  } // function distance

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

//************** Shader sources **************
let vertexSource = `
attribute vec2 position;


void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

let fragmentSource = `

 precision mediump float;

 #define ITER_MAX 100
 #define FITER_MAX 100.

 uniform float width;
 uniform float height;
 uniform vec2 mousePos;
 uniform float paletteShift;

 vec2 iResolution;
 vec2 z;
 vec2 c0;

void main(){

  iResolution = vec2(width, height);

  z = (gl_FragCoord.xy - 0.5 * iResolution.xy  ) / min(width, height) * 2.0 ;

  c0 = (mousePos / iResolution);  // 0 to 1
  c0 = vec2(-0.5, 0.55) + vec2(0.2, 0.15) * c0;

  float k = FITER_MAX;

  for (int kk = 0; kk < ITER_MAX; ++kk) {
    if (length(z) > 2.) {
      k = float(kk);
      break;
    }
    z = vec2 (z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c0;
  };

  float s = mod(k / FITER_MAX + paletteShift, 1.0) * 6.0;

  gl_FragColor = vec4(clamp(vec3(max( 2.0 - s, -4.0 + s), 2.0 - abs( 2.0 -s),2.0 - abs(4.0 - s)),
                       0.0, 1.0),
                       1.0);
}
`;

//************** Utility functions **************

//Compile shader and combine with source
function compileShader(shaderSource, shaderType){
  let shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
  	throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
  }
  return shader;
}

//From https://codepen.io/jlfwong/pen/GqmroZ
//Utility to complain loudly if we fail to find the attribute/uniform
function getAttribLocation(program, name) {
  let attributeLocation = gl.getAttribLocation(program, name);
  if (attributeLocation === -1) {
  	throw 'Cannot find attribute ' + name + '.';
  }
  return attributeLocation;
}

function getUniformLocation(program, name) {
  let attributeLocation = gl.getUniformLocation(program, name);
  if (attributeLocation === null) {
  	throw 'Cannot find uniform ' + name + '.';
  }
  return attributeLocation;
}


//---------------------------------------------------------
/* trick to have 'animate' to appear as a function in my text editor and
create a local scope for it */

function animate() {}
animate = (function() {

let startTime;

return function(tStamp){

  let dt;

  if (animState == 0 && startOver()) {
    ++animState;
    startTime = tStamp;
  }

  switch (animState) {

    case 1 :
      dt = tStamp - startTime;
    	//Send uniforms to program
      gl.uniform2fv(mousePosHandle, [mousePos.x , maxy - mousePos.y]);
      gl.uniform1f(paletteShiftHandle, (dt/10000) - mfloor(dt / 10000));
      //Draw a triangle strip connecting vertices 0-4
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      break;
  } // switch

  requestAnimationFrame(animate);

} // animate
})();

//--------------------------------------------------------------------
function relativeCoord (element, clientX, clientY) {

  let style = element.currentStyle || window.getComputedStyle(element, null),
      paddingLeftWidth = parseInt(style.paddingLeft, 10),
      paddingTopWidth = parseInt(style.paddingTop, 10),
      borderLeftWidth = parseInt(style.borderLeftWidth, 10),
      borderTopWidth = parseInt(style.borderTopWidth, 10),
      rect = element.getBoundingClientRect(),
      x = clientX - paddingLeftWidth - borderLeftWidth - rect.left,
      y = clientY - paddingTopWidth - borderTopWidth - rect.top;

  return [x, y];
}
//- - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function mouseMove (event) {

  let clx, cly;
//  if (event.buttons & 1) { // if left button
    [clx, cly] = relativeCoord(canv, event.clientX, event.clientY);
    mousePos.x = clx;
    mousePos.y = cly;
//  }
} // mouseMove

//---------------------------------------------------------

function startOver() {

  maxx = window.innerWidth;
  maxy = window.innerHeight;
  canv.width = maxx;
  canv.height = maxy;
  if (mmin (maxx, maxy) < 100) return false; // not worth working

  canv.style.left = (window.innerWidth - maxx) / 2 + 'px';
  canv.style.top = (window.innerHeight - maxy) / 2 + 'px';

  midx = window.innerWidth / 2; // reference for x mouse position
  midy = window.innerHeight / 2; // reference for x mouse position

  if (mousePos.x === undefined) {
    mousePos.x = midx;
    mousePos.y = midy;
  }

	gl.viewport(0, 0, maxx, maxy);

  gl.uniform1f(widthHandle, maxx);
  gl.uniform1f(heightHandle, maxy);

  return true;
} // startOver

//---------------------------------------------------------
function initShadersStuff() {
  //************** Create shaders **************

  //Create vertex and fragment shaders
  let vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
  let fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

  //Create shader programs
  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.useProgram(program);

  //Set up rectangle covering entire canvas
  let vertexData = new Float32Array([
    -1.0,  1.0, 	// top left
    -1.0, -1.0, 	// bottom left
     1.0,  1.0, 	// top right
     1.0, -1.0, 	// bottom right
  ]);

  // Create vertex buffer
  let vertexDataBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
  // Layout of our data in the vertex buffer
  let positionHandle = getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionHandle);
  gl.vertexAttribPointer(positionHandle,
    2, 				// position is a vec2 (2 values per component)
    gl.FLOAT, // each component is a float
    false, 		// don't normalize values
    2 * 4, 		// two 4 byte float components per vertex (32 bit float is 4 bytes)
    0 				// how many bytes inside the buffer to start from
    );

  //Get uniform handles

  widthHandle = getUniformLocation(program, 'width');
  heightHandle = getUniformLocation(program, 'height');
  mousePosHandle = getUniformLocation(program, 'mousePos');
  paletteShiftHandle = getUniformLocation(program, 'paletteShift');

}
//---------------------------------------------------------
// beginning of execution

  {
    canv = document.createElement('canvas');
    canv.style.position="absolute";
    document.body.appendChild(canv);
    gl = canv.getContext('webgl');
    canv.style.cursor = 'move';
  } // canvas creation

  window.addEventListener('mousemove', mouseMove);

  initShadersStuff();

  animState = 0; // to startOver
  requestAnimationFrame(animate);