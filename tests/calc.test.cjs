// Run: node tests/calc.test.cjs
const assert = require('node:assert');
const { calc } = require('../tools/calc.js');
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

near(calc.wavelength(8.048), 1.5406, 1e-3, 'Cu Kα1 wavelength'); // 8.048 keV ↔ 1.5406 Å
near(calc.energy(calc.wavelength(12.4)), 12.4, 1e-12, 'round trip');
near(calc.twoTheta(3.1356, 1.5406), 28.44, 0.02, 'Si(111) 2θ with Cu Kα1'); // tabulated 28.44°
assert.ok(Number.isNaN(calc.twoTheta(0.5, 1.5406)), 'λ > 2d has no Bragg angle');
const q = calc.q(28.44, 1.5406);
near(calc.dFromQ(q), 3.1356, 2e-3, 'q → d recovers Si(111)');
near(calc.footprint(0.1, 0.5), 11.459, 1e-3, '0.1 mm beam at 0.5° covers 11.46 mm');
near(calc.transmission(1, 1), Math.exp(-1), 1e-15, 'one attenuation length');
near(calc.twoThetaFromQ(q, 1.5406), 28.44, 1e-9, 'q → 2θ round trip');
near(calc.dCubic(5.43102, 1, 1, 1), 3.1356, 1e-4, 'Si(111) from a');
near(calc.fillAngle(0.1, 11.459), 0.5, 1e-4, 'fill angle inverts footprint');
near(calc.kiessig(0.0314159), 200, 0.01, 'Δq = 0.0314 Å⁻¹ is a 200 Å film');
near(calc.kiessig(calc.dqFromTwoTheta(0.44, 1.5406)), 200.6, 0.5, 'Δ2θ = 0.44° at Cu Kα is ~20 nm');
near(calc.scherrer(28.44, 0.2, 1.5406), 409.8, 0.5, 'Scherrer, 0.2° FWHM at Si(111)');

console.log('calc: ok');
