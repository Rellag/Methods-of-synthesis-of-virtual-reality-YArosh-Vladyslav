function SpatialAudio() {
    this.ctx = null;
    this.audioEl = null;
    this.sourceNode = null;
    this.filterNode = null;
    this.pannerNode = null;
    this.gainNode = null;

    this.filterEnabled = true;
    this.filterFrequency = 1000;
    this.filterQ = 5;

    this.onStatus = null;

    this.init = function (audioEl) {
        this.audioEl = audioEl;

        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();

        this.sourceNode = this.ctx.createMediaElementSource(audioEl);

        this.filterNode = this.ctx.createBiquadFilter();
        this.filterNode.type = 'bandpass';
        this.filterNode.frequency.value = this.filterFrequency;
        this.filterNode.Q.value = this.filterQ;

        this.pannerNode = this.ctx.createPanner();
        this.pannerNode.panningModel = 'HRTF';
        this.pannerNode.distanceModel = 'inverse';
        this.pannerNode.refDistance = 1;
        this.pannerNode.maxDistance = 100;
        this.pannerNode.rolloffFactor = 1;
        this.pannerNode.coneInnerAngle = 360;
        this.pannerNode.coneOuterAngle = 0;
        this.pannerNode.coneOuterGain = 0;

        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = 1.0;

        this._rebuildGraph();

        const listener = this.ctx.listener;
        if (listener.positionX) {
            listener.positionX.value = 0;
            listener.positionY.value = 0;
            listener.positionZ.value = 0;
            listener.forwardX.value  = 0;
            listener.forwardY.value  = 0;
            listener.forwardZ.value  = -1;
            listener.upX.value = 0;
            listener.upY.value = 1;
            listener.upZ.value = 0;
        } else if (listener.setPosition) {
            listener.setPosition(0, 0, 0);
            listener.setOrientation(0, 0, -1, 0, 1, 0);
        }

        this._notify('ready', 'Audio graph ready.');
    };

    this._rebuildGraph = function () {
        try { this.sourceNode.disconnect(); } catch (e) {}
        try { this.filterNode.disconnect(); } catch (e) {}
        try { this.pannerNode.disconnect(); } catch (e) {}
        try { this.gainNode.disconnect(); } catch (e) {}

        if (this.filterEnabled) {
            this.sourceNode.connect(this.filterNode);
            this.filterNode.connect(this.pannerNode);
        } else {
            this.sourceNode.connect(this.pannerNode);
        }
        this.pannerNode.connect(this.gainNode);
        this.gainNode.connect(this.ctx.destination);
    };

    this.play = function () {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        if (this.audioEl) this.audioEl.play();
    };

    this.pause = function () {
        if (this.audioEl) this.audioEl.pause();
    };

    this.setPosition = function (x, y, z) {
        if (!this.pannerNode) return;
        if (this.pannerNode.positionX) {
            this.pannerNode.positionX.value = x;
            this.pannerNode.positionY.value = y;
            this.pannerNode.positionZ.value = z;
        } else if (this.pannerNode.setPosition) {
            this.pannerNode.setPosition(x, y, z);
        }
    };

    this.setFilterEnabled = function (enabled) {
        this.filterEnabled = enabled;
        if (this.ctx) this._rebuildGraph();
    };

    this.setFilterFrequency = function (hz) {
        this.filterFrequency = hz;
        if (this.filterNode) this.filterNode.frequency.value = hz;
    };

    this.setFilterQ = function (q) {
        this.filterQ = q;
        if (this.filterNode) this.filterNode.Q.value = q;
    };

    this.setVolume = function (v) {
        if (this.gainNode) this.gainNode.gain.value = v;
    };

    this._notify = function (status, message) {
        if (this.onStatus) this.onStatus({ status, message });
    };
}
