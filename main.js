'use strict';

let gl;
let surface;
let webcamQuad;
let shProgram;
let shTexProgram;

let spaceball;
let stereoCam;

let sensor = null;
let usePhone = false;

let videoEl;
let videoTex;
let videoReady = false;


function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    this.Use  = function () { gl.useProgram(this.prog); };
}

const MODEL_Z = -10.0;
const WEBCAM_HALF_W = 2.5 * (4 / 3);
const WEBCAM_HALF_H = 2.5;


function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (videoReady) {
        gl.bindTexture(gl.TEXTURE_2D, videoTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, videoEl
        );

        shTexProgram.Use();

        gl.uniformMatrix4fv(
            shTexProgram.iProjectionMatrix, false,
            stereoCam.calcSymmetricFrustum()
        );
        const mvQuad = m4.translation(0, 0, -stereoCam.convergence);
        gl.uniformMatrix4fv(shTexProgram.iModelViewMatrix, false, mvQuad);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, videoTex);
        gl.uniform1i(shTexProgram.iSampler, 0);

        gl.colorMask(true, true, true, true);
        webcamQuad.Draw(shTexProgram.iAttribVertex, shTexProgram.iAttribUV);

        gl.clear(gl.DEPTH_BUFFER_BIT);
    }

    let orientation;
    if (usePhone && sensor && sensor.connected) {
        orientation = sensor.getMatrix();
    } else {
        orientation = spaceball.getViewMatrix();
    }

    const rotateToPointZero    = m4.axisRotation([0.707, 0.707, 0], 0.7);
    const translateToPointZero = m4.translation(0, 0, MODEL_Z);

    shProgram.Use();
    surface.BindVertexAttrib(shProgram.iAttribVertex);

    gl.uniformMatrix4fv(
        shProgram.iProjectionMatrix, false, stereoCam.calcLeftFrustum()
    );

    const translateLeftEye = m4.translation(stereoCam.eyeSeparation / 2, 0, 0);
    const mvLeft = m4.multiply(translateToPointZero,
                    m4.multiply(translateLeftEye,
                     m4.multiply(rotateToPointZero, orientation)));
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, mvLeft);

    gl.colorMask(true, false, false, true);
    gl.uniform4fv(shProgram.iColor, [0.45, 0.45, 0.45, 1.0]);
    surface.DrawFilled();
    gl.uniform4fv(shProgram.iColor, [1.0, 1.0, 1.0, 1.0]);
    surface.DrawWireframe();

    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(
        shProgram.iProjectionMatrix, false, stereoCam.calcRightFrustum()
    );

    const translateRightEye = m4.translation(-stereoCam.eyeSeparation / 2, 0, 0);
    const mvRight = m4.multiply(translateToPointZero,
                     m4.multiply(translateRightEye,
                      m4.multiply(rotateToPointZero, orientation)));
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, mvRight);

    gl.colorMask(false, true, true, true);
    gl.uniform4fv(shProgram.iColor, [0.45, 0.45, 0.45, 1.0]);
    surface.DrawFilled();
    gl.uniform4fv(shProgram.iColor, [1.0, 1.0, 1.0, 1.0]);
    surface.DrawWireframe();

    gl.colorMask(true, true, true, true);
}


function animate() {
    draw();
    requestAnimationFrame(animate);
}


function createProgram(gl, vShader, fShader) {
    const vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS))
        throw new Error("Vertex shader: " + gl.getShaderInfoLog(vsh));

    const fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS))
        throw new Error("Fragment shader: " + gl.getShaderInfoLog(fsh));

    const prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        throw new Error("Link error: " + gl.getProgramInfoLog(prog));
    return prog;
}


function initGL() {
    const prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shProgram = new ShaderProgram('Solid', prog);
    shProgram.iAttribVertex     = gl.getAttribLocation (prog, "vertex");
    shProgram.iModelViewMatrix  = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iColor            = gl.getUniformLocation(prog, "color");

    const texProg = createProgram(gl, texVertexShaderSource, texFragmentShaderSource);
    shTexProgram = new ShaderProgram('Tex', texProg);
    shTexProgram.iAttribVertex     = gl.getAttribLocation (texProg, "vertex");
    shTexProgram.iAttribUV         = gl.getAttribLocation (texProg, "texcoord");
    shTexProgram.iModelViewMatrix  = gl.getUniformLocation(texProg, "ModelViewMatrix");
    shTexProgram.iProjectionMatrix = gl.getUniformLocation(texProg, "ProjectionMatrix");
    shTexProgram.iSampler          = gl.getUniformLocation(texProg, "u_tex");

    const data = {};
    CreateSurfaceData(data);
    surface = new Model('Sievert');
    surface.BufferData(data.verticesF32, data.indicesU16, data.linesU16);

    webcamQuad = new Quad('Webcam');
    webcamQuad.BufferData(WEBCAM_HALF_W, WEBCAM_HALF_H);

    stereoCam = new StereoCamera(
        14.0,
        0.70,
        1.0,
        0.40,
        8.0,
        40.0
    );

    videoTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, videoTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.enable(gl.DEPTH_TEST);
}


function bindSlider(sliderId, valueId, fmt, callback) {
    const sl  = document.getElementById(sliderId);
    const val = document.getElementById(valueId);
    val.textContent = fmt(parseFloat(sl.value));
    sl.addEventListener('input', () => {
        const v = parseFloat(sl.value);
        val.textContent = fmt(v);
        callback(v);
    });
}


function setupGUI() {
    const f2 = v => v.toFixed(2);
    bindSlider('sl-eye',  'val-eye',  f2, v => stereoCam.eyeSeparation        = v);
    bindSlider('sl-fov',  'val-fov',  f2, v => stereoCam.fov                  = v);
    bindSlider('sl-near', 'val-near', f2, v => stereoCam.nearClippingDistance = v);
    bindSlider('sl-conv', 'val-conv', f2, v => stereoCam.convergence          = v);

    const txUrl       = document.getElementById('tx-url');
    const btnConnect  = document.getElementById('btn-connect');
    const btnDisc     = document.getElementById('btn-disconnect');
    const btnReCenter = document.getElementById('btn-recenter');
    const cbPhone     = document.getElementById('cb-usephone');
    const statusEl    = document.getElementById('sensor-status');

    function setStatus(cls, text) {
        statusEl.className = cls;
        statusEl.textContent = text;
    }

    sensor.onStatus = ({status, message}) => {
        if (status === 'open' || status === 'streaming') {
            setStatus('st-on', message);
            btnConnect.disabled  = true;
            btnDisc.disabled     = false;
            btnReCenter.disabled = false;
        } else if (status === 'connecting') {
            setStatus('st-off', message);
        } else if (status === 'error') {
            setStatus('st-err', message);
            btnConnect.disabled  = false;
            btnDisc.disabled     = true;
            btnReCenter.disabled = true;
        } else {
            setStatus('st-off', message);
            btnConnect.disabled  = false;
            btnDisc.disabled     = true;
            btnReCenter.disabled = true;
        }
    };

    btnConnect.addEventListener('click', () => {
        const url = txUrl.value.trim();
        if (!url) { setStatus('st-err', 'Enter the URL first.'); return; }
        sensor.connect(url);
    });
    btnDisc.addEventListener('click', () => {
        sensor.disconnect();
        setStatus('st-off', 'Disconnected by user.');
        btnConnect.disabled  = false;
        btnDisc.disabled     = true;
        btnReCenter.disabled = true;
    });
    btnReCenter.addEventListener('click', () => sensor.recenter());

    cbPhone.addEventListener('change', e => {
        usePhone = e.target.checked;
    });

    document.getElementById('btn-cam').addEventListener('click', startWebcam);
}


async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        videoEl.srcObject = stream;
        await videoEl.play();
        videoReady = true;
        const btn = document.getElementById('btn-cam');
        btn.textContent = 'Webcam: ON';
        btn.disabled = true;
    } catch (err) {
        alert("Cannot access webcam: " + err.message +
              "\nNote: getUserMedia requires HTTPS or http://localhost.");
    }
}


function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) throw "Browser does not support WebGL";
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize WebGL: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
    sensor    = new SensorClient();
    videoEl   = document.getElementById('webcam');

    setupGUI();
    animate();
}
