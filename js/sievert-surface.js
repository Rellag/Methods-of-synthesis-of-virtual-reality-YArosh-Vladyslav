/**
 * sievert-surface — A-Frame component that builds Sievert's surface,
 * a classic surface of constant positive Gaussian curvature.
 *
 * Parametric equations (Kuen / Sievert family, C = 1 case):
 *   phi = -u / sqrt(C+1) + atan(sqrt(C+1) * tan(u))
 *   a   = 2 / (C + 1 - C * sin(v)^2 * cos(u)^2)
 *   r   = a * sqrt((C+1)(1 + C * sin(u)^2)) * sin(v) / sqrt(C)
 *   x   = r * cos(phi)
 *   y   = r * sin(phi)
 *   z   = (ln(tan(v/2)) + a*(C+1)*cos(v)) / sqrt(C)
 *
 * The mesh is auto-centred and rescaled to `targetSize` so it always
 * fits neatly on top of the AR marker.
 */
AFRAME.registerComponent('sievert-surface', {
    schema: {
        uSteps:     { type: 'int',    default: 80 },
        vSteps:     { type: 'int',    default: 80 },
        targetSize: { type: 'number', default: 1.0 },
        color:      { type: 'color',  default: '#ff9933' },
        wireColor:  { type: 'color',  default: '#ffffff' },
        spinSpeed:  { type: 'number', default: 0.0005 }
    },

    init: function () {
        const data = this.data;

        const positions = [];
        const indices   = [];

        // Parameter ranges — clipped slightly to avoid singularities
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

        // Build vertex grid
        for (let i = 0; i <= data.uSteps; i++) {
            const u = uMin + (uMax - uMin) * i / data.uSteps;
            for (let j = 0; j <= data.vSteps; j++) {
                const v = vMin + (vMax - vMin) * j / data.vSteps;
                const p = sievertPoint(u, v);
                positions.push(p[0], p[1], p[2]);
            }
        }

        // Stitch quads (two triangles each)
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

        // Centre + uniform rescale
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

        // Build geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        // Two materials layered: solid surface + wireframe overlay
        const filledMat = new THREE.MeshPhongMaterial({
            color: new THREE.Color(data.color),
            side:  THREE.DoubleSide,
            flatShading: false,
            transparent: true,
            opacity: 0.85,
            shininess: 60
        });
        const filledMesh = new THREE.Mesh(geometry, filledMat);

        const wireMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(data.wireColor),
            wireframe: true,
            transparent: true,
            opacity: 0.45
        });
        const wireMesh = new THREE.Mesh(geometry, wireMat);

        const group = new THREE.Group();
        group.add(filledMesh);
        group.add(wireMesh);

        // Lay it flat onto the marker (default Sievert axis is z-up)
        group.rotation.x = -Math.PI / 2;

        // Local lights so the surface looks the same regardless of scene lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.55);
        const dir = new THREE.DirectionalLight(0xffffff, 0.85);
        dir.position.set(1, 2, 1);
        group.add(ambient);
        group.add(dir);

        this.el.setObject3D('mesh', group);

        this._spin = 0;
    },

    tick: function (time, delta) {
        const mesh = this.el.getObject3D('mesh');
        if (mesh) {
            this._spin += (delta || 16) * this.data.spinSpeed;
            mesh.rotation.z = this._spin;
        }
    },

    remove: function () {
        this.el.removeObject3D('mesh');
    }
});
