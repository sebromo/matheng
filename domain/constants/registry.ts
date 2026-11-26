export type PhysicalConstant = {
  id: string;
  symbol: string;
  name: string;
  value: number;
  unit: string;
  source: string;
  sourceVersion: string;
};

export const physicalConstants: readonly PhysicalConstant[] = [
  {
    id: "speed-of-light",
    symbol: "c",
    name: "speed of light in vacuum",
    value: 299792458,
    unit: "m/s",
    source: "SI defining constant",
    sourceVersion: "2019 SI",
  },
  {
    id: "standard-gravity",
    symbol: "g_n",
    name: "standard acceleration of gravity",
    value: 9.80665,
    unit: "m/s^2",
    source: "ISO 80000-3",
    sourceVersion: "2006",
  },
  {
    id: "planck-constant",
    symbol: "h",
    name: "Planck constant",
    value: 6.62607015e-34,
    unit: "J*s",
    source: "CODATA recommended values",
    sourceVersion: "2022",
  },
  {
    id: "boltzmann-constant",
    symbol: "k_B",
    name: "Boltzmann constant",
    value: 1.380649e-23,
    unit: "J/K",
    source: "CODATA recommended values",
    sourceVersion: "2022",
  },
  {
    id: "newtonian-constant-of-gravitation",
    symbol: "G",
    name: "Newtonian constant of gravitation",
    value: 6.6743e-11,
    unit: "m^3/(kg*s^2)",
    source: "CODATA recommended values",
    sourceVersion: "2022",
  },
];

const constantsById = new Map(
  physicalConstants.map((constant) => [constant.id, constant]),
);

export function getPhysicalConstant(id: string): PhysicalConstant | undefined {
  return constantsById.get(id);
}
