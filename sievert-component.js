AFRAME.registerComponent('sievert-surface', {
    schema: {
        uSteps:   { type: 'int', default: 50 },
        vSteps:   { type: 'int', default: 50 },
        targetSize: { type: 'number', default: 1.0 },
    },

    init: function () {
        const data = this.data;

        const positions = [];
        const indices   = [];

        const uMin = -Math.PI / 2 + 0.001;
        const uMax =  Math.PI / 2 - 0.001;
        const vMin =  0.05;
        const vMax =  Math.PI - 0.05;
        const C = 1;

        function sievertPoint(u, v) {
            const phi = -u / Math.sqrt(C + 1) +
                         Math.atan(Math.sqrt(C + 1) * Math.tan(u));
            const a = 2 / (C + 1 - C * Math.sin(v) * Math.sin(v) * Math.cos(u) * Math.cos(u));
            const r = (a * Math.sqrt((C + 1) * (1 + C * Math.sin(u) * Math.sin(u))) * Math.sin(v)) / Math.sqrt(C);
            return [
                r * Math.cos(phi),
                r * Math.sin(phi),
                (Math.log(Math.tan(v / 2)) + a * (C + 1) * Math.cos(v)) / Math.sqrt(C)
            ];
        }

        for (let i = 0; i <= data.uSteps; i++) {
            const u = uMin + (uMax - uMin) * i / data.uSteps;
            for (let j = 0; j <= data.vSteps; j++) {
                const v = vMin + (vMax - vMin) * j / data.vSteps;
                const p = sievertPoint(u, v);
                positions.push(p[0], p[1], p[2]);
            }
        }

        const idx = (i, j) => i * (data.vSteps + 1) + j;
        for (let i = 0; i < data.uSteps; i++) {
            for (let j = 0; j < data.vSteps; j++) {
                const a = idx(i,     j);
                const b = idx(i + 1, j);
                const c = idx(i + 1, j + 1);
                const d = idx(i,     j + 1);
                indices.push(a, b, c, a, c, d);
            }
        }

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let k = 0; k < positions.length; k += 3) {
            if (positions[k]   < minX) minX = positions[k];
            if (positions[k+1] < minY) minY = positions[k+1];
            if (positions[k+2] < minZ) minZ = positions[k+2];
            if (positions[k]   > maxX) maxX = positions[k];
            if (positions[k+1] > maxY) maxY = positions[k+1];
            if (positions[k+2] > maxZ) maxZ = positions[k+2];
        }
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const cz = (minZ + maxZ) / 2;
        const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
        const scale = data.targetSize / size;
        for (let k = 0; k < positions.length; k += 3) {
            positions[k]   = (positions[k]   - cx) * scale;
            positions[k+1] = (positions[k+1] - cy) * scale;
            positions[k+2] = (positions[k+2] - cz) * scale;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const filledMat = new THREE.MeshPhongMaterial({
            color: 0xff9933,
            side:  THREE.DoubleSide,
            flatShading: false,
            transparent: true,
            opacity: 0.85,
        });
        const filledMesh = new THREE.Mesh(geometry, filledMat);

        const wireMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: true,
            opacity: 0.6,
        });
        const wireMesh = new THREE.Mesh(geometry, wireMat);

        const group = new THREE.Group();
        group.add(filledMesh);
        group.add(wireMesh);

        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        const dir = new THREE.DirectionalLight(0xffffff, 0.7);
        dir.position.set(1, 2, 1);
        group.add(ambient);
        group.add(dir);

        this.el.setObject3D('mesh', group);

        this._spin = 0;
    },

    tick: function (time, delta) {
        const mesh = this.el.getObject3D('mesh');
        if (mesh) {
            this._spin += (delta || 16) * 0.0005;
            mesh.rotation.z = this._spin;
        }
    },

    remove: function () {
        this.el.removeObject3D('mesh');
    }
});
