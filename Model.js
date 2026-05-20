function deg2rad(angle) { return angle * Math.PI / 180; }


function Model(name) {
    this.name = name;
    this.iVertexBuffer    = gl.createBuffer();
    this.iIndexBuffer     = gl.createBuffer();
    this.iLineIndexBuffer = gl.createBuffer();
    this.countTri  = 0;
    this.countLine = 0;

    this.BufferData = function (verticesF32, trianglesU16, linesU16) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, verticesF32, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, trianglesU16, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iLineIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, linesU16, gl.STATIC_DRAW);

        this.countTri  = trianglesU16.length;
        this.countLine = linesU16.length;
    };

    this.BindVertexAttrib = function (attribLocation) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(attribLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attribLocation);
    };

    this.DrawFilled = function () {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.countTri, gl.UNSIGNED_SHORT, 0);
    };

    this.DrawWireframe = function () {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iLineIndexBuffer);
        gl.drawElements(gl.LINES, this.countLine, gl.UNSIGNED_SHORT, 0);
    };
}


function sievertPoint(u, v, C) {
    const phi    = -u / Math.sqrt(C + 1) +
                    Math.atan(Math.sqrt(C + 1) * Math.tan(u));
    const a      = 2 / (C + 1 - C * Math.sin(v) * Math.sin(v) * Math.cos(u) * Math.cos(u));
    const r      = (a * Math.sqrt((C + 1) * (1 + C * Math.sin(u) * Math.sin(u))) * Math.sin(v)) / Math.sqrt(C);

    const x = r * Math.cos(phi);
    const y = r * Math.sin(phi);
    const z = (Math.log(Math.tan(v / 2)) + a * (C + 1) * Math.cos(v)) / Math.sqrt(C);

    return [x, y, z];
}


function CreateSurfaceData(data) {
    const C = 1;
    const uSteps = 60;
    const vSteps = 60;
    const uMin = -Math.PI / 2 + 0.001;
    const uMax =  Math.PI / 2 - 0.001;
    const vMin =  0.05;
    const vMax =  Math.PI - 0.05;

    const verts = [];
    const tris  = [];
    const lines = [];

    for (let i = 0; i <= uSteps; i++) {
        const u = uMin + (uMax - uMin) * i / uSteps;
        for (let j = 0; j <= vSteps; j++) {
            const v = vMin + (vMax - vMin) * j / vSteps;
            const p = sievertPoint(u, v, C);
            verts.push(p[0], p[1], p[2]);
        }
    }

    const idx = (i, j) => i * (vSteps + 1) + j;

    for (let i = 0; i < uSteps; i++) {
        for (let j = 0; j < vSteps; j++) {
            const a = idx(i,   j);
            const b = idx(i+1, j);
            const c = idx(i+1, j+1);
            const d = idx(i,   j+1);
            tris.push(a, b, c);
            tris.push(a, c, d);
            lines.push(a, b);
            lines.push(a, d);
        }
    }
    for (let i = 0; i < uSteps; i++) lines.push(idx(i, vSteps), idx(i + 1, vSteps));
    for (let j = 0; j < vSteps; j++) lines.push(idx(uSteps, j), idx(uSteps, j + 1));

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let k = 0; k < verts.length; k += 3) {
        if (verts[k  ] < minX) minX = verts[k  ];
        if (verts[k+1] < minY) minY = verts[k+1];
        if (verts[k+2] < minZ) minZ = verts[k+2];
        if (verts[k  ] > maxX) maxX = verts[k  ];
        if (verts[k+1] > maxY) maxY = verts[k+1];
        if (verts[k+2] > maxZ) maxZ = verts[k+2];
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
    const scale = 5.0 / size;
    for (let k = 0; k < verts.length; k += 3) {
        verts[k  ] = (verts[k  ] - cx) * scale;
        verts[k+1] = (verts[k+1] - cy) * scale;
        verts[k+2] = (verts[k+2] - cz) * scale;
    }

    data.verticesF32 = new Float32Array(verts);
    data.indicesU16  = new Uint16Array(tris);
    data.linesU16    = new Uint16Array(lines);
}
