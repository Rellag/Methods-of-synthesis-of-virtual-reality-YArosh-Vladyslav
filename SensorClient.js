function SensorClient() {
    this.socket = null;
    this.connected = false;

    this.rotMatrix = [
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        0,0,0,1
    ];

    this.zeroMatrixInv = null;
    this.onStatus = null;

    this.connect = function (url) {
        this.disconnect();
        this._notify('connecting', 'Connecting to ' + url + ' …');
        try {
            this.socket = new WebSocket(url);
        } catch (e) {
            this._notify('error', 'Bad URL: ' + e.message);
            return;
        }

        const self = this;
        this.socket.onopen = function () {
            self.connected = true;
            self._notify('open', 'Connected. Waiting for data…');
        };
        this.socket.onmessage = function (evt) {
            self._handleMessage(evt.data);
        };
        this.socket.onerror = function (e) {
            self._notify('error', 'WebSocket error (see console).');
            console.error('SensorClient WS error:', e);
        };
        this.socket.onclose = function (e) {
            const wasConnected = self.connected;
            self.connected = false;
            self._notify(wasConnected ? 'closed' : 'error',
                'Disconnected' + (e.reason ? ': ' + e.reason : '') +
                ' (code ' + e.code + ')');
        };
    };

    this.disconnect = function () {
        if (this.socket) {
            try { this.socket.close(); } catch (e) {}
            this.socket = null;
        }
        this.connected = false;
    };

    this.recenter = function () {
        const m = this.rotMatrix;
        this.zeroMatrixInv = [
            m[0], m[4], m[8],  0,
            m[1], m[5], m[9],  0,
            m[2], m[6], m[10], 0,
            0,    0,    0,     1
        ];
    };

    this.clearRecenter = function () {
        this.zeroMatrixInv = null;
    };

    this.getMatrix = function () {
        if (!this.zeroMatrixInv) return this.rotMatrix;
        return mulMat4(this.zeroMatrixInv, this.rotMatrix);
    };

    this._handleMessage = function (raw) {
        let msg;
        try { msg = JSON.parse(raw); }
        catch (e) {
            console.warn('SensorClient: non-JSON frame', raw);
            return;
        }
        const v = msg.values;
        if (!v || v.length < 3) return;

        const qx = v[0];
        const qy = v[1];
        const qz = v[2];
        let   qw = (v.length >= 4) ? v[3] : null;

        if (qw === null || isNaN(qw)) {
            const sumSq = qx*qx + qy*qy + qz*qz;
            qw = (sumSq < 1.0) ? Math.sqrt(1.0 - sumSq) : 0.0;
        }

        this.rotMatrix = quatToMat4(qx, qy, qz, qw);
        if (!this._gotFirstSample) {
            this._gotFirstSample = true;
            this._notify('streaming', 'Streaming sensor data ✓');
        }
    };

    this._notify = function (status, message) {
        if (this.onStatus) this.onStatus({ status, message });
    };
}


function quatToMat4(qx, qy, qz, qw) {
    const sq_x = 2 * qx * qx;
    const sq_y = 2 * qy * qy;
    const sq_z = 2 * qz * qz;
    const xy = 2 * qx * qy;
    const zw = 2 * qz * qw;
    const xz = 2 * qx * qz;
    const yw = 2 * qy * qw;
    const yz = 2 * qy * qz;
    const xw = 2 * qx * qw;

    return [
        1 - sq_y - sq_z,
        xy + zw,
        xz - yw,
        0,
        xy - zw,
        1 - sq_x - sq_z,
        yz + xw,
        0,
        xz + yw,
        yz - xw,
        1 - sq_x - sq_y,
        0,
        0, 0, 0, 1
    ];
}


function mulMat4(a, b) {
    const r = new Array(16);
    for (let c = 0; c < 4; c++) {
        for (let row = 0; row < 4; row++) {
            r[c*4 + row] =
                a[0*4 + row] * b[c*4 + 0] +
                a[1*4 + row] * b[c*4 + 1] +
                a[2*4 + row] * b[c*4 + 2] +
                a[3*4 + row] * b[c*4 + 3];
        }
    }
    return r;
}
