

function StereoCamera(
    convergence,         // distance to the zero-parallax (screen) plane
    eyeSeparation,       // distance between the eyes
    aspectRatio,         // canvas width / height
    fov,                 // vertical field of view, in radians
    nearClippingDistance,
    farClippingDistance
) {
    this.convergence          = convergence;
    this.eyeSeparation        = eyeSeparation;
    this.aspectRatio          = aspectRatio;
    this.fov                  = fov;
    this.nearClippingDistance = nearClippingDistance;
    this.farClippingDistance  = farClippingDistance;

   
    function frustum(left, right, bottom, top, near, far) {
        const A = (right + left) / (right - left);
        const B = (top + bottom) / (top - bottom);
        const C = -(far + near) / (far - near);
        const D = -2 * far * near / (far - near);
        const E = 2 * near / (right - left);
        const F = 2 * near / (top - bottom);

        return [
            E, 0, 0,  0,
            0, F, 0,  0,
            A, B, C, -1,
            0, 0, D,  0,
        ];
    }

   
    this.calcLeftFrustum = function () {
        const top    =  this.nearClippingDistance * Math.tan(this.fov / 2);
        const bottom = -top;

        const a = this.aspectRatio * Math.tan(this.fov / 2) * this.convergence;
        const b = a - this.eyeSeparation / 2;
        const c = a + this.eyeSeparation / 2;

        const left  = -b * this.nearClippingDistance / this.convergence;
        const right =  c * this.nearClippingDistance / this.convergence;

        return frustum(left, right, bottom, top,
                       this.nearClippingDistance, this.farClippingDistance);
    };

    
    this.calcRightFrustum = function () {
        const top    =  this.nearClippingDistance * Math.tan(this.fov / 2);
        const bottom = -top;

        const a = this.aspectRatio * Math.tan(this.fov / 2) * this.convergence;
        const b = a - this.eyeSeparation / 2;
        const c = a + this.eyeSeparation / 2;

        const left  = -c * this.nearClippingDistance / this.convergence;
        const right =  b * this.nearClippingDistance / this.convergence;

        return frustum(left, right, bottom, top,
                       this.nearClippingDistance, this.farClippingDistance);
    };

  
    this.calcSymmetricFrustum = function () {
        const top    =  this.nearClippingDistance * Math.tan(this.fov / 2);
        const bottom = -top;
        const right  =  this.aspectRatio * top;
        const left   = -right;
        return frustum(left, right, bottom, top,
                       this.nearClippingDistance, this.farClippingDistance);
    };
}
