// Beamline arithmetic. Energies in keV, lengths in Å unless named otherwise, angles in degrees.
const HC = 12.398419843320026; // h·c in keV·Å (CODATA 2018)
const rad = (deg) => (deg * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

const calc = {
  wavelength: (keV) => HC / keV, // λ = hc / E
  energy: (angstrom) => HC / angstrom,
  // Bragg: λ = 2 d sin θ. Returns 2θ, or NaN when λ > 2d (no reflection possible).
  twoTheta: (d, lambda) => 2 * deg(Math.asin(lambda / (2 * d))),
  // q = 4π sin θ / λ, with θ half the scattering angle 2θ
  q: (twoTheta, lambda) => (4 * Math.PI * Math.sin(rad(twoTheta / 2))) / lambda,
  dFromQ: (q) => (2 * Math.PI) / q,
  twoThetaFromQ: (q, lambda) => 2 * deg(Math.asin((q * lambda) / (4 * Math.PI))),
  // Cubic lattice: d = a / √(h² + k² + l²)
  dCubic: (a, h, k, l) => a / Math.hypot(h, k, l),
  // Beam footprint on a flat sample at grazing incidence α: L = h / sin α (same unit as h)
  footprint: (height, alpha) => height / Math.sin(rad(alpha)),
  // Largest incidence angle at which the footprint still overfills a sample of length s: sin α = h / s
  fillAngle: (height, sampleLength) => deg(Math.asin(height / sampleLength)),
  // Transmission through thickness t of a material with attenuation length ℓ (same units)
  transmission: (t, attLength) => Math.exp(-t / attLength),
  // Film thickness from the Kiessig fringe period Δq: t = 2π / Δq
  kiessig: (dq) => (2 * Math.PI) / dq,
  // Small-angle fringe period in q from a period in 2θ: Δq ≈ 2π Δ(2θ) / λ
  dqFromTwoTheta: (dTwoTheta, lambda) => (2 * Math.PI * rad(dTwoTheta)) / lambda,
  // Scherrer: τ = K λ / (β cos θ), β the peak FWHM in 2θ (degrees). Same length unit as λ.
  scherrer: (twoTheta, fwhm, lambda, K = 0.9) => (K * lambda) / (rad(fwhm) * Math.cos(rad(twoTheta / 2))),
};

if (typeof module === 'object') module.exports = { calc, HC };
