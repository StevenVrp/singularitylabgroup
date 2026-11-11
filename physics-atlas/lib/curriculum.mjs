export const chapters = [
 ['Foundations','vector','Vectors and measurement','Vectors and coordinates, projections, scalar and vector products, derivatives and integrals, dimensions, significant figures and uncertainty propagation.'],
 ['Kinematics','motion','Motion in space','Displacement, velocity, acceleration, projectile and relative motion, circular motion, and motion graphs.'],
 ['Newtonian dynamics','force','Forces and motion','Newton’s laws, free-body diagrams, friction, pulleys, centripetal forces, non-inertial frames, drag and terminal velocity.'],
 ['Energy & momentum','energy','Work, energy and collisions','Variable-force work, kinetic and potential energy, force from potential, impulse, restitution, center of mass and efficiency.'],
 ['Rotation & gravity','orbit','Rotation, gravitation and equilibrium','Torque, moment of inertia, angular momentum, rolling, elasticity, static equilibrium, gravitational potential, orbits and escape.'],
 ['Fluid mechanics','drop','Pressure and flow','Hydrostatics, buoyancy, continuity, Bernoulli flow, viscosity, drag and aerodynamic forces.'],
 ['Oscillations & waves','wave','Periodic motion and sound','Oscillators, pendulums, damping, resonance, energy, superposition, normal modes, beats, Doppler shift and wave intensity.'],
 ['Thermal physics','thermo','Heat and thermodynamics','Thermal expansion, heat capacity, phase changes, kinetic theory, gas processes, heat engines, refrigerators, entropy and heat transfer.'],
 ['Electrostatics','field','Fields, potential and capacitance','Coulomb forces, superposition, potential, equipotentials, Gauss’s law, conductors, dielectrics and capacitor networks.'],
 ['Electric circuits','circuit','Current electricity','Resistivity, Ohm’s law, power, Kirchhoff’s laws, internal resistance, potential dividers and RC transients.'],
 ['Electromagnetism','magnet','Magnetism and induction','Lorentz force, Biot–Savart and Ampère laws, coils, flux, Faraday and Lenz laws, motional EMF, inductance, transformers and EM waves.'],
 ['Optics','prism','Geometrical and wave optics','Reflection, refraction, critical angle, dispersion, lenses and mirrors, instruments, interference, diffraction, polarization and resolution.'],
 ['Modern physics','atom','Relativity, quantum and nuclear physics','Lorentz transformations, photons, blackbody radiation, photoelectric effect, atomic levels, matter waves, nuclear reactions, radioactive decay, particles and astrophysics.']
];
export const connections=[
 ['orbit','potential','The gradient of gravitational potential gives the inward force that curves an orbit.'],
 ['orbit','projectile','A projectile near a surface samples nearly uniform gravity. A satellite samples gravity across changing distances and directions.'],
 ['shm','potential','The slope of a quadratic potential is proportional to displacement, giving a linear restoring force.'],
 ['shm','waves','A fixed point on a sinusoidal standing wave executes harmonic motion with an amplitude set by its position.'],
 ['projectile','vector','The horizontal and vertical components of a launch velocity supply the initial conditions independently.'],
 ['incline','vector','Projecting weight onto the slope isolates the component of force responsible for downhill acceleration.'],
 ['collision','incline','Newton’s second law integrated over the short impact time gives the impulse that changes each body’s momentum.'],
 ['flow','gas','Pressure describes force per area in both systems. Gas expansion allows density to vary, while ideal Venturi flow holds it constant.'],
 ['field','potential','Electric and gravitational forces can each be recovered from the spatial slope of a potential energy.'],
 ['field','capacitor','Adding the two plate fields produces the nearly uniform field in the middle of a wide parallel-plate capacitor.'],
 ['capacitor','rc','The capacitance sets how much charge must pass through the resistor for each volt of potential change.'],
 ['network','rc','A series resistor, capacitor and voltage source gives a circuit with one independent charging time constant.'],
 ['induction','network','A changing magnetic flux acts as a voltage source around a closed conducting loop.'],
 ['particle','induction','A magnetic field curves moving charges. A changing flux can also create an electric field that does work on them.'],
 ['optics','waves','Refraction preserves frequency at a stationary interface. The change in wave speed changes wavelength and direction.'],
 ['decay','rc','When a rate is proportional to the quantity remaining, both nuclei and discharging capacitors follow exponential decay.']
];
