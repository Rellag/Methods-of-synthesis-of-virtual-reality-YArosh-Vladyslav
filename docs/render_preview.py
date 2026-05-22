"""
Render a still preview of Sievert's surface using matplotlib.
Saves to ../assets/sievert-preview.png — useful for the README and as a
placeholder while you record the actual phone demo video.
"""
import os
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D  # noqa: F401

C = 1.0
U_STEPS = 120
V_STEPS = 120

u = np.linspace(-np.pi/2 + 0.001, np.pi/2 - 0.001, U_STEPS)
v = np.linspace(0.05, np.pi - 0.05, V_STEPS)
U, V = np.meshgrid(u, v)

phi = -U / np.sqrt(C + 1) + np.arctan(np.sqrt(C + 1) * np.tan(U))
a = 2.0 / (C + 1 - C * np.sin(V)**2 * np.cos(U)**2)
r = (a * np.sqrt((C + 1) * (1 + C * np.sin(U)**2)) * np.sin(V)) / np.sqrt(C)

X = r * np.cos(phi)
Y = r * np.sin(phi)
Z = (np.log(np.tan(V / 2.0)) + a * (C + 1) * np.cos(V)) / np.sqrt(C)

# Auto-centre and rescale to fit a unit cube
for arr in (X, Y, Z):
    pass
mn = np.array([X.min(), Y.min(), Z.min()])
mx = np.array([X.max(), Y.max(), Z.max()])
c = (mn + mx) / 2
s = (mx - mn).max()
X = (X - c[0]) / s * 1.6
Y = (Y - c[1]) / s * 1.6
Z = (Z - c[2]) / s * 1.6

fig = plt.figure(figsize=(7, 7), facecolor='white')
ax = fig.add_subplot(111, projection='3d')

# Solid surface
ax.plot_surface(
    X, Y, Z,
    rstride=2, cstride=2,
    color='#ff9933',
    alpha=0.85,
    edgecolor='white',
    linewidth=0.15,
    antialiased=True,
)

ax.set_box_aspect((1, 1, 1))
ax.view_init(elev=25, azim=35)
ax.set_axis_off()

out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
os.makedirs(out_dir, exist_ok=True)
out = os.path.join(out_dir, 'sievert-preview.png')
plt.savefig(out, dpi=150, bbox_inches='tight', facecolor='white')
print(f"Wrote {out}")
