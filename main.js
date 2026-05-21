'use strict';

let gl;
let surface;
let sphere;
let webcamQuad;
let shProgram;
let shTexProgram;

let spaceball;
let stereoCam;

let sensor = null;
let audio = null;
let usePhone = false;
let orbitRadius = 4.0;
let sourcePos = [orbitRadius, 0, 0];

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


function computeSourcePosition() {
    let rotMat;
    if (usePhone && sensor && sensor.connected) {
        rotMat = sensor.getMatrix();
    } else {
        rotMat = spaceball.getViewMatrix();
    }

    const v = [orbitRadius, 0, 0, 1];
    const x = rotMat[0]*v[0] + rotMat[4]*v[1] + rotMat[8] *v[2] + rotMat[12]*v[3];
    const y = rotMat[1]*v[0] + rotMat[5]*v[1] + rotMat[9] *v[2] + rotMat[13]*v[3];
    const z = rotMat[2]*v[0] + rotMat[6]*v[1] + rotMat[10]*v[2] + rotMat[14]*v[3];
    return [x, y, z];
}


function drawSurface(eyeShift, frustum, redChannel, modelMat) {
    shProgram.Use();
    surface.BindVertexAttrib(shProgram.iAttribVertex);

    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, frustum);

    const translateEye = m4.translation(eyeShift, 0, 0);
    const translateToZ = m4.translation(0, 0, MODEL_Z);
    const mv = m4.multiply(translateToZ, m4.multiply(translateEye, modelMat));
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, mv);

    if (redChannel) gl.colorMask(true, false, false, true);
    else            gl.colorMask(false, true, true, true);

    gl.uniform4fv(shProgram.iColor, [0.45, 0.45, 0.45, 1.0]);
    surface.DrawFilled();
    gl.uniform4fv(shProgram.iColor, [1.0, 1.0, 1.0, 1.0]);
    surface.DrawWireframe();
}


function drawSphere(eyeShift, frustum, redChannel, modelMat) {
    shProgram.Use();
    sphere.BindVertexAttrib(shProgram.iAttribVertex);

    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, frustum);

    const translateEye = m4.translation(eyeShift, 0, 0);
    const translateToZ = m4.translation(0, 0, MODEL_Z);
    const mv = m4.multiply(translateToZ, m4.multiply(translateEye, modelMat));
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, mv);

    if (redChannel) gl.colorMask(true, false, false, true);
    else            gl.colorMask(false, true, true, true);

    gl.uniform4fv(shProgram.iColor, [0.9, 0.6, 0.2, 1.0]);
    sphere.DrawFilled();
    gl.uniform4fv(shProgram.iColor, [1.0, 1.0, 1.0, 1.0]);
    sphere.DrawWireframe();
}


function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    sourcePos = computeSourcePosition();
    if (audio) audio.setPosition(sourcePos[0], sourcePos[1], sourcePos[2]);

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

    const surfaceModelMat = m4.axisRotation([0.707, 0.707, 0], 0.7);
    const sphereModelMat  = m4.translation(sourcePos[0], sourcePos[1], sourcePos[2]);

    drawSurface(stereoCam.eyeSeparation / 2, stereoCam.calcLeftFrustum(), true, surfaceModelMat);
    drawSphere (stereoCam.eyeSeparation / 2, stereoCam.calcLeftFrustum(), true, sphereModelMat);

    gl.clear(gl.DEPTH_BUFFER_BIT);

    drawSurface(-stereoCam.eyeSeparation / 2, stereoCam.calcRightFrustum(), false, surfaceModelMat);
    drawSphere (-stereoCam.eyeSeparation / 2, stereoCam.calcRightFrustum(), false, sphereModelMat);

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

    const sData = {};
    CreateSurfaceData(sData);
    surface = new Model('Sievert');
    surface.BufferData(sData.verticesF32, sData.indicesU16, sData.linesU16);

    const ballData = {};
    CreateSphereData(ballData, 0.4, 16, 24);
    sphere = new Model('SoundSource');
    sphere.BufferData(ballData.verticesF32, ballData.indicesU16, ballData.linesU16);

    webcamQuad = new Quad('Webcam');
    webcamQuad.BufferData(WEBCAM_HALF_W, WEBCAM_HALF_H);

    stereoCam = new StereoCamera(14.0, 0.70, 1.0, 0.40, 8.0, 40.0);

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
    const f0 = v => v.toFixed(0);
    const f1 = v => v.toFixed(1);

    bindSlider('sl-eye',  'val-eye',  f2, v => stereoCam.eyeSeparation = v);
    bindSlider('sl-conv', 'val-conv', f2, v => stereoCam.convergence   = v);
    bindSlider('sl-rad',  'val-rad',  f1, v => orbitRadius             = v);
    bindSlider('sl-vol',  'val-vol',  f2, v => { if (audio) audio.setVolume(v); });
    bindSlider('sl-freq', 'val-freq', f0, v => { if (audio) audio.setFilterFrequency(v); });
    bindSlider('sl-q',    'val-q',    f1, v => { if (audio) audio.setFilterQ(v); });

    const txUrl = document.getElementById('tx-url');
    const btnConnect = document.getElementById('btn-connect');
    const btnDisc = document.getElementById('btn-disconnect');
    const cbPhone = document.getElementById('cb-usephone');
    const sStatus = document.getElementById('sensor-status');

    function setSStatus(cls, text) { sStatus.className = cls; sStatus.textContent = text; }

    sensor.onStatus = ({status, message}) => {
        if (status === 'open' || status === 'streaming') {
            setSStatus('st-on', message);
            btnConnect.disabled = true;
            btnDisc.disabled = false;
        } else if (status === 'error') {
            setSStatus('st-err', message);
            btnConnect.disabled = false;
            btnDisc.disabled = true;
        } else {
            setSStatus('st-off', message);
            btnConnect.disabled = false;
            btnDisc.disabled = true;
        }
    };

    btnConnect.addEventListener('click', () => {
        const url = txUrl.value.trim();
        if (!url) { setSStatus('st-err', 'Enter URL'); return; }
        sensor.connect(url);
    });
    btnDisc.addEventListener('click', () => {
        sensor.disconnect();
        setSStatus('st-off', 'Disconnected.');
    });
    cbPhone.addEventListener('change', e => { usePhone = e.target.checked; });

    const flAudio = document.getElementById('fl-audio');
    const audioEl = document.getElementById('audio-el');
    const btnPlay = document.getElementById('btn-play');
    const btnPause = document.getElementById('btn-pause');
    const cbFilter = document.getElementById('cb-filter');
    const aStatus = document.getElementById('audio-status');

    function setAStatus(cls, text) { aStatus.className = cls; aStatus.textContent = text; }

    flAudio.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        audioEl.src = url;
        audioEl.load();

        if (!audio) {
            audio = new SpatialAudio();
            audio.onStatus = ({status, message}) => setAStatus('st-on', message);
            audio.init(audioEl);
            audio.setFilterEnabled(cbFilter.checked);
        }

        btnPlay.disabled = false;
        btnPause.disabled = false;
        setAStatus('st-on', 'Loaded: ' + file.name);
    });

    btnPlay.addEventListener('click', () => {
        if (audio) audio.play();
    });
    btnPause.addEventListener('click', () => {
        if (audio) audio.pause();
    });
    cbFilter.addEventListener('change', e => {
        if (audio) audio.setFilterEnabled(e.target.checked);
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
